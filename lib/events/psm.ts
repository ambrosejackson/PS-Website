import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import type { EventRow, RsvpRow } from "./types";

/**
 * Website ↔ PSM bridge for events (integration rule, PS-MANAGEMENT-CONTEXT §3,
 * D-091). The website holds NO PSM database key. It calls two purpose-built PSM
 * Edge Functions, each authenticated with the shared secret PSM_INGEST_TOKEN:
 *
 *   POST {PSM_FUNCTIONS_URL}/ingest-event-rsvp    → upsert crm_contacts + crm_signups
 *   GET  {PSM_FUNCTIONS_URL}/dispensary-directory → active retail_accounts (public-safe columns)
 *
 * Both functions live PSM-side (docs/psm-side/W4-event-rsvp-ingest.md).
 * Everything here fails soft: an RSVP never fails because PSM is unreachable —
 * the row keeps psm_sync_error and /api/cron/event-jobs retries it.
 */

type Admin = SupabaseClient<Database>;

const DEFAULT_FUNCTIONS_URL = "https://skdhqrjxvhegbufykhyp.supabase.co/functions/v1";
const MAX_ATTEMPTS = 10;

function config(): { base: string; token: string } | null {
  const token = process.env.PSM_INGEST_TOKEN?.trim();
  if (!token) return null;
  const base = (process.env.PSM_FUNCTIONS_URL?.trim() || DEFAULT_FUNCTIONS_URL).replace(/\/$/, "");
  return { base, token };
}

export function psmConfigured(): boolean {
  return config() !== null;
}

async function call(path: string, init: RequestInit & { timeoutMs?: number }): Promise<Response> {
  const cfg = config();
  if (!cfg) throw new Error("PSM_INGEST_TOKEN unset");
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), init.timeoutMs ?? 8000);
  try {
    return await fetch(`${cfg.base}/${path}`, {
      ...init,
      signal: ctrl.signal,
      headers: {
        "Content-Type": "application/json",
        "x-ps-ingest-token": cfg.token,
        ...(init.headers ?? {}),
      },
      cache: "no-store",
    });
  } finally {
    clearTimeout(timer);
  }
}

export interface IngestPayload {
  rsvp_id: string;
  event_slug: string;
  event_name: string;
  psm_qr_code_id: string | null;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  is_budtender: boolean;
  dispensary_psm_account_id: string | null;
  dispensary_name: string | null;
  dispensary_city: string | null;
  marketing_opt_in: boolean;
  marketing_opt_in_at: string | null;
  /** True only when the guest clicked an unsubscribe link: the one case PSM may set consent to false. */
  unsubscribed: boolean;
  rsvp_status: string;
}

export function ingestPayload(ev: EventRow, r: RsvpRow, opts: { unsubscribed?: boolean } = {}): IngestPayload {
  return {
    rsvp_id: r.id,
    event_slug: ev.slug,
    event_name: ev.tagline ? `${ev.name}: ${ev.tagline}` : ev.name,
    psm_qr_code_id: ev.psm_qr_code_id,
    first_name: r.first_name,
    last_name: r.last_name,
    email: r.email.toLowerCase(),
    phone: r.phone,
    is_budtender: r.is_budtender,
    dispensary_psm_account_id: r.dispensary_psm_account_id,
    dispensary_name: r.dispensary_name,
    dispensary_city: r.dispensary_city,
    marketing_opt_in: r.marketing_opt_in,
    marketing_opt_in_at: r.marketing_opt_in_at,
    unsubscribed: Boolean(opts.unsubscribed),
    rsvp_status: r.status,
  };
}

/** Push one RSVP to the PSM CRM and record the outcome on the row. Never throws. */
export async function syncRsvp(admin: Admin, ev: EventRow, r: RsvpRow, opts: { unsubscribed?: boolean } = {}): Promise<boolean> {
  if (!psmConfigured()) {
    await admin.from("event_rsvps").update({ psm_sync_error: "PSM_INGEST_TOKEN not configured" }).eq("id", r.id);
    return false;
  }
  try {
    const res = await call("ingest-event-rsvp", {
      method: "POST",
      body: JSON.stringify(ingestPayload(ev, r, opts)),
    });
    const body = (await res.json().catch(() => ({}))) as { ok?: boolean; contact_id?: string; error?: string };
    if (!res.ok || !body.ok || !body.contact_id) throw new Error(body.error ?? `HTTP ${res.status}`);
    await admin
      .from("event_rsvps")
      .update({
        psm_contact_id: body.contact_id,
        psm_synced_at: new Date().toISOString(),
        psm_sync_error: null,
        psm_sync_attempts: r.psm_sync_attempts + 1,
      })
      .eq("id", r.id);
    return true;
  } catch (e) {
    const msg = e instanceof Error ? (e.name === "AbortError" ? "timeout" : e.message) : "unknown error";
    await admin
      .from("event_rsvps")
      .update({ psm_sync_error: msg.slice(0, 300), psm_sync_attempts: r.psm_sync_attempts + 1 })
      .eq("id", r.id);
    return false;
  }
}

/** Retry unsynced RSVPs (cron). Waits 2 minutes after creation so the inline attempt has its turn. */
export async function retryUnsynced(admin: Admin, limit = 50): Promise<{ tried: number; ok: number }> {
  if (!psmConfigured()) return { tried: 0, ok: 0 };
  const cutoff = new Date(Date.now() - 2 * 60_000).toISOString();
  const { data: rows } = await admin
    .from("event_rsvps")
    .select("*, events(*)")
    .is("psm_synced_at", null)
    .lt("psm_sync_attempts", MAX_ATTEMPTS)
    .lt("updated_at", cutoff)
    .order("created_at")
    .limit(limit);
  let ok = 0;
  for (const row of rows ?? []) {
    const { events: ev, ...r } = row as RsvpRow & { events: EventRow };
    if (await syncRsvp(admin, ev, r)) ok++;
  }
  return { tried: rows?.length ?? 0, ok };
}

interface DirectoryAccount {
  id: string;
  name: string;
  city: string | null;
  zip: string | null;
  address_line1: string | null;
  license_number: string | null;
  chain_name: string | null;
}

const DIRECTORY_KEYS = new Set(["id", "name", "city", "zip", "address_line1", "license_number", "chain_name"]);

/**
 * Mirror PSM's dispensary directory into `dispensaries`. Fail-closed like the
 * store-locator receiver: unexpected keys → nothing written; an empty or tiny
 * response never deactivates the existing list.
 */
export async function refreshDispensaries(admin: Admin): Promise<{ ok: boolean; count: number; error?: string }> {
  if (!psmConfigured()) return { ok: false, count: 0, error: "PSM_INGEST_TOKEN unset" };
  try {
    const res = await call("dispensary-directory", { method: "GET", timeoutMs: 15000 });
    const body = (await res.json().catch(() => ({}))) as { accounts?: DirectoryAccount[]; error?: string };
    if (!res.ok || !Array.isArray(body.accounts)) throw new Error(body.error ?? `HTTP ${res.status}`);
    const accounts = body.accounts;
    for (const a of accounts) {
      for (const k of Object.keys(a)) if (!DIRECTORY_KEYS.has(k)) throw new Error(`unexpected key "${k}"`);
    }
    if (accounts.length < 50) throw new Error(`only ${accounts.length} accounts returned; refusing to replace the list`);
    const now = new Date().toISOString();
    const rows = accounts
      .filter((a) => a.id && a.name)
      .map((a) => ({
        psm_account_id: a.id,
        name: a.name.trim(),
        city: a.city?.trim() || null,
        zip: a.zip?.trim() || null,
        address: a.address_line1?.trim() || null,
        license_number: a.license_number?.trim() || null,
        chain_name: a.chain_name?.trim() || null,
        is_active: true,
        refreshed_at: now,
      }));
    const { error } = await admin.from("dispensaries").upsert(rows, { onConflict: "psm_account_id" });
    if (error) throw new Error(error.message);
    await admin.from("dispensaries").update({ is_active: false }).lt("refreshed_at", now);
    return { ok: true, count: rows.length };
  } catch (e) {
    return { ok: false, count: 0, error: e instanceof Error ? e.message : "unknown error" };
  }
}

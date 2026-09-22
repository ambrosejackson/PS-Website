# PSM-SIDE — do not run here

**Workstream W4 — Event RSVP ingest + dispensary directory** (The Kickback, PRD `claude/PRD-KICKBACK-RSVP.md` Rev 3, D-091)
Applied to PS Management (`skdhqrjxvhegbufykhyp`) only after Ambrose's explicit "proceed." Production-only DB: read-only checks first, each write in a transaction, rollback stated.

## 0. Read-only checks (done 2026-09-22)

- `crm_contacts`: 168 rows (118 consumer / qr_signup, 50 dispensary / manual), 0 duplicate-email groups, no `marketing_opt_in*` columns yet. Triggers: `trg_backfill_crm_contact_link` (sets up `crm_contact_accounts` when `account_id` is set), `trg_crm_contacts_updated_at`. Dependent view: `v_crm_duplicate_contacts` (unaffected by adding columns).
- `retail_accounts`: 274 active, 272 with city/address, 271 with a license number.
- `audience_type` allows `budtender`; `source` allows `qr_signup | manual | import` (unchanged; RSVPs use `qr_signup` + `first_source_qr_code_id`).

## 1. Migration `crm_contacts_marketing_opt_in` (apply_migration)

```sql
alter table public.crm_contacts
  add column if not exists marketing_opt_in boolean,
  add column if not exists marketing_opt_in_at timestamptz;
comment on column public.crm_contacts.marketing_opt_in is
  'Email marketing consent. null = unknown (pre-2026-09-22 rows), true = opted in, false = declined/unsubscribed. Never message a contact unless true.';
select pg_notify('pgrst', 'reload schema');
```
Blast radius: 168 existing rows; both columns null; nothing reads them yet.
Rollback: `alter table public.crm_contacts drop column marketing_opt_in, drop column marketing_opt_in_at;`
Then regenerate PS Management `types.ts`.

## 2. Event sign-up source row (execute_sql, in a transaction)

```sql
begin;
insert into public.crm_qr_codes (company_id, slug, name, description, brand, audience_type,
  target_type, target_url, use_direct_url, is_active, display_order, redirect_key)
values ('f730fddb-bcb0-464a-80ab-c2c6bf77ac1d', 'kickback-2026', 'The Kickback 2026',
  'RSVPs from privatestock.co/events/kickback (Sun Oct 25, 2026). Print this QR for the gate sign.',
  'private_stock', 'consumer', 'external_url', 'https://privatestock.co/events/kickback', true, true, 0, 'kb2026')
returning id;
commit;
```
Paste the returned `id` into /admin/events/kickback → "PSM sign-up source id". Rollback: `delete from public.crm_qr_codes where slug = 'kickback-2026';` (only after removing its crm_signups rows).

## 3. Function secret

Supabase dashboard → PS Management → Edge Functions → Secrets → `PS_INGEST_TOKEN` = a long random value.
Put the SAME value in Vercel (website project) as `PSM_INGEST_TOKEN`. PowerShell to generate one:
`-join ((1..48) | ForEach-Object { '{0:x}' -f (Get-Random -Maximum 16) })`

## 4. Edge Function `dispensary-directory` (verify_jwt = false)

Returns only `id, name, city, zip, address_line1, license_number, chain_name` for active accounts.

```ts
// PSM-SIDE — deploy to PS Management (skdhqrjxvhegbufykhyp), NOT the website project.
// dispensary-directory: public-safe list of active retail accounts for the website's
// RSVP autocomplete. Returns ONLY id, name, city, zip, address_line1, license_number,
// chain_name — never tier, stage, contacts, W-9s, scheduling or sales data.
// Auth: header x-ps-ingest-token must equal PS_INGEST_TOKEN. verify_jwt = false.
import { createClient } from "jsr:@supabase/supabase-js@2";

const COMPANY_ID = "f730fddb-bcb0-464a-80ab-c2c6bf77ac1d";

function safeEqual(a: string, b: string): boolean {
  if (!a || a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

Deno.serve(async (req) => {
  if (!safeEqual(req.headers.get("x-ps-ingest-token") ?? "", Deno.env.get("PS_INGEST_TOKEN") ?? "")) {
    return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401 });
  }
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });
  const { data, error } = await db
    .from("retail_accounts")
    .select("id, name, city, zip, address_line1, license_number, retail_account_chains(name)")
    .eq("company_id", COMPANY_ID)
    .eq("is_active", true)
    .order("name");
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  const accounts = (data ?? []).map((a) => ({
    id: a.id,
    name: a.name,
    city: a.city,
    zip: a.zip,
    address_line1: a.address_line1,
    license_number: a.license_number,
    // deno-lint-ignore no-explicit-any
    chain_name: (a as any).retail_account_chains?.name ?? null,
  }));
  return new Response(JSON.stringify({ accounts }), {
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
});
```

## 5. Edge Function `ingest-event-rsvp` (verify_jwt = false)

Upserts `crm_contacts` by email (oldest match wins), fills blanks only, upgrades `consumer → budtender`, sets `account_id` for a real same-company account (the trigger links `crm_contact_accounts`), consent only moves up except on an explicit unsubscribe, appends one note, logs one `crm_signups` row per contact per source. Idempotent across retries.

```ts
// PSM-SIDE — deploy to PS Management (skdhqrjxvhegbufykhyp), NOT the website project.
// ingest-event-rsvp: privatestock.co event RSVP → crm_contacts (+ crm_signups).
// Auth: header x-ps-ingest-token must equal the PS_INGEST_TOKEN function secret.
// Deployed with verify_jwt = false (the shared secret is the auth; the website holds no PSM key).
import { createClient } from "jsr:@supabase/supabase-js@2";

const COMPANY_ID = "f730fddb-bcb0-464a-80ab-c2c6bf77ac1d";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function safeEqual(a: string, b: string): boolean {
  if (!a || a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

const str = (v: unknown, max = 200) => (typeof v === "string" ? v.trim().slice(0, max) : "");

Deno.serve(async (req) => {
  if (req.method !== "POST") return json(405, { ok: false, error: "POST only" });
  if (!safeEqual(req.headers.get("x-ps-ingest-token") ?? "", Deno.env.get("PS_INGEST_TOKEN") ?? "")) {
    return json(401, { ok: false, error: "unauthorized" });
  }
  let p: Record<string, unknown>;
  try {
    p = await req.json();
  } catch {
    return json(400, { ok: false, error: "bad json" });
  }

  const email = str(p.email, 254).toLowerCase();
  const firstName = str(p.first_name, 80);
  const lastName = str(p.last_name, 80);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !firstName || !lastName) return json(400, { ok: false, error: "missing name/email" });
  const phone = str(p.phone, 20) || null;
  const isBudtender = p.is_budtender === true;
  const optIn = p.marketing_opt_in === true;
  const unsubscribed = p.unsubscribed === true;
  const eventName = str(p.event_name, 120) || "an event";
  const qrCodeId = UUID.test(str(p.psm_qr_code_id, 40)) ? str(p.psm_qr_code_id, 40) : null;
  const dispensaryName = str(p.dispensary_name, 120);
  const dispensaryCity = str(p.dispensary_city, 80);

  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });

  // Only link to a real, same-company account.
  let accountId: string | null = null;
  const candidate = str(p.dispensary_psm_account_id, 40);
  if (isBudtender && UUID.test(candidate)) {
    const { data } = await db.from("retail_accounts").select("id").eq("id", candidate).eq("company_id", COMPANY_ID).maybeSingle();
    accountId = data?.id ?? null;
  }
  let qrOk = false;
  if (qrCodeId) {
    const { data } = await db.from("crm_qr_codes").select("id").eq("id", qrCodeId).eq("company_id", COMPANY_ID).maybeSingle();
    qrOk = Boolean(data);
  }

  const note = `RSVP'd to ${eventName} via privatestock.co` +
    (isBudtender ? ` (budtender at ${dispensaryName}, ${dispensaryCity}${accountId ? "" : "; not a PSM account"})` : "");
  const now = new Date().toISOString();

  // Match on email (no unique constraint in crm_contacts; oldest row wins, like v_crm_duplicate_contacts).
  const pattern = email.replace(/[\\%_]/g, (m) => `\\${m}`);
  const { data: existing, error: findErr } = await db
    .from("crm_contacts")
    .select("id, first_name, last_name, phone, account_id, audience_type, role_title, marketing_opt_in, notes")
    .eq("company_id", COMPANY_ID)
    .ilike("email", pattern)
    .order("created_at")
    .limit(1)
    .maybeSingle();
  if (findErr) return json(500, { ok: false, error: findErr.message });

  let contactId: string;
  if (existing) {
    const patch: Record<string, unknown> = {};
    if (!existing.first_name) patch.first_name = firstName;
    if (!existing.last_name) patch.last_name = lastName;
    if (!existing.phone && phone) patch.phone = phone;
    if (!existing.account_id && accountId) patch.account_id = accountId;
    if (isBudtender && (existing.audience_type === "consumer" || !existing.audience_type)) patch.audience_type = "budtender";
    if (isBudtender && !existing.role_title) patch.role_title = "Budtender";
    // Consent only moves up, except on an explicit unsubscribe.
    if (unsubscribed) patch.marketing_opt_in = false;
    else if (optIn && existing.marketing_opt_in !== true) {
      patch.marketing_opt_in = true;
      patch.marketing_opt_in_at = str(p.marketing_opt_in_at, 40) || now;
    }
    if (!(existing.notes ?? "").includes(note)) patch.notes = existing.notes ? `${existing.notes}\n${note}` : note;
    if (Object.keys(patch).length) {
      const { error } = await db.from("crm_contacts").update(patch).eq("id", existing.id);
      if (error) return json(500, { ok: false, error: error.message });
    }
    contactId = existing.id;
  } else {
    const { data: created, error } = await db
      .from("crm_contacts")
      .insert({
        company_id: COMPANY_ID,
        first_name: firstName,
        last_name: lastName,
        email,
        phone,
        audience_type: isBudtender ? "budtender" : "consumer",
        role_title: isBudtender ? "Budtender" : null,
        account_id: accountId, // trigger backfill_crm_contact_link creates the crm_contact_accounts row
        is_21_plus: true,
        is_active: true,
        source: "qr_signup",
        first_source_qr_code_id: qrOk ? qrCodeId : null,
        marketing_opt_in: unsubscribed ? false : optIn,
        marketing_opt_in_at: optIn && !unsubscribed ? str(p.marketing_opt_in_at, 40) || now : null,
        notes: note,
      })
      .select("id")
      .single();
    if (error || !created) return json(500, { ok: false, error: error?.message ?? "insert failed" });
    contactId = created.id;
  }

  // One crm_signups row per contact per event source (idempotent across retries).
  if (qrOk) {
    const { data: sig } = await db.from("crm_signups").select("id").eq("qr_code_id", qrCodeId).eq("contact_id", contactId).limit(1);
    if (!sig?.length) await db.from("crm_signups").insert({ qr_code_id: qrCodeId, contact_id: contactId });
  }

  return json(200, { ok: true, contact_id: contactId });
});
```

## 6. Verify (after deploy)

```sql
select id, first_name, last_name, audience_type, account_id, marketing_opt_in, source, first_source_qr_code_id, notes
from crm_contacts where notes ilike '%Kickback%' order by created_at desc limit 20;
```
Kill switch: disable either function in the dashboard. The website keeps RSVPs, shows "Not in CRM" and retries every 10 minutes.

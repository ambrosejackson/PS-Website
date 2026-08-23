"use server";

import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin/allowlist";
import { runSheetSync, type SyncSummary } from "@/lib/sheet-sync/run";

async function requireAdmin(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return isAdminEmail(user?.email);
}

/** "Sync from sheet" button — runs the iHeartJane sync and returns the summary. */
export async function syncFromSheet(opts: { dryRun?: boolean } = {}): Promise<SyncSummary> {
  if (!(await requireAdmin())) {
    const now = new Date().toISOString();
    return {
      ok: false,
      startedAt: now,
      finishedAt: now,
      dryRun: !!opts.dryRun,
      tabs: [],
      added: 0,
      updated: 0,
      quarantined: 0,
      missing: 0,
      invalid: [],
      quarantineDetails: [],
      revalidated: [],
      error: "Unauthorized.",
    };
  }
  return runSheetSync(opts);
}

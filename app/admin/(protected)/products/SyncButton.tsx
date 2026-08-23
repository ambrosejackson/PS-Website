"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import type { SyncSummary } from "@/lib/sheet-sync/run";
import { syncFromSheet } from "./actions";

/** "Sync from sheet" + "Dry run" with an inline result summary. */
export function SyncButton() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [result, setResult] = useState<SyncSummary | null>(null);
  const [mode, setMode] = useState<"sync" | "dry" | null>(null);

  function run(dryRun: boolean) {
    setMode(dryRun ? "dry" : "sync");
    start(async () => {
      const r = await syncFromSheet({ dryRun });
      setResult(r);
      if (!dryRun && r.ok) router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={() => run(false)} disabled={pending}>
          {pending && mode === "sync" ? "Syncing…" : "Sync from sheet"}
        </Button>
        <Button variant="outline" onClick={() => run(true)} disabled={pending}>
          {pending && mode === "dry" ? "Checking…" : "Dry run"}
        </Button>
        <span className="text-xs text-neutral-500">
          iHeartJane master sheet · daily cron 09:00 UTC · new products arrive hidden
        </span>
      </div>

      {result && (
        <div
          className={`rounded border p-3 text-sm ${
            result.ok ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"
          }`}
        >
          <div className="flex flex-wrap gap-x-5 gap-y-1 font-medium">
            <span>{result.dryRun ? "Dry run" : "Sync"} {result.ok ? "complete" : "failed"}</span>
            <span>added {result.added}</span>
            <span>updated {result.updated}</span>
            <span>quarantined {result.quarantined}</span>
            <span>missing {result.missing}</span>
            {result.invalid.length > 0 && <span>invalid (not stored) {result.invalid.length}</span>}
          </div>
          {result.error && <p className="mt-1 text-red-700">{result.error}</p>}
          <p className="mt-1 text-xs text-neutral-600">
            {result.tabs.map((t) => `${t.tab}: ${t.mapped} mapped / ${t.skipped} skipped`).join(" · ")}
          </p>
          {result.quarantineDetails.length > 0 && (
            <details className="mt-2 text-xs">
              <summary className="cursor-pointer">Quarantine reasons ({result.quarantineDetails.length})</summary>
              <ul className="mt-1 list-disc pl-5">
                {result.quarantineDetails.slice(0, 50).map((q, i) => (
                  <li key={i}>
                    <span className="font-medium">{q.brand} — {q.name}</span>: {q.reason}
                  </li>
                ))}
              </ul>
            </details>
          )}
          {result.invalid.length > 0 && (
            <details className="mt-2 text-xs">
              <summary className="cursor-pointer">Invalid rows ({result.invalid.length})</summary>
              <ul className="mt-1 list-disc pl-5">
                {result.invalid.slice(0, 50).map((q, i) => (
                  <li key={i}>{q.tab} row {q.rowIndex}: {q.reason}</li>
                ))}
              </ul>
            </details>
          )}
          {result.revalidated.length > 0 && (
            <p className="mt-1 text-xs text-neutral-500">Revalidated {result.revalidated.length} paths.</p>
          )}
        </div>
      )}
    </div>
  );
}

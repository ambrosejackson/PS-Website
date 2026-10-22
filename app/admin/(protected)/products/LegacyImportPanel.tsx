"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import type { LegacyImportBatchResult, LegacyImportCounts, PlaceholderCounts } from "@/lib/catalog/import-legacy-images";
import { markPlaceholderRowsMissingAction } from "./actions";

/**
 * One-time cutover panels for /admin/products (D-132, D-133). Both are rendered
 * only while the page's server-side counts say there is work left; once the
 * import and the placeholder clean-up are done they disappear for good.
 *
 *  - Legacy image import: "Dry run next 25" (download + validate, writes
 *    nothing) then "Import next 25" (enabled after a dry run in this session).
 *    Keep clicking Import until remaining = 0.
 *  - Placeholder rows: one confirmed action that flags the old
 *    /placeholders/product.png rows and the empty-URL rows as image-missing.
 */

type RouteError = { error?: string };

export function LegacyImportPanel({
  counts,
  placeholders,
}: {
  counts: LegacyImportCounts;
  placeholders: PlaceholderCounts;
}) {
  const router = useRouter();
  // Shown while anything is importable OR anything failed earlier (D-136): the
  // failed rows get a "Retry failed" path instead of only an inline image_error.
  const showImport = counts.candidates > 0 || counts.previouslyFailed > 0;
  const showPlaceholders = placeholders.placeholder > 0 || placeholders.emptyUnflagged > 0;
  if (!showImport && !showPlaceholders) return null;
  return (
    <div className="space-y-3">
      {showImport && <ImportSection counts={counts} onChanged={() => router.refresh()} />}
      {showPlaceholders && <PlaceholderSection counts={placeholders} onChanged={() => router.refresh()} />}
    </div>
  );
}

function ImportSection({ counts, onChanged }: { counts: LegacyImportCounts; onChanged: () => void }) {
  const [busy, setBusy] = useState<"dry" | "import" | null>(null);
  const [dryRunDone, setDryRunDone] = useState(false);
  // Only failed rows left → the panel is in retry mode from the start.
  const retryOnly = counts.candidates === 0 && counts.previouslyFailed > 0;
  const [retryFailed, setRetryFailed] = useState(retryOnly);
  const [result, setResult] = useState<LegacyImportBatchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Live counts after each real batch (the server props refresh on router.refresh()).
  const [remaining, setRemaining] = useState<number | null>(null);

  async function run(dryRun: boolean) {
    setBusy(dryRun ? "dry" : "import");
    setError(null);
    try {
      const res = await fetch("/api/admin/products/import-legacy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dryRun, retryFailed }),
      });
      const data = (await res.json().catch(() => ({}))) as LegacyImportBatchResult & RouteError;
      if (!res.ok) {
        setError(data.error ?? `HTTP ${res.status}`);
        return;
      }
      setResult(data);
      if (dryRun) setDryRunDone(true);
      else {
        setRemaining(data.remaining);
        onChanged();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed.");
    } finally {
      setBusy(null);
    }
  }

  const left = remaining ?? (retryFailed ? counts.candidates + counts.previouslyFailed : counts.candidates);
  const done = left === 0;
  const verb = retryFailed ? "Retry" : "Import";

  return (
    <details className="rounded border border-amber-300 bg-amber-50" open>
      <summary className="cursor-pointer select-none px-4 py-3 text-sm font-medium text-amber-900">
        Legacy image import —{" "}
        {retryOnly
          ? `${counts.previouslyFailed} product${counts.previouslyFailed === 1 ? "" : "s"} failed earlier`
          : `${counts.candidates} product${counts.candidates === 1 ? "" : "s"} still on Google Drive${
              counts.previouslyFailed > 0 ? ` · ${counts.previouslyFailed} failed earlier` : ""
            }`}
      </summary>
      <div className="space-y-3 border-t border-amber-200 px-4 py-3 text-sm">
        <p className="max-w-prose text-neutral-700">
          One-time cutover: each Drive file is downloaded once, run through the image pipeline and copied to
          every product that shares it. Products whose file can&apos;t be fetched (private or deleted on Drive)
          get an <code>image_error</code> and keep their old link. Start with a dry run, then import in
          batches of {25} until nothing remains.
          {counts.distinctFiles > 0 ? ` ${counts.distinctFiles} distinct files behind the ${counts.candidates} products.` : ""}
          {retryOnly
            ? " Only rows that failed earlier remain: fix the file's sharing on Drive (or re-upload it in the editor), then dry-run and retry here."
            : ""}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="outline" disabled={busy !== null || done} onClick={() => run(true)}>
            {busy === "dry" ? "Checking…" : "Dry run next 25"}
          </Button>
          <Button
            size="sm"
            disabled={busy !== null || !dryRunDone || done}
            title={dryRunDone ? "" : "Run a dry run first"}
            onClick={() => run(false)}
          >
            {busy === "import" ? `${verb}ing…` : retryFailed ? "Retry failed (next 25)" : "Import next 25"}
          </Button>
          {counts.previouslyFailed > 0 && !retryOnly && (
            <label className="flex items-center gap-2 text-xs text-neutral-700">
              <input
                type="checkbox"
                checked={retryFailed}
                onChange={(e) => {
                  setRetryFailed(e.target.checked);
                  setDryRunDone(false);
                }}
              />
              Retry the {counts.previouslyFailed} that failed earlier
            </label>
          )}
          {busy && <span className="text-xs text-neutral-500">Up to 25 files, 20 s each — this can take a few minutes.</span>}
        </div>
        {!dryRunDone && !done && <p className="text-xs text-neutral-500">{verb} is enabled after a dry run in this session.</p>}
        {done && <p className="text-xs text-green-800">Nothing left to import. This panel disappears on the next page load.</p>}
        {error && <p className="rounded border border-red-200 bg-red-50 p-2 text-red-700">{error}</p>}
        {result && <BatchResult result={result} />}
      </div>
    </details>
  );
}

function BatchResult({ result }: { result: LegacyImportBatchResult }) {
  const secs = (result.elapsedMs / 1000).toFixed(1);
  return (
    <div className="space-y-2">
      <p className="text-xs text-neutral-700">
        <strong>{result.dryRun ? "Dry run" : "Imported"}:</strong> {result.processed} product
        {result.processed === 1 ? "" : "s"} across {result.filesFetched} file{result.filesFetched === 1 ? "" : "s"} ·{" "}
        {result.succeeded} ok · {result.failed.length} failed · {result.remaining} remaining
        {result.skippedPreviouslyFailed ? ` · ${result.skippedPreviouslyFailed} skipped (failed earlier)` : ""} ·{" "}
        {secs} s{result.stoppedEarly ? " · stopped early (time budget) — run again" : ""}
        {result.dryRun ? " · nothing was written" : ""}
      </p>
      <div className="max-h-80 overflow-auto rounded border bg-white">
        <table className="w-full text-left text-xs">
          <thead className="sticky top-0 bg-neutral-50 text-neutral-600">
            <tr>
              <th className="px-2 py-1 font-medium">Product</th>
              <th className="px-2 py-1 font-medium">Drive ID</th>
              <th className="px-2 py-1 font-medium">Result</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {result.rows.map((r) => (
              <tr key={r.productId} className={r.ok ? "" : "bg-red-50"}>
                <td className="px-2 py-1">
                  <span className="font-medium">{r.name}</span>
                  <span className="text-neutral-500"> · {r.brand}</span>
                </td>
                <td className="px-2 py-1 font-mono text-[11px] text-neutral-600">{r.driveId || "—"}</td>
                <td className="px-2 py-1">
                  {r.ok ? (
                    <span className="text-green-800">
                      {result.dryRun ? (r.action === "copy" ? "would copy" : "would import") : r.action === "copy" ? "copied" : "imported"}
                      {r.format ? ` · ${r.format} ${r.width}×${r.height}` : ""}
                      {r.bytes ? ` · ${(r.bytes / 1024).toFixed(0)} KB` : ""}
                    </span>
                  ) : (
                    <span className="text-red-700">{r.reason}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PlaceholderSection({ counts, onChanged }: { counts: PlaceholderCounts; onChanged: () => void }) {
  const [pending, start] = useTransition();
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<PlaceholderCounts | null>(null);
  const total = counts.placeholder + counts.emptyUnflagged;

  function run() {
    setError(null);
    start(async () => {
      const res = await markPlaceholderRowsMissingAction();
      if (!res.ok) setError(res.error);
      else {
        setDone(res.data);
        setConfirm(false);
        onChanged();
      }
    });
  }

  return (
    <details className="rounded border border-neutral-300 bg-neutral-50" open>
      <summary className="cursor-pointer select-none px-4 py-3 text-sm font-medium text-neutral-800">
        Placeholder rows — {total} product{total === 1 ? "" : "s"} to mark as image-missing
      </summary>
      <div className="space-y-3 border-t px-4 py-3 text-sm">
        <p className="max-w-prose text-neutral-700">
          {counts.placeholder} row{counts.placeholder === 1 ? "" : "s"} still point at the old{" "}
          <code>/placeholders/product.png</code> and {counts.emptyUnflagged} ha{counts.emptyUnflagged === 1 ? "s" : "ve"} an
          empty image URL without the missing flag. This clears the placeholder URL and sets{" "}
          <code>image_missing</code> so they show the brand-logo placeholder and the “Image missing” filter finds them.
          No images are deleted.
        </p>
        {done ? (
          <p className="text-xs text-green-800">
            Done: {done.placeholder} placeholder row{done.placeholder === 1 ? "" : "s"} and {done.emptyUnflagged} empty row
            {done.emptyUnflagged === 1 ? "" : "s"} marked.
          </p>
        ) : confirm ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-neutral-700">Mark {total} product{total === 1 ? "" : "s"} as image-missing?</span>
            <Button size="sm" disabled={pending} onClick={run}>
              {pending ? "Marking…" : "Yes, mark them"}
            </Button>
            <Button size="sm" variant="ghost" disabled={pending} onClick={() => setConfirm(false)}>
              Cancel
            </Button>
          </div>
        ) : (
          <Button size="sm" variant="outline" onClick={() => setConfirm(true)}>
            Mark placeholder rows as image-missing
          </Button>
        )}
        {error && <p className="rounded border border-red-200 bg-red-50 p-2 text-red-700">{error}</p>}
      </div>
    </details>
  );
}

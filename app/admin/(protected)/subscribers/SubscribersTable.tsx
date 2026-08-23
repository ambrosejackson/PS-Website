"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { deleteSubscriber, exportSubscribersCsv, type SubscriberFilters, type SubscriberListRow } from "./actions";

export function SubscribersTable({ rows, filters }: { rows: SubscriberListRow[]; filters: SubscriberFilters }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  function exportCsv() {
    setMsg(null);
    start(async () => {
      const r = await exportSubscribersCsv(filters);
      if (!r.ok) {
        setMsg({ ok: false, text: r.error });
        return;
      }
      const blob = new Blob([r.data.csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `subscribers-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      setMsg({ ok: true, text: `Exported ${r.data.count} rows.` });
    });
  }

  function remove(id: string) {
    setMsg(null);
    start(async () => {
      const r = await deleteSubscriber(id);
      setConfirmId(null);
      setMsg(r.ok ? { ok: true, text: `Removed.${r.data.stripeDeactivated ? " Stripe promotion code deactivated." : ""}` } : { ok: false, text: r.error });
      router.refresh();
    });
  }

  const codeStatus = (r: SubscriberListRow) =>
    !r.code ? "—" : r.redeemed_at ? "redeemed" : r.expires_at && new Date(r.expires_at) < new Date() ? "expired" : "unused";

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <Button size="sm" variant="outline" disabled={pending || rows.length === 0} onClick={exportCsv}>
          Export CSV ({rows.length} rows in view)
        </Button>
        {msg && <span className={`text-sm ${msg.ok ? "text-green-700" : "text-red-600"}`}>{msg.text}</span>}
      </div>
      {rows.length === 0 ? (
        <p className="rounded border border-dashed p-6 text-sm text-neutral-400">No subscribers match.</p>
      ) : (
        <div className="overflow-x-auto rounded border bg-white">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-neutral-500">
              <tr>
                <th className="px-3 py-2">Email</th>
                <th className="px-3 py-2">Persona</th>
                <th className="px-3 py-2">Source</th>
                <th className="px-3 py-2">Consented</th>
                <th className="px-3 py-2">Code</th>
                <th className="px-3 py-2">PSM sync</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="px-3 py-2 font-medium">{r.email}</td>
                  <td className="px-3 py-2 text-xs">
                    <div>{r.persona}</div>
                    <div className="text-neutral-500">{r.brand_context}</div>
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-neutral-600">{r.source_path}</td>
                  <td className="px-3 py-2 text-xs text-neutral-600">{new Date(r.consented_at).toLocaleString()}</td>
                  <td className="px-3 py-2 text-xs">
                    {r.code ? (
                      <>
                        <span className="font-mono">{r.code}</span>{" "}
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                            codeStatus(r) === "redeemed" ? "bg-green-100 text-green-800" : codeStatus(r) === "expired" ? "bg-neutral-200 text-neutral-700" : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {codeStatus(r)}
                        </span>
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs text-neutral-600">{r.synced_to_psm_at ? new Date(r.synced_to_psm_at).toLocaleDateString() : "not yet"}</td>
                  <td className="px-3 py-2 text-right">
                    {confirmId === r.id ? (
                      <span className="inline-flex gap-1">
                        <Button size="sm" variant="destructive" disabled={pending} onClick={() => remove(r.id)}>
                          Confirm
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setConfirmId(null)}>
                          Cancel
                        </Button>
                      </span>
                    ) : (
                      <Button size="sm" variant="ghost" className="text-red-600" onClick={() => setConfirmId(r.id)} title="Removal request: deletes the row and expires the code">
                        Delete
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  adminCancelRsvp,
  adminExportRsvpsCsv,
  adminReleasePlate,
  adminResendConfirmation,
  adminRetrySync,
  type ActionResult,
} from "@/lib/events/admin-actions";
import type { RsvpRow } from "@/lib/events/types";
import { prettyPhone } from "@/lib/events/format";

const VIEWS = [
  { key: "all", label: "All confirmed" },
  { key: "budtenders", label: "Budtenders" },
  { key: "waitlist", label: "Plate waitlist" },
  { key: "checked", label: "Checked in" },
  { key: "unsynced", label: "Not in CRM" },
  { key: "cancelled", label: "Cancelled" },
] as const;
type View = (typeof VIEWS)[number]["key"];

function fmt(ts: string | null) {
  return ts ? new Date(ts).toLocaleString("en-US", { timeZone: "America/Chicago", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "";
}

export function RsvpTable({ slug, rows, platesFree }: { slug: string; rows: RsvpRow[]; platesFree: number }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [view, setView] = useState<View>("all");
  const [q, setQ] = useState("");
  const [confirmCancel, setConfirmCancel] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows
      .filter((r) => {
        switch (view) {
          case "budtenders": return r.status === "confirmed" && r.is_budtender;
          case "waitlist": return r.status === "confirmed" && r.plate_status === "waitlisted";
          case "checked": return Boolean(r.checked_in_at);
          case "unsynced": return !r.psm_synced_at;
          case "cancelled": return r.status === "cancelled";
          default: return r.status === "confirmed";
        }
      })
      .filter((r) => !needle || `${r.first_name} ${r.last_name} ${r.email} ${r.dispensary_name ?? ""}`.toLowerCase().includes(needle))
      .sort((a, b) => (view === "waitlist" ? (a.plate_waitlist_position ?? 0) - (b.plate_waitlist_position ?? 0) : 0));
  }, [rows, view, q]);

  function run(fn: () => Promise<ActionResult>) {
    setMsg(null);
    start(async () => {
      const r = await fn();
      setMsg({ ok: r.ok, text: r.message ?? (r.ok ? "Done." : "Failed.") });
      router.refresh();
    });
  }

  function exportCsv() {
    start(async () => {
      const r = await adminExportRsvpsCsv(slug);
      if (!r.ok) return setMsg({ ok: false, text: r.message });
      const url = URL.createObjectURL(new Blob([r.csv], { type: "text/csv;charset=utf-8" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `${slug}-rsvps-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      setMsg({ ok: true, text: `Exported ${r.count} rows (includes cancelled).` });
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {VIEWS.map((v) => (
          <button
            key={v.key}
            type="button"
            onClick={() => setView(v.key)}
            className={`rounded-full border px-3 py-1 text-xs ${view === v.key ? "border-neutral-900 bg-neutral-900 text-white" : "bg-white"}`}
          >
            {v.label}
          </button>
        ))}
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, email, dispensary…" className="ml-auto h-9 min-w-64 rounded-md border bg-white px-3 text-sm" />
        <Button size="sm" variant="outline" disabled={pending} onClick={exportCsv}>Export CSV</Button>
      </div>
      {msg && <p className={`text-sm ${msg.ok ? "text-green-700" : "text-red-600"}`}>{msg.text}</p>}
      <div className="overflow-x-auto rounded border bg-white">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wide text-neutral-500">
            <tr>
              <th className="px-3 py-2">Guest</th>
              <th className="px-3 py-2">Budtender</th>
              <th className="px-3 py-2">Plate</th>
              <th className="px-3 py-2">Day-of</th>
              <th className="px-3 py-2">CRM</th>
              <th className="px-3 py-2">RSVP&apos;d</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {shown.length === 0 && (
              <tr><td colSpan={7} className="px-3 py-6 text-center text-neutral-400">No RSVPs in this view.</td></tr>
            )}
            {shown.map((r) => (
              <tr key={r.id} className={r.status === "cancelled" ? "opacity-50" : ""}>
                <td className="px-3 py-2">
                  <div className="font-medium">{r.first_name} {r.last_name}</div>
                  <div className="text-xs text-neutral-500">{r.email}{r.email_bounced && <span className="ml-1 text-red-600">(bounced)</span>}</div>
                  {r.phone && <div className="text-xs text-neutral-500">{prettyPhone(r.phone)}</div>}
                  {r.marketing_opt_in && <div className="text-xs text-green-700">opted in</div>}
                </td>
                <td className="px-3 py-2 text-xs">
                  {r.is_budtender ? (
                    <>
                      <div className="font-medium">{r.dispensary_name}</div>
                      <div className="text-neutral-500">{r.dispensary_city}{!r.dispensary_psm_account_id && " · typed in"}</div>
                    </>
                  ) : "—"}
                </td>
                <td className="px-3 py-2 text-xs">
                  {r.plate_status === "confirmed" && "Reserved"}
                  {r.plate_status === "waitlisted" && `Waitlist #${r.plate_waitlist_position ?? "?"}`}
                  {r.plate_status === "none" && "—"}
                </td>
                <td className="px-3 py-2 text-xs text-neutral-600">
                  {r.checked_in_at && <div>In {fmt(r.checked_in_at)}</div>}
                  {r.badge_verified_at && <div>Badge ✓</div>}
                  {r.plate_redeemed_at && <div>Plate ✓</div>}
                </td>
                <td className="px-3 py-2 text-xs">
                  {r.psm_synced_at ? <span className="text-green-700">synced</span> : <span className="text-amber-700" title={r.psm_sync_error ?? ""}>{r.psm_sync_error ? "error" : "pending"}</span>}
                </td>
                <td className="px-3 py-2 text-xs text-neutral-500">{fmt(r.created_at)}<div>{r.source}</div></td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap justify-end gap-1">
                    {r.status === "confirmed" && r.plate_status === "waitlisted" && (
                      <Button size="xs" variant="outline" disabled={pending || platesFree === 0} title={platesFree === 0 ? "No free plates" : ""} onClick={() => run(() => adminReleasePlate(r.id))}>
                        Release plate
                      </Button>
                    )}
                    {r.status === "confirmed" && (
                      <Button size="xs" variant="ghost" disabled={pending} onClick={() => run(() => adminResendConfirmation(r.id))}>Resend</Button>
                    )}
                    {!r.psm_synced_at && (
                      <Button size="xs" variant="ghost" disabled={pending} onClick={() => run(() => adminRetrySync(r.id))}>Sync</Button>
                    )}
                    {r.status === "confirmed" && !r.checked_in_at && (
                      confirmCancel === r.id ? (
                        <Button size="xs" variant="destructive" disabled={pending} onClick={() => { setConfirmCancel(null); run(() => adminCancelRsvp(r.id)); }}>
                          Confirm cancel
                        </Button>
                      ) : (
                        <Button size="xs" variant="ghost" disabled={pending} onClick={() => setConfirmCancel(r.id)}>Cancel</Button>
                      )
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { MessageActions } from "./MessageActions";
import type { MessageRow } from "./actions";

export const dynamic = "force-dynamic";

const TYPES = ["consumer", "retailer", "press"] as const;
const STATUS_TONE: Record<string, string> = {
  new: "bg-amber-100 text-amber-900",
  read: "bg-neutral-200 text-neutral-700",
  archived: "bg-neutral-100 text-neutral-500",
};

/** /admin/messages — contact inbox over `messages` (D-043): newest first, unread bold, status chips, type filter. */
export default async function AdminMessagesPage({ searchParams }: { searchParams: Promise<{ type?: string; status?: string }> }) {
  const { type = "", status = "" } = await searchParams;
  let rows: MessageRow[] = [];
  let loadError: string | null = null;
  const counts: Record<string, number> = {};
  try {
    const db = createAdminClient();
    let q = db.from("messages").select("*").order("created_at", { ascending: false }).limit(300);
    if (type) q = q.eq("inquiry_type", type);
    if (status) q = q.eq("status", status);
    else q = q.neq("status", "archived");
    const { data, error } = await q;
    if (error) loadError = error.message;
    else rows = data ?? [];
    const { data: all } = await db.from("messages").select("inquiry_type, status");
    for (const m of all ?? []) {
      counts[m.inquiry_type] = (counts[m.inquiry_type] ?? 0) + (m.status === "archived" ? 0 : 1);
      if (m.status === "new") counts.unread = (counts.unread ?? 0) + 1;
    }
  } catch (e) {
    loadError = e instanceof Error ? e.message : "Could not load messages.";
  }
  const chip = (href: string, label: string, active: boolean, tone = "") => (
    <Link href={href} className={`rounded px-3 py-1.5 text-xs font-semibold ${active ? "bg-neutral-900 text-white" : `border bg-white text-neutral-700 hover:bg-neutral-100 ${tone}`}`}>
      {label}
    </Link>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-condensed text-2xl font-bold uppercase tracking-tight">Messages</h1>
        <p className="mt-2 max-w-prose text-sm text-neutral-600">
          Contact-form inbox ({counts.unread ?? 0} unread). Retailer inquiries are the future feed for the PSM W3
          retailer-ingest pipeline — keep them in this table; nothing syncs yet.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {chip("/admin/messages", "All types", !type && !status)}
        {TYPES.map((t) =>
          chip(
            `/admin/messages?type=${t}`,
            `${t[0].toUpperCase() + t.slice(1)} (${counts[t] ?? 0})`,
            type === t && !status,
            t === "retailer" ? "border-blue-300 text-blue-900" : "",
          ),
        )}
        {chip("/admin/messages?status=archived", "Archived", status === "archived")}
      </div>
      {type === "retailer" && (
        <p className="rounded border border-blue-200 bg-blue-50 p-3 text-xs text-blue-900">
          RETAILER view — wholesale / dispensary inquiries. When PSM W3 lands these rows are ingested into PS Management
          as retailer leads; until then reply by email from the detail view.
        </p>
      )}

      {loadError && <p className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{loadError}</p>}
      {!loadError && rows.length === 0 && <p className="rounded border border-dashed p-6 text-sm text-neutral-400">No messages here.</p>}
      {rows.length > 0 && (
        <ul className="divide-y rounded border bg-white">
          {rows.map((m) => {
            const unread = m.status === "new";
            return (
              <li key={m.id} className={`flex flex-col gap-2 px-4 py-3 md:flex-row md:items-center ${unread ? "bg-amber-50/40" : ""}`}>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href={`/admin/messages/${m.id}`} className={`truncate hover:underline ${unread ? "font-bold text-ink" : "font-medium"}`}>
                      {m.name}
                    </Link>
                    <span className="text-xs text-neutral-500">{m.email}</span>
                    <span className={`rounded px-2 py-0.5 text-[10px] font-semibold uppercase ${m.inquiry_type === "retailer" ? "bg-blue-100 text-blue-900" : "bg-neutral-100 text-neutral-700"}`}>
                      {m.inquiry_type}
                    </span>
                    <span className={`rounded px-2 py-0.5 text-[10px] font-semibold uppercase ${STATUS_TONE[m.status] ?? ""}`}>{m.status}</span>
                    {m.company && <span className="text-xs text-neutral-500">· {m.company}</span>}
                  </div>
                  <p className={`mt-0.5 truncate text-sm ${unread ? "text-neutral-800" : "text-neutral-500"}`}>{m.body}</p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="text-xs text-neutral-500">{new Date(m.created_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</span>
                  <MessageActions id={m.id} status={m.status} compact />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

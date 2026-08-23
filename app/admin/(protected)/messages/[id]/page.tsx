import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { markMessageRead } from "../actions";
import { MessageActions } from "../MessageActions";

export const dynamic = "force-dynamic";

export default async function AdminMessageDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = createAdminClient();
  const { data: m } = await db.from("messages").select("*").eq("id", id).maybeSingle();
  if (!m) notFound();
  if (m.status === "new") {
    await markMessageRead(m.id);
    m.status = "read";
  }
  const subject = encodeURIComponent(`Re: your ${m.inquiry_type} inquiry — Private Stock`);
  const greeting = encodeURIComponent(`Hi ${m.name.split(" ")[0]},\n\n\n\n— Private Stock Cannabis Co.\n\n> ${m.body.replace(/\n/g, "\n> ")}`);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/messages" className="text-xs text-neutral-500 hover:underline">
          ← Messages
        </Link>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <h1 className="font-condensed text-2xl font-bold uppercase tracking-tight">{m.name}</h1>
          <span className={`rounded px-2 py-0.5 text-[11px] font-semibold uppercase ${m.inquiry_type === "retailer" ? "bg-blue-100 text-blue-900" : "bg-neutral-100 text-neutral-700"}`}>
            {m.inquiry_type}
          </span>
          <span className="rounded bg-neutral-200 px-2 py-0.5 text-[11px] font-semibold uppercase text-neutral-700">{m.status}</span>
        </div>
        <p className="mt-1 text-xs text-neutral-500">{new Date(m.created_at).toLocaleString()} · {m.id}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="rounded border bg-white p-5">
          <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-neutral-800">{m.body}</pre>
        </div>
        <aside className="space-y-4">
          <div className="rounded border bg-white p-4 text-sm">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">Sender</h2>
            <p className="font-medium">{m.name}</p>
            <p>
              <a href={`mailto:${m.email}`} className="underline">
                {m.email}
              </a>
            </p>
            {m.company && <p className="text-neutral-600">{m.company}</p>}
            <a
              href={`mailto:${m.email}?subject=${subject}&body=${greeting}`}
              className="mt-3 inline-block bg-neutral-900 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white hover:bg-neutral-700"
            >
              Reply by email
            </a>
          </div>
          <div className="rounded border bg-white p-4">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">Status</h2>
            <MessageActions id={m.id} status={m.status} />
            {m.inquiry_type === "retailer" && (
              <p className="mt-3 text-xs text-blue-900">Retailer lead — will be ingested by PSM W3; keep it unarchived until then.</p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

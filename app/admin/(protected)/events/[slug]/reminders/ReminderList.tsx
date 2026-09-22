"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  adminDeleteReminder,
  adminRetryReminder,
  adminSaveReminder,
  adminSendTest,
  adminToggleReminder,
  type ActionResult,
} from "@/lib/events/admin-actions";
import { REMINDER_AUDIENCES, type ReminderRow } from "@/lib/events/types";

type Row = ReminderRow & { tally: Record<string, number>; audienceNow: number | null };

const input = "h-9 w-full rounded-md border bg-white px-3 text-sm";

function whenLabel(r: ReminderRow) {
  const at = r.resolved_send_at
    ? new Date(r.resolved_send_at).toLocaleString("en-US", { timeZone: "America/Chicago", weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) + " CT"
    : "—";
  if (r.send_mode === "relative" && r.offset_days !== null) {
    const d = r.offset_days;
    const rel = d === 0 ? "day of" : d < 0 ? `${-d} day${d === -1 ? "" : "s"} before` : `${d} day${d === 1 ? "" : "s"} after`;
    return `${at} (${rel})`;
  }
  return at;
}

function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Chicago", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(d);
  const g = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${g("year")}-${g("month")}-${g("day")}T${g("hour") === "24" ? "00" : g("hour")}:${g("minute")}`;
}

function Editor({ slug, row, eventLocalDate, onDone, mergeFields }: { slug: string; row: Partial<ReminderRow> | null; eventLocalDate: string; onDone: (r: ActionResult) => void; mergeFields: { key: string; desc: string }[] }) {
  const [pending, start] = useTransition();
  const [mode, setMode] = useState<"relative" | "absolute">((row?.send_mode as "relative" | "absolute") ?? "relative");
  const [err, setErr] = useState<string | null>(null);
  return (
    <form
      action={(fd) =>
        start(async () => {
          const r = await adminSaveReminder(slug, fd);
          if (!r.ok) setErr(r.message);
          else onDone(r);
        })
      }
      className="space-y-4 rounded border-2 border-neutral-900 bg-white p-5"
    >
      {row?.id && <input type="hidden" name="id" value={row.id} />}
      <div className="grid gap-4 md:grid-cols-3">
        <label className="text-sm md:col-span-2">
          <span className="text-xs text-neutral-600">Name (internal)</span>
          <input name="name" required defaultValue={row?.name ?? ""} className={input} />
        </label>
        <label className="text-sm">
          <span className="text-xs text-neutral-600">Channel</span>
          <select name="channel" defaultValue="email" className={input}>
            <option value="email">Email</option>
            <option value="sms" disabled>Text (not enabled)</option>
            <option value="both" disabled>Email + text (not enabled)</option>
          </select>
        </label>
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <label className="flex items-center gap-2 text-sm">
          <input type="radio" name="send_mode" value="relative" checked={mode === "relative"} onChange={() => setMode("relative")} /> Relative to event day
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="radio" name="send_mode" value="absolute" checked={mode === "absolute"} onChange={() => setMode("absolute")} /> Exact date &amp; time
        </label>
      </div>
      {mode === "relative" ? (
        <div className="flex flex-wrap items-end gap-4">
          <label className="text-sm">
            <span className="text-xs text-neutral-600">Days from event day ({eventLocalDate})</span>
            <input name="offset_days" type="number" min={-60} max={30} defaultValue={row?.offset_days ?? -1} className={`${input} w-28`} />
          </label>
          <label className="text-sm">
            <span className="text-xs text-neutral-600">At (Chicago time)</span>
            <input name="local_time" type="time" defaultValue={(row?.local_time ?? "10:00").slice(0, 5)} className={`${input} w-36`} />
          </label>
          <p className="pb-2 text-xs text-neutral-500">−7 = one week before · −1 = day before · 0 = day of · 1 = day after</p>
        </div>
      ) : (
        <label className="block text-sm">
          <span className="text-xs text-neutral-600">Send at (Chicago time)</span>
          <input name="send_at_local" type="datetime-local" defaultValue={toLocalInput(row?.send_at ?? null)} className={`${input} w-64`} />
        </label>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <label className="text-sm">
          <span className="text-xs text-neutral-600">Who gets it</span>
          <select name="audience" defaultValue={row?.audience ?? "all"} className={input}>
            {REMINDER_AUDIENCES.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
          </select>
        </label>
        <div className="flex flex-col justify-end gap-2 text-sm">
          <label className="flex items-center gap-2"><input type="checkbox" name="is_marketing" defaultChecked={row?.is_marketing ?? false} /> Marketing content (only sends to opted-in guests, adds unsubscribe link)</label>
          <label className="flex items-center gap-2"><input type="checkbox" name="enabled" defaultChecked={row?.enabled ?? true} /> Enabled</label>
        </div>
      </div>

      <label className="block text-sm">
        <span className="text-xs text-neutral-600">Subject</span>
        <input name="subject" required defaultValue={row?.subject ?? ""} className={input} />
      </label>
      <label className="block text-sm">
        <span className="text-xs text-neutral-600">Message (HTML; merge fields below)</span>
        <textarea name="body_html" required rows={8} defaultValue={row?.body_html ?? "<p>Hey {first_name},</p>\n<p></p>\n{plate_block}\n<p><a href=\"{ticket_link}\">Your ticket</a></p>"} className="w-full rounded-md border bg-white p-3 font-mono text-xs" />
      </label>
      <details className="text-xs text-neutral-600">
        <summary className="cursor-pointer">Merge fields</summary>
        <ul className="mt-2 grid gap-1 md:grid-cols-2">
          {mergeFields.map((m) => <li key={m.key}><code className="font-semibold">{m.key}</code> {m.desc}</li>)}
        </ul>
      </details>
      {err && <p className="text-sm text-red-600">{err}</p>}
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>Save reminder</Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => onDone({ ok: true })}>Close</Button>
      </div>
    </form>
  );
}

export function ReminderList({ slug, reminders, eventLocalDate, mergeFields }: { slug: string; reminders: Row[]; eventLocalDate: string; mergeFields: { key: string; desc: string }[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  function run(fn: () => Promise<ActionResult>) {
    setMsg(null);
    start(async () => {
      const r = await fn();
      setMsg({ ok: r.ok, text: r.message ?? (r.ok ? "Done." : "Failed.") });
      router.refresh();
    });
  }
  function done(r: ActionResult) {
    setEditing(null);
    if (r.message) setMsg({ ok: r.ok, text: r.message });
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {msg && <p className={`text-sm ${msg.ok ? "text-green-700" : "text-red-600"}`}>{msg.text}</p>}
      {reminders.map((r) =>
        editing === r.id ? (
          <Editor key={r.id} slug={slug} row={r} eventLocalDate={eventLocalDate} onDone={done} mergeFields={mergeFields} />
        ) : (
          <div key={r.id} className={`rounded border bg-white p-4 ${r.enabled ? "" : "opacity-60"}`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold">{r.name} <span className={`ml-2 rounded px-2 py-0.5 text-xs ${r.status === "sent" ? "bg-green-100 text-green-800" : r.status === "failed" ? "bg-red-100 text-red-800" : "bg-neutral-100"}`}>{r.enabled || r.status === "sent" ? r.status : "disabled"}</span></p>
                <p className="text-sm text-neutral-600">{whenLabel(r)}</p>
                <p className="text-sm">&ldquo;{r.subject}&rdquo;</p>
                <p className="text-xs text-neutral-500">
                  {REMINDER_AUDIENCES.find((a) => a.value === r.audience)?.label}
                  {r.is_marketing && " · marketing (opted-in only)"}
                  {r.audienceNow !== null && ` · ${r.audienceNow} would receive it right now`}
                </p>
                {r.status === "sent" && (
                  <p className="text-xs text-neutral-500">
                    Sent {r.sent_at && new Date(r.sent_at).toLocaleString("en-US", { timeZone: "America/Chicago" })} to {r.recipient_count}
                    {Object.entries(r.tally).map(([k, v]) => ` · ${v} ${k}`).join("")}
                  </p>
                )}
                {r.last_error && <p className="text-xs text-red-600">{r.last_error}</p>}
              </div>
              <div className="flex flex-wrap gap-1">
                <Button size="xs" variant="outline" disabled={pending} onClick={() => run(() => adminSendTest(r.id))}>Send test to me</Button>
                {r.status !== "sent" && r.status !== "sending" && (
                  <>
                    <Button size="xs" variant="ghost" onClick={() => setEditing(r.id)}>Edit</Button>
                    <Button size="xs" variant="ghost" disabled={pending} onClick={() => run(() => adminToggleReminder(r.id, slug, !r.enabled))}>{r.enabled ? "Disable" : "Enable"}</Button>
                    <Button size="xs" variant="ghost" disabled={pending} onClick={() => run(() => adminDeleteReminder(r.id, slug))}>Delete</Button>
                  </>
                )}
                {r.status === "failed" && (
                  <Button size="xs" variant="outline" disabled={pending} onClick={() => run(() => adminRetryReminder(r.id, slug))}>Retry</Button>
                )}
              </div>
            </div>
          </div>
        ),
      )}
      {editing === "new" ? (
        <Editor slug={slug} row={null} eventLocalDate={eventLocalDate} onDone={done} mergeFields={mergeFields} />
      ) : (
        <Button size="sm" onClick={() => setEditing("new")}>Add reminder</Button>
      )}
    </div>
  );
}

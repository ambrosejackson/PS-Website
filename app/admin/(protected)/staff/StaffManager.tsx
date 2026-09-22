"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { adminAddCheckinStaff, adminRemoveCheckinStaff } from "@/lib/events/admin-actions";

export function StaffManager({ staff }: { staff: { email: string; created_at: string; created_by: string | null }[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);
  const input = "h-9 rounded-md border bg-white px-3 text-sm";

  return (
    <div className="space-y-4">
      <form
        action={(fd) =>
          start(async () => {
            const r = await adminAddCheckinStaff(fd);
            setMsg({ ok: r.ok, text: r.message ?? "" });
            router.refresh();
          })
        }
        className="flex flex-wrap items-end gap-3 rounded border bg-white p-4"
      >
        <label className="text-sm">
          <span className="block text-xs text-neutral-600">Email</span>
          <input name="email" type="email" required className={`${input} w-64`} />
        </label>
        <label className="text-sm">
          <span className="block text-xs text-neutral-600">Password (share it with them in person)</span>
          <input name="password" type="text" required minLength={10} autoComplete="off" className={`${input} w-64`} />
        </label>
        <Button type="submit" size="sm" disabled={pending}>Add check-in staff</Button>
      </form>
      {msg && <p className={`text-sm ${msg.ok ? "text-green-700" : "text-red-600"}`}>{msg.text}</p>}
      <div className="rounded border bg-white">
        {staff.length === 0 ? (
          <p className="p-4 text-sm text-neutral-400">No check-in staff yet.</p>
        ) : (
          <ul className="divide-y">
            {staff.map((s) => (
              <li key={s.email} className="flex items-center justify-between gap-3 p-3 text-sm">
                <span>
                  <span className="font-medium">{s.email}</span>
                  <span className="ml-2 text-xs text-neutral-500">added {new Date(s.created_at).toLocaleDateString()}{s.created_by ? ` by ${s.created_by}` : ""}</span>
                </span>
                {confirm === s.email ? (
                  <Button size="xs" variant="destructive" disabled={pending} onClick={() => start(async () => { const r = await adminRemoveCheckinStaff(s.email); setConfirm(null); setMsg({ ok: r.ok, text: r.message ?? "" }); router.refresh(); })}>
                    Confirm remove
                  </Button>
                ) : (
                  <Button size="xs" variant="ghost" onClick={() => setConfirm(s.email)}>Remove access</Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

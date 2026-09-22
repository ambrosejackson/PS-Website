"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { adminRefreshDispensaries, adminUpdateEvent } from "@/lib/events/admin-actions";

export function EventSettingsForm({
  slug,
  initial,
  freePlates,
  waitlisted,
}: {
  slug: string;
  initial: { plate_cap: number; rsvp_open: boolean; weather_note: string; psm_qr_code_id: string };
  freePlates: number;
  waitlisted: number;
}) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const input = "h-9 rounded-md border bg-white px-3 text-sm";

  return (
    <form
      action={(fd) =>
        start(async () => {
          const r = await adminUpdateEvent(slug, fd);
          setMsg({ ok: r.ok, text: r.message ?? "Saved." });
        })
      }
      className="space-y-4 rounded border bg-white p-5"
    >
      <p className="font-condensed text-lg font-bold uppercase">Event settings</p>
      <div className="flex flex-wrap items-end gap-5">
        <label className="text-sm">
          <span className="block text-xs text-neutral-600">Plate cap</span>
          <input name="plate_cap" type="number" min={0} defaultValue={initial.plate_cap} className={`${input} w-24`} />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input name="rsvp_open" type="checkbox" defaultChecked={initial.rsvp_open} /> RSVPs open
        </label>
        <label className="min-w-72 flex-1 text-sm">
          <span className="block text-xs text-neutral-600">Weather note (fills {"{weather_note}"} in reminders)</span>
          <input name="weather_note" defaultValue={initial.weather_note} placeholder="e.g. Rain or shine: tents over the grill and DJ." className={`${input} w-full`} />
        </label>
        <label className="text-sm">
          <span className="block text-xs text-neutral-600">PSM sign-up source id (crm_qr_codes)</span>
          <input name="psm_qr_code_id" defaultValue={initial.psm_qr_code_id} className={`${input} w-80 font-mono text-xs`} />
        </label>
      </div>
      <p className="text-xs text-neutral-500">
        Raising the cap doesn&apos;t auto-promote the waitlist ({waitlisted} waiting, {freePlates} free now). Use &ldquo;Release plate&rdquo; on a waitlisted guest below.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" size="sm" disabled={pending}>Save settings</Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const r = await adminRefreshDispensaries();
              setMsg({ ok: r.ok, text: r.message ?? "" });
            })
          }
        >
          Refresh dispensary list from PSM
        </Button>
        {msg && <span className={`text-sm ${msg.ok ? "text-green-700" : "text-red-600"}`}>{msg.text}</span>}
      </div>
    </form>
  );
}

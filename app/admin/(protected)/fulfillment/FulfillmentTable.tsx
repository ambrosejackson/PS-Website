"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ProviderRow } from "@/lib/commerce/providers.server";
import { madeToOrderLine } from "@/lib/commerce/providers";
import { saveProvider } from "./actions";

/**
 * One editable card per POD vendor (D-146): label, dashboard URL, production
 * window, active toggle, save. Mobile-first stack; two columns of fields from md.
 * The preview line is exactly what customers see on a product using this vendor.
 */
export function FulfillmentTable({ providers }: { providers: ProviderRow[] }) {
  return (
    <div className="space-y-4">
      {providers.map((p) => (
        <ProviderCard key={p.key} row={p} />
      ))}
    </div>
  );
}

function ProviderCard({ row }: { row: ProviderRow }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [status, setStatus] = useState<{ kind: "idle" } | { kind: "done" } | { kind: "error"; message: string }>({ kind: "idle" });

  const [label, setLabel] = useState(row.label);
  const [url, setUrl] = useState(row.dashboard_url ?? "");
  const [min, setMin] = useState(row.production_days_min == null ? "" : String(row.production_days_min));
  const [max, setMax] = useState(row.production_days_max == null ? "" : String(row.production_days_max));
  const [active, setActive] = useState(row.is_active);

  const toInt = (s: string) => (/^\d{1,3}$/.test(s.trim()) ? Number(s.trim()) : null);
  const preview = madeToOrderLine({ production_days_min: toInt(min), production_days_max: toInt(max) });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus({ kind: "idle" });
    start(async () => {
      const res = await saveProvider({
        key: row.key,
        label,
        dashboard_url: url,
        production_days_min: min,
        production_days_max: max,
        is_active: active,
      });
      if (!res.ok) {
        setStatus({ kind: "error", message: res.error });
        return;
      }
      setStatus({ kind: "done" });
      router.refresh();
    });
  }

  const id = (f: string) => `fp-${row.key}-${f}`;

  return (
    <form onSubmit={submit} className={`space-y-4 rounded border bg-white p-4 md:p-5 ${active ? "" : "opacity-80"}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold">{row.label}</h2>
          <code className="rounded bg-neutral-100 px-1.5 py-0.5 text-[11px] text-neutral-600">{row.key}</code>
        </div>
        <button
          type="button"
          onClick={() => setActive((v) => !v)}
          aria-pressed={active}
          className={`rounded px-3 py-1.5 text-xs font-bold uppercase tracking-wide ${active ? "bg-green-600 text-white hover:bg-green-700" : "bg-neutral-200 text-neutral-700 hover:bg-neutral-300"}`}
          title="Inactive vendors cannot be chosen for new products; products already on them keep working."
        >
          {active ? "Active" : "Inactive"}
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor={id("label")}>Label (admin only)</Label>
          <Input id={id("label")} value={label} onChange={(e) => setLabel(e.target.value)} maxLength={80} required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={id("url")}>Dashboard URL</Label>
          <div className="flex gap-2">
            <Input id={id("url")} value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" inputMode="url" className="font-mono text-xs" />
            {/^https:\/\//.test(url) && (
              <a href={url} target="_blank" rel="noreferrer" className="shrink-0 self-center text-xs font-semibold underline">
                Open ↗
              </a>
            )}
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={id("min")}>Production days — min</Label>
          <Input id={id("min")} value={min} onChange={(e) => setMin(e.target.value)} inputMode="numeric" placeholder="e.g. 3" className="w-28" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={id("max")}>Production days — max</Label>
          <Input id={id("max")} value={max} onChange={(e) => setMax(e.target.value)} inputMode="numeric" placeholder="e.g. 7" className="w-28" />
        </div>
      </div>

      <p className="text-xs text-neutral-500">
        Customers see: <span className="font-semibold text-neutral-800">{preview}</span>
        {toInt(min) === null || toInt(max) === null ? " — set both day values to show a window." : ""}
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Saving…" : "Save"}
        </Button>
        {status.kind === "done" && <p className="text-sm text-green-700">Saved. Product pages on this vendor were refreshed.</p>}
        {status.kind === "error" && <p className="text-sm text-red-600">{status.message}</p>}
      </div>
    </form>
  );
}

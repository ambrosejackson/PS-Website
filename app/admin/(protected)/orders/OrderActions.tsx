"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FULFILLMENT_LABEL } from "@/components/site/OrderSummary";
import { saveInternalNote, saveTracking, setFulfillmentStatus, setRefundFlag, type FulfillmentStatus } from "./actions";

const FLOW: FulfillmentStatus[] = ["new", "placed_with_provider", "packed", "shipped", "delivered"];

export function OrderActions({
  id,
  fulfillmentStatus,
  status,
  tracking,
  note,
  addressText,
  hasProviderItems,
}: {
  id: string;
  fulfillmentStatus: string;
  status: string;
  tracking: { carrier?: string; number?: string; url?: string | null } | null;
  note: string | null;
  addressText: string;
  hasProviderItems: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [carrier, setCarrier] = useState(tracking?.carrier ?? "");
  const [number, setNumber] = useState(tracking?.number ?? "");
  const [url, setUrl] = useState(tracking?.url ?? "");
  const [notify, setNotify] = useState(true);
  const [internal, setInternal] = useState(note ?? "");
  const [copied, setCopied] = useState(false);

  function run(fn: () => Promise<{ ok: boolean; error?: string }>, okMsg: string) {
    setErr(null);
    setMsg(null);
    start(async () => {
      const r = await fn();
      if (!r.ok) setErr(r.error ?? "Failed.");
      else setMsg(okMsg);
      router.refresh();
    });
  }

  const idx = FLOW.indexOf(fulfillmentStatus as FulfillmentStatus);
  const next = idx >= 0 && idx < FLOW.length - 1 ? FLOW[idx + 1] : null;

  return (
    <div className="space-y-5">
      <div className="space-y-2 rounded border bg-white p-4">
        <Label>Fulfillment status</Label>
        <div className="flex flex-wrap gap-2">
          {FLOW.map((s) => (
            <button
              key={s}
              type="button"
              disabled={pending}
              onClick={() => run(() => setFulfillmentStatus(id, s), `Marked ${FULFILLMENT_LABEL[s]}.`)}
              className={`rounded px-3 py-1.5 text-xs font-semibold ${
                s === fulfillmentStatus ? "bg-neutral-900 text-white" : "border bg-white text-neutral-700 hover:bg-neutral-100"
              } ${s === "placed_with_provider" && !hasProviderItems ? "opacity-50" : ""}`}
              title={s === "placed_with_provider" && !hasProviderItems ? "No Printify/Tapstitch items on this order" : ""}
            >
              {FULFILLMENT_LABEL[s]}
            </button>
          ))}
          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => setFulfillmentStatus(id, "canceled"), "Marked canceled.")}
            className={`rounded px-3 py-1.5 text-xs font-semibold ${fulfillmentStatus === "canceled" ? "bg-red-600 text-white" : "border text-red-700 hover:bg-red-50"}`}
          >
            Canceled
          </button>
        </div>
        {next && (
          <Button size="sm" disabled={pending} onClick={() => run(() => setFulfillmentStatus(id, next), `Advanced to ${FULFILLMENT_LABEL[next]}.`)}>
            Advance → {FULFILLMENT_LABEL[next]}
          </Button>
        )}
      </div>

      <div className="space-y-2 rounded border bg-white p-4">
        <div className="flex items-center justify-between">
          <Label>Shipping address</Label>
          <button
            type="button"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(addressText);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              } catch {
                setErr("Clipboard blocked — select the address and copy manually.");
              }
            }}
            className="rounded border px-2 py-1 text-xs hover:bg-neutral-100"
          >
            {copied ? "Copied ✓" : "Copy address"}
          </button>
        </div>
        <pre className="whitespace-pre-wrap rounded bg-neutral-50 p-3 text-sm">{addressText || "—"}</pre>
        <p className="text-xs text-neutral-500">Paste straight into the Printify / Tapstitch order form.</p>
      </div>

      <div className="space-y-2 rounded border bg-white p-4">
        <Label>Tracking</Label>
        <div className="grid gap-2 md:grid-cols-[140px_1fr]">
          <Input value={carrier} onChange={(e) => setCarrier(e.target.value)} placeholder="USPS / UPS / FedEx" />
          <Input value={number} onChange={(e) => setNumber(e.target.value)} placeholder="Tracking number" className="font-mono" />
        </div>
        <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Tracking URL (optional — auto for USPS/UPS/FedEx/DHL)" className="text-xs" />
        <label className="flex items-center gap-2 text-xs text-neutral-600">
          <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} /> email the customer the shipping
          notification
        </label>
        <Button
          size="sm"
          disabled={pending || !carrier.trim() || !number.trim()}
          onClick={() =>
            run(
              () => saveTracking(id, { carrier, number, url: url || null, notify }),
              notify ? "Tracking saved, marked shipped, customer emailed." : "Tracking saved, marked shipped.",
            )
          }
        >
          Save tracking & mark shipped
        </Button>
        {tracking?.number && (
          <p className="text-xs text-neutral-500">
            Current: {tracking.carrier} {tracking.url ? <a href={tracking.url} target="_blank" rel="noreferrer" className="underline">{tracking.number}</a> : tracking.number}
          </p>
        )}
      </div>

      <div className="space-y-2 rounded border bg-white p-4">
        <Label htmlFor="o-note">Internal note</Label>
        <textarea id="o-note" value={internal} onChange={(e) => setInternal(e.target.value)} rows={3} className="w-full rounded-md border px-3 py-2 text-sm" />
        <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => saveInternalNote(id, internal), "Note saved.")}>
          Save note
        </Button>
      </div>

      <div className="space-y-2 rounded border border-red-200 bg-red-50/40 p-4">
        <Label>Refund marker</Label>
        <p className="text-xs text-neutral-600">
          Manual flag only — issue the actual refund in the <strong>Stripe</strong> or <strong>PayPal</strong> dashboard, then mark it here.
        </p>
        {status === "refunded" ? (
          <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => setRefundFlag(id, false), "Refund flag cleared.")}>
            Clear refund flag
          </Button>
        ) : (
          <Button size="sm" variant="destructive" disabled={pending} onClick={() => run(() => setRefundFlag(id, true), "Marked refunded.")}>
            Mark as refunded
          </Button>
        )}
      </div>

      {msg && <p className="text-sm text-green-700">{msg}</p>}
      {err && <p className="text-sm text-red-700">{err}</p>}
    </div>
  );
}

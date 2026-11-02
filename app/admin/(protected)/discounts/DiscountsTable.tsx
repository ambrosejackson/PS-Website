"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DISCOUNT_STATUS_LABEL } from "@/lib/commerce/discount-codes";
import type { DiscountListRow } from "@/lib/commerce/discounts";
import { shortOrderId } from "@/components/site/OrderSummary";
import { expireDiscount } from "./actions";

const DASH = "—";

function fmtDate(iso: string | null): string {
  if (!iso) return DASH;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "America/Chicago" });
}

const TONE: Record<DiscountListRow["status"], string> = {
  open: "bg-amber-100 text-amber-800",
  redeemed: "bg-green-100 text-green-800",
  expired: "bg-neutral-200 text-neutral-700",
};

export function DiscountsTable({ rows }: { rows: DiscountListRow[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [target, setTarget] = useState<DiscountListRow | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  function confirmExpire() {
    if (!target) return;
    const row = target;
    setMsg(null);
    start(async () => {
      const r = await expireDiscount(row.id);
      setTarget(null);
      if (r.ok) {
        const note = r.data.alreadyExpired ? "was already expired" : "expired";
        setMsg({ ok: true, text: `${row.code} ${note}${r.data.stripeDeactivated ? "; Stripe promotion code deactivated" : ""}.` });
      } else {
        setMsg({ ok: false, text: r.error });
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      {msg && <p className={`text-sm ${msg.ok ? "text-green-700" : "text-red-600"}`}>{msg.text}</p>}
      {rows.length === 0 ? (
        <p className="rounded border border-dashed p-6 text-sm text-neutral-400">No codes match.</p>
      ) : (
        <div className="overflow-x-auto rounded border bg-white">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-neutral-500">
              <tr>
                <th className="px-3 py-2">Code</th>
                <th className="px-3 py-2 text-right">%</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Subscriber</th>
                <th className="px-3 py-2">Created</th>
                <th className="px-3 py-2">Expires</th>
                <th className="px-3 py-2">Redeemed</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-neutral-50">
                  <td className="px-3 py-2 font-mono font-medium">{r.code}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{r.pct}%</td>
                  <td className="px-3 py-2">
                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${TONE[r.status]}`}>
                      {DISCOUNT_STATUS_LABEL[r.status]}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs">{r.subscriberEmail ?? DASH}</td>
                  <td className="px-3 py-2 text-xs text-neutral-600">{fmtDate(r.createdAt)}</td>
                  <td className="px-3 py-2 text-xs text-neutral-600">{fmtDate(r.expiresAt)}</td>
                  <td className="px-3 py-2 text-xs text-neutral-600">
                    {r.redeemedAt ? (
                      <>
                        {fmtDate(r.redeemedAt)}
                        {r.redeemedOrderId && (
                          <>
                            {" · "}
                            <Link href={`/admin/orders/${r.redeemedOrderId}`} className="font-mono hover:underline">
                              #{shortOrderId(r.redeemedOrderId)}
                            </Link>
                          </>
                        )}
                      </>
                    ) : (
                      DASH
                    )}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {r.status === "open" && (
                      <Button size="sm" variant="ghost" className="text-red-600" disabled={pending} onClick={() => setTarget(r)}>
                        Expire now
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={target !== null} onOpenChange={(open) => !open && setTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Expire {target?.code}?</DialogTitle>
            <DialogDescription>
              The code stops working immediately, here and on Stripe&rsquo;s checkout page. This cannot be undone; issue a
              new code instead.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTarget(null)} disabled={pending}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmExpire} disabled={pending}>
              {pending ? "Expiring…" : "Expire now"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

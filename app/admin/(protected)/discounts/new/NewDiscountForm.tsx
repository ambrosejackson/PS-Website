"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { toCsv } from "@/lib/csv";
import { createDiscounts } from "../actions";

interface Result {
  codes: string[];
  pct: number;
  expiresAt: string | null;
  error?: string;
}

const MAX_COUNT = 50;

export function NewDiscountForm({ today }: { today: string }) {
  const [pending, start] = useTransition();
  const [pct, setPct] = useState("15");
  const [count, setCount] = useState("1");
  const [expiresOn, setExpiresOn] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [copied, setCopied] = useState(false);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCopied(false);
    start(async () => {
      const r = await createDiscounts({ pct, count, expiresOn });
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setResult(r.data);
    });
  }

  async function copyAll() {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.codes.join("\n"));
      setCopied(true);
    } catch {
      setError("Clipboard unavailable; select the codes and copy them.");
    }
  }

  function downloadCsv() {
    if (!result) return;
    const expires = result.expiresAt ? result.expiresAt.slice(0, 10) : "";
    const csv = toCsv(
      ["code", "pct", "expires"],
      result.codes.map((c) => [c, result.pct, expires]),
    );
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `discount-codes-${result.pct}pct-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (result) {
    return (
      <div className="space-y-4 rounded border bg-white p-4">
        <div>
          <h2 className="font-condensed text-base font-bold uppercase tracking-tight">
            {result.codes.length} {result.codes.length === 1 ? "code" : "codes"} · {result.pct}% off
            {result.expiresAt && ` · expires ${result.expiresAt.slice(0, 10)}`}
          </h2>
          <p className="mt-1 text-xs text-neutral-500">
            Copy or download them now. They also appear on the Discounts list as Open codes.
          </p>
        </div>
        {result.error && <p className="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">{result.error}</p>}
        <pre className="max-h-80 overflow-auto rounded border bg-neutral-50 p-3 font-mono text-sm leading-6">
          {result.codes.join("\n")}
        </pre>
        <div className="flex flex-wrap gap-2">
          <Button onClick={copyAll} disabled={result.codes.length === 0}>
            {copied ? "Copied" : "Copy all"}
          </Button>
          <Button variant="outline" onClick={downloadCsv} disabled={result.codes.length === 0}>
            Download CSV
          </Button>
          <Button variant="ghost" render={<Link href="/admin/discounts" />}>
            Back to Discounts
          </Button>
        </div>
      </div>
    );
  }

  const inputCls = "mt-1 h-9 w-full rounded-md border bg-white px-3 text-sm";
  return (
    <form onSubmit={submit} className="max-w-md space-y-4 rounded border bg-white p-4">
      <div className="grid grid-cols-2 gap-3">
        <label className="text-xs font-medium text-neutral-700">
          Percent off
          <input type="number" min={1} max={100} step={1} required value={pct} onChange={(e) => setPct(e.target.value)} className={inputCls} />
        </label>
        <label className="text-xs font-medium text-neutral-700">
          How many (1–{MAX_COUNT})
          <input type="number" min={1} max={MAX_COUNT} step={1} required value={count} onChange={(e) => setCount(e.target.value)} className={inputCls} />
        </label>
      </div>
      <label className="block text-xs font-medium text-neutral-700">
        Expires (optional, valid through that day, Chicago)
        <input type="date" min={today} value={expiresOn} onChange={(e) => setExpiresOn(e.target.value)} className={inputCls} />
      </label>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Creating…" : "Create codes"}
        </Button>
        <Button variant="ghost" render={<Link href="/admin/discounts" />}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

import Link from "next/link";

/** Shared admin dashboard / analytics building blocks (D-139, D-141). Server-safe. */

export const DASH = "—";

export function Panel({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded border bg-white p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="font-condensed text-base font-bold uppercase tracking-tight">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function Kpi({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded border bg-white p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-neutral-500">{sub}</p>}
    </div>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="rounded border border-dashed p-4 text-sm text-neutral-400">{children}</p>;
}

export function plural(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}

/** Small uppercase link used as a panel action ("All orders", "Export CSV"). */
export function PanelLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="text-xs font-semibold uppercase tracking-wide text-neutral-600 hover:underline">
      {children}
    </Link>
  );
}

export function fmtInt(n: number): string {
  return n.toLocaleString("en-US");
}

export function fmtPct(rate: number | null, digits = 1): string {
  return rate === null ? DASH : `${(rate * 100).toFixed(digits)}%`;
}

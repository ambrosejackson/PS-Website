import Link from "next/link";
import { chicagoDayKey } from "@/lib/admin/chicago";
import {
  analyticsSearch,
  BRAND_FILTER_LABEL,
  BRAND_FILTERS,
  getAnalytics,
  parseAnalyticsParams,
  RAW_RETENTION_DAYS,
  VISITOR_ID_SINCE,
  type AnalyticsData,
  type AnalyticsParams,
} from "@/lib/admin/analytics";
import { DASH, Empty, fmtInt, fmtPct, Kpi, Panel, PanelLink } from "@/components/admin/panels";
import { TrafficChart } from "@/components/admin/TrafficChart";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const PRESETS: { key: "7d" | "30d" | "90d"; label: string }[] = [
  { key: "7d", label: "7d" },
  { key: "30d", label: "30d" },
  { key: "90d", label: "90d" },
];

const UNAVAILABLE = `Not available beyond ${RAW_RETENTION_DAYS} days (daily rollups only)`;

function exportHref(p: AnalyticsParams, table: string): string {
  return `/api/admin/analytics/export?${analyticsSearch(p, { table })}`;
}

function Controls({ p }: { p: AnalyticsParams }) {
  return (
    <form method="get" className="flex flex-wrap items-center gap-2 rounded border bg-white p-3">
      <div role="group" aria-label="Range" className="inline-flex rounded border bg-neutral-50 p-0.5 text-xs">
        {PRESETS.map((r) => (
          <Link
            key={r.key}
            href={`/admin/analytics?${analyticsSearch({ ...p, range: r.key }, {})}`}
            aria-current={p.range === r.key ? "page" : undefined}
            className={cn(
              "rounded px-2.5 py-1 font-medium text-neutral-600 hover:text-neutral-900",
              p.range === r.key && "bg-white text-neutral-900 shadow-sm",
            )}
          >
            {r.label}
          </Link>
        ))}
      </div>
      <label className="flex items-center gap-1 text-xs text-neutral-600">
        From
        <input type="date" name="from" defaultValue={p.range === "custom" ? p.from : ""} className="h-8 rounded-md border px-2 text-xs" />
      </label>
      <label className="flex items-center gap-1 text-xs text-neutral-600">
        To
        <input type="date" name="to" defaultValue={p.range === "custom" ? p.to : ""} className="h-8 rounded-md border px-2 text-xs" />
      </label>
      <select name="brand" defaultValue={p.brand} className="h-8 rounded-md border bg-white px-2 text-xs">
        {BRAND_FILTERS.map((b) => (
          <option key={b} value={b}>
            {BRAND_FILTER_LABEL[b]}
          </option>
        ))}
      </select>
      <button type="submit" className="rounded bg-neutral-900 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-white">
        Apply
      </button>
      <Link href="/admin/analytics" className="text-xs text-neutral-500 underline">
        Reset
      </Link>
    </form>
  );
}

function Table({
  head,
  rows,
  empty,
}: {
  head: { label: string; numeric?: boolean }[];
  rows: (string | number)[][];
  empty: string;
}) {
  if (rows.length === 0) return <Empty>{empty}</Empty>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-left text-xs uppercase tracking-wide text-neutral-500">
          <tr>
            {head.map((h) => (
              <th key={h.label} className={cn("py-1.5 pr-3 font-medium", h.numeric && "text-right")}>
                {h.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t">
              {r.map((c, j) => (
                <td key={j} className={cn("max-w-[28rem] truncate py-1.5 pr-3", head[j]?.numeric && "text-right tabular-nums")}>
                  {typeof c === "number" ? fmtInt(c) : c || DASH}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Funnel({ data }: { data: AnalyticsData }) {
  const base = data.funnel[0]?.sessions ?? 0;
  if (data.funnel.every((f) => f.sessions === 0)) return <Empty>No funnel events in this window.</Empty>;
  return (
    <ol className="space-y-3">
      {data.funnel.map((f) => {
        const width = base > 0 ? Math.max(1, Math.round((f.sessions / base) * 100)) : 0;
        return (
          <li key={f.key}>
            <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
              <span>{f.label}</span>
              <span className="tabular-nums text-neutral-600">
                {fmtInt(f.sessions)}
                {f.dropOffPct !== null && <span className="ml-2 text-xs text-neutral-400">−{f.dropOffPct}%</span>}
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-neutral-100">
              <div className="h-2 rounded-full bg-neutral-800" style={{ width: `${width}%` }} />
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/** /admin/analytics — traffic, funnel and engagement over web_events / web_events_daily (D-141). */
export default async function AdminAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; from?: string; to?: string; brand?: string }>;
}) {
  const sp = await searchParams;
  const today = chicagoDayKey();
  const p = parseAnalyticsParams(sp, today);
  const data = await getAnalytics(p, today);
  const { totals, conversion } = data;
  const split =
    totals.newVisitors === null || totals.returningVisitors === null
      ? null
      : `${fmtInt(totals.newVisitors)} new · ${fmtInt(totals.returningVisitors)} returning`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-condensed text-2xl font-bold uppercase tracking-tight">Analytics</h1>
          <p className="mt-1 text-sm text-neutral-600">
            {BRAND_FILTER_LABEL[p.brand]} · {p.from} to {p.to} · Chicago days ·{" "}
            {data.source === "raw" ? "raw events" : "daily rollups"}
          </p>
        </div>
      </div>

      <Controls p={p} />

      {data.approximate && (
        <p className="rounded border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
          This window reaches past the {RAW_RETENTION_DAYS}-day raw retention, so it is served from daily rollups. Session and
          visitor counts are summed across pages and will overstate unique sessions. Referrers, UTM, devices and new vs returning
          are not available.
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <Kpi label="Visitors" value={fmtInt(totals.visitors)} sub={data.approximate ? "approximate" : "distinct visitor ids"} />
        <Kpi label="Sessions" value={fmtInt(totals.sessions)} sub={data.approximate ? "approximate" : "distinct sessions"} />
        <Kpi label="Page views" value={fmtInt(totals.pageviews)} />
        <Kpi
          label="New vs returning"
          value={split === null ? DASH : ""}
          sub={split ?? (p.from < VISITOR_ID_SINCE ? `visitor ids exist from ${VISITOR_ID_SINCE}` : "no visitors in window")}
        />
        <Kpi
          label="Conversion"
          value={fmtPct(conversion.rate)}
          sub={
            conversion.rate === null
              ? "no sessions"
              : `${fmtInt(conversion.purchaseSessions)} purchase of ${fmtInt(conversion.pageviewSessions)} sessions`
          }
        />
      </div>

      <Panel title="Traffic · daily sessions" action={<PanelLink href={exportHref(p, "daily")}>Export CSV</PanelLink>}>
        <TrafficChart
          points={data.daily.map((d) => ({ key: d.day, label: d.label, value: d.sessions }))}
          unit="sessions"
          todayKey={today}
        />
      </Panel>

      <Panel title="Funnel" action={<PanelLink href={exportHref(p, "funnel")}>Export CSV</PanelLink>}>
        <Funnel data={data} />
        <p className="mt-3 text-[11px] text-neutral-400">
          Distinct sessions reaching each step in the window; drop-off is relative to the previous step. Server-recorded purchases
          without a web session count toward Purchase only.
        </p>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Top pages" action={<PanelLink href={exportHref(p, "pages")}>Export CSV</PanelLink>}>
          <Table
            head={[{ label: "Path" }, { label: "Views", numeric: true }, { label: "Sessions", numeric: true }]}
            rows={data.topPages.map((r) => [r.path, r.pageviews, r.sessions])}
            empty="No page views in this window."
          />
        </Panel>

        <Panel title="Top referrers" action={<PanelLink href={exportHref(p, "referrers")}>Export CSV</PanelLink>}>
          {data.topReferrers === null ? (
            <Empty>{UNAVAILABLE}</Empty>
          ) : (
            <Table
              head={[{ label: "Host" }, { label: "Views", numeric: true }, { label: "Sessions", numeric: true }]}
              rows={data.topReferrers.map((r) => [r.host, r.pageviews, r.sessions])}
              empty="No outside referrers in this window."
            />
          )}
        </Panel>

        <Panel title="UTM campaigns" action={<PanelLink href={exportHref(p, "utm")}>Export CSV</PanelLink>}>
          {data.utmCampaigns === null ? (
            <Empty>{UNAVAILABLE}</Empty>
          ) : (
            <Table
              head={[
                { label: "Source" },
                { label: "Medium" },
                { label: "Campaign" },
                { label: "Views", numeric: true },
                { label: "Sessions", numeric: true },
              ]}
              rows={data.utmCampaigns.map((u) => [u.source, u.medium, u.campaign, u.pageviews, u.sessions])}
              empty="No tagged traffic in this window."
            />
          )}
        </Panel>

        <Panel title="Devices" action={<PanelLink href={exportHref(p, "devices")}>Export CSV</PanelLink>}>
          {data.devices === null ? (
            <Empty>{UNAVAILABLE}</Empty>
          ) : (
            <Table
              head={[{ label: "Device" }, { label: "Sessions", numeric: true }]}
              rows={[
                ["Mobile", data.devices.mobile],
                ["Tablet", data.devices.tablet],
                ["Desktop", data.devices.desktop],
                ["Unknown (pre-P2 events)", data.devices.unknown],
              ].filter((r) => (r[1] as number) > 0)}
              empty="No sessions in this window."
            />
          )}
        </Panel>

        <Panel title="Engagement · TerpKings" action={<PanelLink href={exportHref(p, "engagement")}>Export CSV</PanelLink>}>
          <div className="space-y-4">
            <Table
              head={[{ label: "Metric" }, { label: "Count", numeric: true }]}
              rows={[
                ["King selects", data.engagement.kingSelects],
                ["Comic preview opened", data.engagement.comicPreviewOpen],
                ["Comic preview completed", data.engagement.comicPreviewComplete],
              ]}
              empty="No engagement events."
            />
            <div>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">By king</h3>
                {data.engagement.kings !== null && <PanelLink href={exportHref(p, "kings")}>Export CSV</PanelLink>}
              </div>
              {data.engagement.kings === null ? (
                <Empty>{UNAVAILABLE}</Empty>
              ) : (
                <Table
                  head={[{ label: "King" }, { label: "Selects", numeric: true }]}
                  rows={data.engagement.kings.map((k) => [k.king, k.count])}
                  empty="No king selections in this window."
                />
              )}
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}

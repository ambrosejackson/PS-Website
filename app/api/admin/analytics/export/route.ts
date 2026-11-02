import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/events/staff";
import { getAnalytics, parseAnalyticsParams } from "@/lib/admin/analytics";
import { toCsv, type CsvValue } from "@/lib/csv";

/**
 * CSV export for /admin/analytics tables (D-141). API routes do not inherit
 * the (protected) layout, so this re-checks the admin allowlist itself via
 * requireAdmin() (D-129 pattern). Same ?range/?from/?to/?brand params as the
 * page plus ?table=<name>. Rows never include visitor or session ids.
 */
export const dynamic = "force-dynamic";

const TABLES = ["daily", "pages", "referrers", "utm", "devices", "funnel", "kings", "engagement"] as const;
type Table = (typeof TABLES)[number];

export async function GET(request: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const url = new URL(request.url);
  const table = url.searchParams.get("table") as Table | null;
  if (!table || !TABLES.includes(table)) {
    return NextResponse.json({ error: `table must be one of ${TABLES.join(", ")}` }, { status: 400 });
  }
  const params = parseAnalyticsParams({
    range: url.searchParams.get("range") ?? undefined,
    from: url.searchParams.get("from") ?? undefined,
    to: url.searchParams.get("to") ?? undefined,
    brand: url.searchParams.get("brand") ?? undefined,
  });
  const data = await getAnalytics(params);

  let header: string[];
  let rows: CsvValue[][];
  switch (table) {
    case "daily":
      header = ["day", "pageviews", "sessions", "visitors"];
      rows = data.daily.map((d) => [d.day, d.pageviews, d.sessions, d.visitors]);
      break;
    case "pages":
      header = ["path", "pageviews", "sessions"];
      rows = data.topPages.map((p) => [p.path, p.pageviews, p.sessions]);
      break;
    case "referrers":
      header = ["host", "pageviews", "sessions"];
      rows = (data.topReferrers ?? []).map((r) => [r.host, r.pageviews, r.sessions]);
      break;
    case "utm":
      header = ["utm_source", "utm_medium", "utm_campaign", "pageviews", "sessions"];
      rows = (data.utmCampaigns ?? []).map((u) => [u.source, u.medium, u.campaign, u.pageviews, u.sessions]);
      break;
    case "devices":
      header = ["device", "sessions"];
      rows = data.devices ? Object.entries(data.devices).map(([k, v]) => [k, v]) : [];
      break;
    case "funnel":
      header = ["step", "sessions", "drop_off_pct"];
      rows = data.funnel.map((f) => [f.label, f.sessions, f.dropOffPct]);
      break;
    case "kings":
      header = ["king", "selects"];
      rows = (data.engagement.kings ?? []).map((k) => [k.king, k.count]);
      break;
    case "engagement":
      header = ["metric", "count"];
      rows = [
        ["king_select", data.engagement.kingSelects],
        ["comic_preview_open", data.engagement.comicPreviewOpen],
        ["comic_preview_complete", data.engagement.comicPreviewComplete],
      ];
      break;
  }

  const name = `analytics-${table}-${params.brand}-${params.from}-${params.to}.csv`;
  return new NextResponse(toCsv(header, rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${name}"`,
      "Cache-Control": "no-store",
    },
  });
}

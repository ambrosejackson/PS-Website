"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AdminUploader, type UploadedMedia } from "@/lib/admin/upload";
import { computeHeroTheme, type HeroTheme } from "@/lib/luminance";
import { generateAndUploadPoster } from "@/lib/admin/video-poster";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { saveHeroRow } from "./actions";
import { HERO_PAGES, NAV_TARGETS } from "./hero-config";

/**
 * Add a hero: upload (shared AdminUploader → heroes bucket; PNG/JPG >300KB →
 * webp), theme auto-computed from the top band via lib/luminance.ts for
 * images (videos default to dark) with a manual override, default flag, and —
 * landing only — the nav hover target.
 */
export function HeroUploadForm({ defaultPage = "/" }: { defaultPage?: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [page, setPage] = useState<string>(defaultPage);
  const [media, setMedia] = useState<UploadedMedia | null>(null);
  const [autoTheme, setAutoTheme] = useState<HeroTheme | null>(null);
  const [themeOverride, setThemeOverride] = useState<HeroTheme | "">("");
  const [isDefault, setIsDefault] = useState(true);
  const [navTarget, setNavTarget] = useState<string>("");
  const [status, setStatus] = useState<{ kind: "idle" } | { kind: "done" } | { kind: "error"; message: string }>({ kind: "idle" });

  const landing = page === "/";
  const theme: HeroTheme = themeOverride || autoTheme || "dark";

  const [posterUrl, setPosterUrl] = useState<string | null>(null);
  const [posterState, setPosterState] = useState<"idle" | "working" | "ok" | "failed">("idle");

  async function onUploaded(m: UploadedMedia) {
    setMedia(m);
    setStatus({ kind: "idle" });
    setPosterUrl(null);
    if (m.kind === "image") {
      setPosterState("idle");
      try {
        setAutoTheme(await computeHeroTheme(m.url));
      } catch {
        setAutoTheme("dark");
      }
      return;
    }
    setAutoTheme("dark");
    // Video: capture the first frame now so the page can paint it before playback.
    setPosterState("working");
    try {
      const url = await generateAndUploadPoster(m.url, page === "/" ? "landing" : page.slice(1));
      setPosterUrl(url);
      setPosterState("ok");
    } catch {
      setPosterState("failed");
    }
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!media) {
      setStatus({ kind: "error", message: "Upload the image or MP4 first." });
      return;
    }
    start(async () => {
      const res = await saveHeroRow({
        page,
        mediaUrl: media.url,
        mediaType: media.kind,
        theme,
        isDefault: landing && navTarget ? false : isDefault,
        navTarget: landing ? navTarget || null : null,
        posterUrl,
      });
      if (!res.ok) {
        setStatus({ kind: "error", message: res.error });
        return;
      }
      setStatus({ kind: "done" });
      setMedia(null);
      setAutoTheme(null);
      setThemeOverride("");
      router.refresh();
    });
  }

  const selectCls = "h-9 w-full rounded-md border bg-white px-3 text-sm";

  return (
    <form onSubmit={submit} className="grid gap-4 rounded border bg-white p-5 md:grid-cols-2">
      <div className="space-y-1.5">
        <Label htmlFor="hero-page">Page</Label>
        <select id="hero-page" value={page} onChange={(e) => { setPage(e.target.value); setNavTarget(""); }} className={selectCls} disabled={pending}>
          {HERO_PAGES.map((p) => (
            <option key={p.page} value={p.page}>
              {p.label} — {p.page}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <Label>Theme (header text over this asset)</Label>
        <div className="flex items-center gap-2">
          <select value={themeOverride} onChange={(e) => setThemeOverride(e.target.value as HeroTheme | "")} className={selectCls} disabled={pending}>
            <option value="">Auto{autoTheme ? ` → ${autoTheme}` : " (computed on upload)"}</option>
            <option value="dark">Override: dark asset → WHITE header text</option>
            <option value="light">Override: light asset → BLACK header text</option>
          </select>
        </div>
        <p className="text-xs text-neutral-500">
          Auto = average luminance of the top band (lib/luminance.ts). Videos default to dark. Effective: <strong>{theme}</strong>.
        </p>
        {media?.kind === "video" && (
          <p className={`text-xs ${posterState === "failed" ? "text-amber-700" : "text-neutral-500"}`}>
            Poster (first frame):{" "}
            {posterState === "working" ? "capturing…" : posterState === "ok" ? "captured ✓ — painted before the video plays" : posterState === "failed" ? "capture failed — save anyway, then use Generate poster on the row" : "—"}
          </p>
        )}
      </div>

      <div className="md:col-span-2">
        <Label>Media (image ≤ 10 MB or MP4 ≤ 60 MB)</Label>
        <div className="mt-1.5">
          <AdminUploader bucket="heroes" folder={page === "/" ? "landing" : page.slice(1)} onUploaded={onUploaded} label="Drop hero image or MP4" />
        </div>
      </div>

      {landing ? (
        <div className="space-y-1.5">
          <Label htmlFor="hero-nav">Role on the landing page</Label>
          <select id="hero-nav" value={navTarget} onChange={(e) => setNavTarget(e.target.value)} className={selectCls} disabled={pending}>
            <option value="">Default (resting) hero</option>
            {NAV_TARGETS.map((t) => (
              <option key={t.value} value={t.value}>
                Hover target: {t.label}
              </option>
            ))}
          </select>
          <p className="text-xs text-neutral-500">
            Hovering the nav item swaps to this asset (~600 ms return; mobile always shows the default). One asset per target.
          </p>
        </div>
      ) : (
        <div />
      )}

      {!(landing && navTarget) && (
        <label className="flex items-center gap-2 self-end text-sm">
          <input type="checkbox" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} disabled={pending} />
          Make this the page&apos;s default (replaces the current default)
        </label>
      )}

      <div className="flex items-center gap-4 md:col-span-2">
        <Button type="submit" disabled={pending || !media}>
          {pending ? "Saving…" : "Save hero"}
        </Button>
        {status.kind === "done" && <p className="text-sm text-green-700">Saved and page revalidated.</p>}
        {status.kind === "error" && <p className="text-sm text-red-600">{status.message}</p>}
      </div>
    </form>
  );
}

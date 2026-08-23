"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { deleteHero, updateHero } from "./actions";
import { NAV_TARGETS } from "./hero-config";
import { generateAndUploadPoster } from "@/lib/admin/video-poster";

export function HeroRowActions({
  id,
  page,
  isDefault,
  isActive,
  theme,
  navTarget,
  mediaUrl,
  mediaType,
  posterUrl,
}: {
  id: string;
  page: string;
  isDefault: boolean;
  isActive: boolean;
  theme: string;
  navTarget: string | null;
  mediaUrl: string;
  mediaType: string;
  posterUrl: string | null;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [posterBusy, setPosterBusy] = useState(false);

  // One-time backfill for video rows saved before posters existed.
  async function generatePoster() {
    setError(null);
    setPosterBusy(true);
    try {
      const url = await generateAndUploadPoster(mediaUrl, page === "/" ? "landing" : page.slice(1));
      const res = await updateHero({ id, posterUrl: url });
      if (!res.ok) setError(res.error);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Poster capture failed.");
    } finally {
      setPosterBusy(false);
    }
  }

  function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    start(async () => {
      const res = await fn();
      if (!res.ok) setError(res.error ?? "Failed.");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {page === "/" && (
        <select
          value={navTarget ?? ""}
          disabled={pending}
          onChange={(e) => run(() => updateHero({ id, navTarget: e.target.value || null, ...(e.target.value ? {} : {}) }))}
          className="h-8 rounded-md border bg-white px-2 text-xs"
          title="Landing only: which nav hover shows this asset"
        >
          <option value="">no hover target</option>
          {NAV_TARGETS.map((t) => (
            <option key={t.value} value={t.value}>
              hover: {t.label}
            </option>
          ))}
        </select>
      )}
      {mediaType === "video" && !posterUrl && (
        <Button size="sm" variant="outline" disabled={pending || posterBusy} onClick={generatePoster} title="Capture the first frame as the poster painted before playback">
          {posterBusy ? "Capturing…" : "Generate poster"}
        </Button>
      )}
      {!isDefault && (
        <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => updateHero({ id, isDefault: true }))}>
          Make default
        </Button>
      )}
      <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => updateHero({ id, isActive: !isActive }))}>
        {isActive ? "Deactivate" : "Activate"}
      </Button>
      <Button
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() => run(() => updateHero({ id, theme: theme === "dark" ? "light" : "dark" }))}
        title="Manual theme override"
      >
        Theme → {theme === "dark" ? "light" : "dark"}
      </Button>
      {confirmDelete ? (
        <>
          <Button size="sm" variant="destructive" disabled={pending} onClick={() => run(() => deleteHero(id))}>
            Confirm delete
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(false)}>
            Cancel
          </Button>
        </>
      ) : (
        <Button size="sm" variant="ghost" className="text-red-600" disabled={pending} onClick={() => setConfirmDelete(true)}>
          Delete
        </Button>
      )}
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}

"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { deleteHero, updateHero } from "./actions";
import { NAV_TARGETS } from "./hero-config";
import { generateAndUploadPoster, uploadBlobToBucket } from "@/lib/admin/video-poster";

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
  hasAudio,
  audioAutoplay,
  audioVolume,
  mediaUrlMobile,
  videoLoop,
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
  hasAudio: boolean;
  audioAutoplay: boolean;
  audioVolume: number;
  mediaUrlMobile: string | null;
  videoLoop: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [posterBusy, setPosterBusy] = useState(false);
  const [mobileBusy, setMobileBusy] = useState(false);
  const [volume, setVolume] = useState(audioVolume);
  const mobileInput = useRef<HTMLInputElement>(null);

  const video = mediaType === "video";

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

  // MOBILE MEDIA: smaller encode served to phones via <source media> (D-054).
  async function uploadMobile(file: File) {
    setError(null);
    setMobileBusy(true);
    try {
      if (file.type !== "video/mp4") throw new Error("Mobile media must be an MP4.");
      const url = await uploadBlobToBucket("heroes", page === "/" ? "landing" : page.slice(1), file.name, file);
      const res = await updateHero({ id, mediaUrlMobile: url });
      if (!res.ok) setError(res.error);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Mobile upload failed.");
    } finally {
      setMobileBusy(false);
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

  function commitVolume(v: number) {
    const clamped = Math.min(100, Math.max(0, Math.round(v)));
    setVolume(clamped);
    if (clamped !== audioVolume) run(() => updateHero({ id, audioVolume: clamped }));
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
      {video && !posterUrl && (
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

      {/* ---- Playback (D-057): loop is per-asset; off = play once, hold last frame ---- */}
      {video && (
        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() => run(() => updateHero({ id, videoLoop: !videoLoop }))}
          title={
            videoLoop
              ? "Currently loops forever. Switch off to play through once and hold the final frame."
              : "Currently plays once. Switch on to loop forever."
          }
        >
          {videoLoop ? "Loop ✓" : "Loop off"}
        </Button>
      )}

      {/* ---- Hero audio (D-050): video rows only ---- */}
      {video && (
        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() => run(() => updateHero({ id, hasAudio: !hasAudio }))}
          title="This video carries a sound track (turning it off also turns autoplay audio off)"
        >
          {hasAudio ? "Has audio ✓" : "Has audio?"}
        </Button>
      )}
      {video && hasAudio && (
        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() => run(() => updateHero({ id, audioAutoplay: !audioAutoplay }))}
          title="Play the music bed on the page (default hero only; other heroes on the page are switched off automatically)"
        >
          {audioAutoplay ? "Audio → OFF" : "Audio → ON"}
        </Button>
      )}
      {video && audioAutoplay && (
        <label className="flex items-center gap-1 text-xs text-neutral-600" title="Playback volume 0–100 (never 1.0 — D6)">
          vol
          <input
            type="number"
            min={0}
            max={100}
            step={5}
            value={volume}
            disabled={pending}
            onChange={(e) => setVolume(Number(e.target.value))}
            onBlur={(e) => commitVolume(Number(e.target.value))}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitVolume(Number((e.target as HTMLInputElement).value));
            }}
            className="h-8 w-16 rounded-md border bg-white px-2 text-xs"
          />
        </label>
      )}
      {video && (
        <>
          <input
            ref={mobileInput}
            type="file"
            accept="video/mp4"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) uploadMobile(f);
              e.target.value = "";
            }}
          />
          <Button
            size="sm"
            variant="outline"
            disabled={pending || mobileBusy}
            onClick={() => mobileInput.current?.click()}
            title="Smaller encode served to phones via <source media='(max-width: 767px)'>"
          >
            {mobileBusy ? "Uploading…" : mediaUrlMobile ? "Mobile media ✓ (replace)" : "Mobile media"}
          </Button>
          {mediaUrlMobile && (
            <Button
              size="sm"
              variant="ghost"
              disabled={pending}
              onClick={() => run(() => updateHero({ id, mediaUrlMobile: null }))}
              title="Stop serving the mobile variant (desktop file serves everywhere)"
            >
              Clear mobile
            </Button>
          )}
        </>
      )}

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

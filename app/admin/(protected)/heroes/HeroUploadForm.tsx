"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createHeroUploadUrl, saveHeroRow } from "./actions";
import {
  HERO_ALLOWED_MIME,
  HERO_BUCKET,
  HERO_MAX_BYTES,
  HERO_PAGES,
} from "./hero-config";

/**
 * Upload a hero asset: (1) server action mints a signed upload URL, (2) the
 * browser PUTs the file straight to Supabase Storage, (3) server action writes
 * the content_heroes row and revalidates the page. Defaults target the
 * TerpKings CRT hero video (page "/terpkings", dark, default).
 */
export function HeroUploadForm({ defaultPage = "/terpkings" }: { defaultPage?: string }) {
  const router = useRouter();
  const [page, setPage] = useState<string>(defaultPage);
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [isDefault, setIsDefault] = useState(true);
  const [navTarget, setNavTarget] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<
    | { kind: "idle" }
    | { kind: "working"; step: string }
    | { kind: "done"; url: string }
    | { kind: "error"; message: string }
  >({ kind: "idle" });

  const busy = status.kind === "working";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setStatus({ kind: "error", message: "Choose a file first." });
      return;
    }
    if (!HERO_ALLOWED_MIME[file.type]) {
      setStatus({ kind: "error", message: `Unsupported type ${file.type || "(unknown)"}. Use MP4, JPEG, PNG or WebP.` });
      return;
    }
    if (file.size > HERO_MAX_BYTES) {
      setStatus({ kind: "error", message: `File is ${(file.size / 1048576).toFixed(1)} MB — the limit is 50 MB.` });
      return;
    }

    setStatus({ kind: "working", step: "Requesting upload slot…" });
    const slot = await createHeroUploadUrl({
      page,
      fileName: file.name,
      size: file.size,
      mime: file.type,
    });
    if (!slot.ok) {
      setStatus({ kind: "error", message: slot.error });
      return;
    }

    setStatus({
      kind: "working",
      step: `Uploading ${(file.size / 1048576).toFixed(1)} MB to Storage… (large videos can take a minute)`,
    });
    const supabase = createClient();
    const { error: upErr } = await supabase.storage
      .from(HERO_BUCKET)
      .uploadToSignedUrl(slot.data.path, slot.data.token, file, {
        contentType: file.type,
        upsert: false,
      });
    if (upErr) {
      setStatus({ kind: "error", message: `Upload failed: ${upErr.message}` });
      return;
    }

    setStatus({ kind: "working", step: "Saving hero row…" });
    const saved = await saveHeroRow({
      page,
      path: slot.data.path,
      mediaType: slot.data.mediaType,
      theme,
      isDefault,
      navTarget: navTarget.trim() || null,
    });
    if (!saved.ok) {
      setStatus({ kind: "error", message: saved.error });
      return;
    }
    setStatus({ kind: "done", url: saved.data.mediaUrl });
    setFile(null);
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="grid gap-4 rounded border bg-white p-5 md:grid-cols-2"
    >
      <div className="space-y-2">
        <Label htmlFor="hero-page">Page</Label>
        <select
          id="hero-page"
          value={page}
          onChange={(e) => setPage(e.target.value)}
          className="h-9 w-full rounded-md border bg-transparent px-3 text-sm"
          disabled={busy}
        >
          {HERO_PAGES.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <p className="text-xs text-neutral-500">
          Must match the route the page fetches (<code>getHeroesForPage(&quot;/terpkings&quot;)</code>).
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="hero-file">File (MP4 / JPEG / PNG / WebP, max 50 MB)</Label>
        <Input
          id="hero-file"
          type="file"
          accept="video/mp4,image/jpeg,image/png,image/webp"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          disabled={busy}
        />
        {file && (
          <p className="text-xs text-neutral-500">
            {file.name} · {(file.size / 1048576).toFixed(1)} MB · {file.type}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="hero-theme">Theme (header text over this asset)</Label>
        <select
          id="hero-theme"
          value={theme}
          onChange={(e) => setTheme(e.target.value as "light" | "dark")}
          className="h-9 w-full rounded-md border bg-transparent px-3 text-sm"
          disabled={busy}
        >
          <option value="dark">dark — dark asset, WHITE header text</option>
          <option value="light">light — bright asset, BLACK header text</option>
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="hero-nav">Nav hover target (optional)</Label>
        <Input
          id="hero-nav"
          placeholder="blank = default asset · or BRANDS / STORE LOCATOR / YOUR REWARDS"
          value={navTarget}
          onChange={(e) => setNavTarget(e.target.value)}
          disabled={busy}
        />
      </div>

      <label className="flex items-center gap-2 text-sm md:col-span-2">
        <input
          type="checkbox"
          checked={isDefault}
          onChange={(e) => setIsDefault(e.target.checked)}
          disabled={busy}
        />
        Set as the page&apos;s default hero (un-defaults any existing default for this page)
      </label>

      <div className="flex items-center gap-4 md:col-span-2">
        <Button type="submit" disabled={busy || !file}>
          {busy ? "Working…" : "Upload & publish"}
        </Button>
        {status.kind === "working" && (
          <p className="text-sm text-neutral-600">{status.step}</p>
        )}
        {status.kind === "done" && (
          <p className="text-sm text-green-700">
            Published.{" "}
            <a href={status.url} target="_blank" rel="noreferrer" className="underline">
              Open file
            </a>{" "}
            · the page was revalidated.
          </p>
        )}
        {status.kind === "error" && (
          <p className="text-sm text-red-600">{status.message}</p>
        )}
      </div>
    </form>
  );
}

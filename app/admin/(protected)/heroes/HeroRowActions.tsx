"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { deleteHero, updateHero } from "./actions";
import { NAV_TARGETS } from "./hero-config";

export function HeroRowActions({
  id,
  page,
  isDefault,
  isActive,
  theme,
  navTarget,
}: {
  id: string;
  page: string;
  isDefault: boolean;
  isActive: boolean;
  theme: string;
  navTarget: string | null;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

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

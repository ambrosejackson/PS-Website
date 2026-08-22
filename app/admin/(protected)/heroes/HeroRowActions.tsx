"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { deleteHero, updateHeroFlags } from "./actions";

export function HeroRowActions({
  id,
  isDefault,
  isActive,
  theme,
}: {
  id: string;
  isDefault: boolean;
  isActive: boolean;
  theme: string;
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
      {!isDefault && (
        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() => run(() => updateHeroFlags({ id, isDefault: true }))}
        >
          Make default
        </Button>
      )}
      <Button
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() => run(() => updateHeroFlags({ id, isActive: !isActive }))}
      >
        {isActive ? "Deactivate" : "Activate"}
      </Button>
      <Button
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() =>
          run(() =>
            updateHeroFlags({ id, theme: theme === "dark" ? "light" : "dark" }),
          )
        }
      >
        Theme → {theme === "dark" ? "light" : "dark"}
      </Button>
      {confirmDelete ? (
        <>
          <Button
            size="sm"
            variant="destructive"
            disabled={pending}
            onClick={() => run(() => deleteHero(id))}
          >
            Confirm delete
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(false)}>
            Cancel
          </Button>
        </>
      ) : (
        <Button
          size="sm"
          variant="ghost"
          className="text-red-600"
          disabled={pending}
          onClick={() => setConfirmDelete(true)}
        >
          Delete
        </Button>
      )}
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}

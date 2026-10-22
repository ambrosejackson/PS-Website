"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { FlipBook } from "@/components/site/FlipBook";

/**
 * The Catalog: the Brand Book flip-book in a full-screen overlay (D-021).
 * Dark backdrop, close X, ESC and backdrop-click to close, page scroll locked
 * while open. The book itself owns arrows / drag / keyboard page turns.
 * Also hosts the TerpKings comic preview (D-124) via `basePath`, `trailing`
 * and `theme="terpkings"` — same mechanics, amber chrome.
 */
export function CatalogModal({
  open,
  onClose,
  pageCount,
  aspectRatio,
  basePath,
  altPrefix,
  trailing,
  onTrailingReached,
  label = "Private Stock catalog",
  theme = "default",
}: {
  open: boolean;
  onClose: () => void;
  pageCount: number;
  aspectRatio: number;
  basePath?: string;
  altPrefix?: string;
  trailing?: React.ReactNode;
  onTrailingReached?: () => void;
  label?: string;
  theme?: "default" | "terpkings";
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[80] bg-neutral-950/95"
      // Backdrop close: anything outside the book panel (and the close button,
      // which closes anyway). pointerdown, so a drag that ENDS on the backdrop
      // after starting inside the book does not close the overlay.
      onPointerDown={(e) => {
        if (!panelRef.current?.contains(e.target as Node)) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className="flex h-full flex-col"
      >
        <div className="flex shrink-0 justify-end p-4">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className={`p-2 transition-opacity hover:opacity-60 ${theme === "terpkings" ? "text-[#FFB000]" : "text-white"}`}
          >
            <X className="h-7 w-7" strokeWidth={1.25} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 pb-10 md:px-16">
          {/* FlipBook constrains itself to the book's own width, so clicks to
              the left/right of it land on this scroller = backdrop = close. */}
          <FlipBook
            rootRef={panelRef}
            pageCount={pageCount}
            aspectRatio={aspectRatio}
            basePath={basePath}
            altPrefix={altPrefix}
            trailing={trailing}
            onTrailingReached={onTrailingReached}
            fitViewport
            autoFocus
            globalKeys
            captionClassName={theme === "terpkings" ? "tk-mono text-[#8A9E5C]" : "text-white/50"}
          />
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { FlipBook } from "@/components/site/FlipBook";
import { Button } from "@/components/ui/button";

/**
 * Brand Book as a POP-OUT (docx: "make it pop-out into a book format"):
 * inline cover preview; clicking opens a full-screen overlay with the
 * page-flip book (arrows on each side, drag/touch, keyboard).
 */
export function BrandBookSection({
  pageCount,
  aspectRatio,
}: {
  pageCount: number;
  aspectRatio: number;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <div className="flex flex-col items-center">
        <button
          onClick={() => setOpen(true)}
          aria-label="Open the brand book"
          className="group block w-44 md:w-56"
          style={{ aspectRatio: String(aspectRatio) }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand-book/page-01.jpg"
            alt="Private Stock Brand Book cover"
            className="h-full w-full object-contain shadow-xl transition-transform duration-300 group-hover:scale-[1.03]"
          />
        </button>
        <Button
          onClick={() => setOpen(true)}
          className="mt-6 bg-ink font-condensed text-xs font-semibold uppercase tracking-wide text-white hover:bg-ink/85"
        >
          Open the Brand Book
        </Button>
      </div>

      {open && (
        <div className="fixed inset-0 z-[75] flex flex-col bg-neutral-950/95">
          <div className="flex justify-end p-4">
            <button
              onClick={() => setOpen(false)}
              aria-label="Close brand book"
              className="p-2 text-white transition-opacity hover:opacity-60"
            >
              <X className="h-7 w-7" strokeWidth={1.25} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-6 pb-10 md:px-16 [&_p]:text-white/60">
            <FlipBook pageCount={pageCount} aspectRatio={aspectRatio} />
          </div>
        </div>
      )}
    </>
  );
}

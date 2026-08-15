"use client";

import { useMemo, useRef, useState, useSyncExternalStore } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * Flip-book catalog (build plan §6): Brand Book PDF pages pre-rendered to
 * images by scripts/render-brand-book.mjs. Page-turn via arrows, drag, touch,
 * or keyboard. Two-page spread on desktop, single page on mobile.
 */

const TURN_MS = 600;
const DRAG_THRESHOLD_PX = 60;
const DESKTOP_QUERY = "(min-width: 768px)";

function subscribeToViewport(callback: () => void) {
  const mq = window.matchMedia(DESKTOP_QUERY);
  mq.addEventListener("change", callback);
  return () => mq.removeEventListener("change", callback);
}

function pageSrc(pageIndex: number) {
  return `/brand-book/page-${String(pageIndex + 1).padStart(2, "0")}.jpg`;
}

type Spread = { left: number | null; right: number | null };

export function FlipBook({
  pageCount,
  aspectRatio,
}: {
  pageCount: number;
  /** Single-page width / height ratio from the render manifest. */
  aspectRatio: number;
}) {
  const isDesktop = useSyncExternalStore(
    subscribeToViewport,
    () => window.matchMedia(DESKTOP_QUERY).matches,
    () => true,
  );

  const spreads = useMemo<Spread[]>(() => {
    if (!isDesktop) {
      return Array.from({ length: pageCount }, (_, i) => ({
        left: null,
        right: i,
      }));
    }
    const result: Spread[] = [{ left: null, right: 0 }]; // cover
    for (let i = 1; i < pageCount; i += 2) {
      result.push({ left: i, right: i + 1 < pageCount ? i + 1 : null });
    }
    return result;
  }, [pageCount, isDesktop]);

  const [spread, setSpread] = useState(0);
  const [turning, setTurning] = useState<"next" | "prev" | null>(null);
  const dragStartX = useRef<number | null>(null);
  const current = spreads[Math.min(spread, spreads.length - 1)];

  const canNext = spread < spreads.length - 1 && turning === null;
  const canPrev = spread > 0 && turning === null;

  function turn(dir: "next" | "prev") {
    if (dir === "next" ? !canNext : !canPrev) return;
    if (!isDesktop) {
      // Mobile: instant page swap, no 3D flap.
      setSpread((s) => s + (dir === "next" ? 1 : -1));
      return;
    }
    setTurning(dir);
    setTimeout(() => {
      setSpread((s) => s + (dir === "next" ? 1 : -1));
      setTurning(null);
    }, TURN_MS);
  }

  function onPointerDown(e: React.PointerEvent) {
    dragStartX.current = e.clientX;
  }
  function onPointerUp(e: React.PointerEvent) {
    if (dragStartX.current === null) return;
    const delta = e.clientX - dragStartX.current;
    dragStartX.current = null;
    if (delta <= -DRAG_THRESHOLD_PX) turn("next");
    else if (delta >= DRAG_THRESHOLD_PX) turn("prev");
  }

  const target = turning === "next" ? spreads[spread + 1] : spreads[spread - 1];
  // During a turn the flap covers the moving half; the resting layer keeps the
  // static half on its old page and pre-shows the incoming page underneath the flap.
  const restLeft = turning === "prev" ? (target?.left ?? null) : current.left;
  const restRight = turning === "next" ? (target?.right ?? null) : current.right;

  const pageStyle = { aspectRatio: String(aspectRatio) };

  function renderPage(pageIndex: number | null, side: "left" | "right") {
    return (
      <div
        className={`relative ${isDesktop ? "w-1/2" : "w-full"} ${
          pageIndex === null ? "" : "bg-white shadow-inner"
        }`}
        style={pageStyle}
      >
        {pageIndex !== null && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={pageSrc(pageIndex)}
            alt={`Brand book page ${pageIndex + 1}`}
            loading="lazy"
            className={`absolute inset-0 h-full w-full object-contain ${
              side === "left" ? "rounded-l-sm" : "rounded-r-sm"
            }`}
          />
        )}
      </div>
    );
  }

  // Flap faces: turning next flips the current right page over to reveal the
  // next spread's left page; turning prev flips the current left page back.
  const flapFront = turning === "next" ? current.right : current.left;
  const flapBack =
    turning === "next" ? (target?.left ?? null) : (target?.right ?? null);

  return (
    <div className="select-none">
      <div
        role="region"
        aria-label="Brand book catalog"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") turn("next");
          if (e.key === "ArrowLeft") turn("prev");
        }}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        className="relative mx-auto flex max-w-3xl cursor-grab touch-pan-y items-center justify-center outline-none [perspective:2400px]"
      >
        {/* Resting layer */}
        <div className="flex w-full shadow-2xl">
          {isDesktop && renderPage(restLeft, "left")}
          {renderPage(restRight, "right")}
        </div>

        {/* Turning flap */}
        {turning && isDesktop && flapFront !== null && (
          <div
            className="absolute top-0 h-full w-1/2 [transform-style:preserve-3d]"
            style={{
              left: turning === "next" ? "50%" : "0",
              transformOrigin:
                turning === "next" ? "left center" : "right center",
              animation: `${turning === "next" ? "ps-flip-next" : "ps-flip-prev"} ${TURN_MS}ms ease-in-out forwards`,
            }}
          >
            <div className="absolute inset-0 bg-white [backface-visibility:hidden]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={pageSrc(flapFront)}
                alt=""
                className="h-full w-full object-contain"
              />
            </div>
            <div className="absolute inset-0 bg-white [backface-visibility:hidden] [transform:rotateY(180deg)]">
              {flapBack !== null && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={pageSrc(flapBack)}
                  alt=""
                  className="h-full w-full object-contain"
                />
              )}
            </div>
          </div>
        )}

        {/* Mobile turn = quick fade handled by resting layer swap */}

        <button
          aria-label="Previous page"
          onClick={() => turn("prev")}
          disabled={!canPrev}
          className="absolute -left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 shadow transition-opacity disabled:opacity-30 md:-left-14"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          aria-label="Next page"
          onClick={() => turn("next")}
          disabled={!canNext}
          className="absolute -right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 shadow transition-opacity disabled:opacity-30 md:-right-14"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      <p className="mt-4 text-center text-xs tracking-widest text-neutral-400">
        {isDesktop && current.left !== null
          ? `PAGES ${current.left + 1}–${current.right !== null ? current.right + 1 : current.left + 1}`
          : `PAGE ${(current.right ?? 0) + 1}`}{" "}
        OF {pageCount} · DRAG OR USE ARROWS
      </p>

      {/* Preload neighbours so turns don't flash */}
      <div className="hidden">
        {[spread - 1, spread + 1]
          .filter((i) => i >= 0 && i < spreads.length)
          .flatMap((i) => [spreads[i].left, spreads[i].right])
          .filter((p): p is number => p !== null)
          .map((p) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={p} src={pageSrc(p)} alt="" />
          ))}
      </div>
    </div>
  );
}

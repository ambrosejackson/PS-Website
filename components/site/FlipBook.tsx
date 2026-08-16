"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * Flip-book catalog (build plan §6): Brand Book PDF pages pre-rendered to
 * images by scripts/render-brand-book.mjs. Page-turn via arrows, drag, touch,
 * or keyboard. Two-page spread on desktop, single page on mobile.
 *
 * DRAG (D-021 fix): a single pointer-event stream — pointerdown/move/up/cancel
 * with setPointerCapture — not separate mouse/touch handlers. The previous pass
 * listened for pointerdown/up only, with no capture and no `draggable={false}`,
 * so the browser's native image drag hijacked the gesture and the pointerup
 * never arrived: drag silently did nothing. The book now follows the pointer
 * and snaps forward/back on release past DRAG_THRESHOLD_PX; anything shorter
 * springs back, which is what keeps a click from reading as a drag.
 */

const TURN_MS = 600;
const DRAG_THRESHOLD_PX = 48;
/** Movement before we commit the gesture to an axis (vertical = let it scroll). */
const AXIS_LOCK_PX = 6;
/** How far the book can be pulled past the first/last spread. */
const OVERDRAG_FACTOR = 0.15;
const MAX_DRAG_PX = 160;
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
type Drag = { id: number; x: number; y: number; axis: "none" | "x" | "y" };

export function FlipBook({
  pageCount,
  aspectRatio,
  fitViewport = false,
  autoFocus = false,
  globalKeys = false,
  captionClassName = "text-neutral-400",
  rootRef,
}: {
  pageCount: number;
  /** Single-page width / height ratio from the render manifest. */
  aspectRatio: number;
  /** Cap the book's width so a full spread fits the viewport height (modal). */
  fitViewport?: boolean;
  /** Focus the book on mount so keyboard arrows work immediately. */
  autoFocus?: boolean;
  /** Also turn pages on window-level arrow keys (modal, where it owns the page). */
  globalKeys?: boolean;
  captionClassName?: string;
  rootRef?: React.Ref<HTMLDivElement>;
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
  const [dragDx, setDragDx] = useState(0);
  const drag = useRef<Drag | null>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const turnTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Viewport swap (desktop ⇄ mobile) re-buckets pages into different spreads.
  const spreadIndex = Math.min(spread, spreads.length - 1);
  const current = spreads[spreadIndex];

  const canNext = spreadIndex < spreads.length - 1 && turning === null;
  const canPrev = spreadIndex > 0 && turning === null;

  const turn = useCallback(
    (dir: "next" | "prev") => {
      if (turning !== null) return;
      const next = spreadIndex + (dir === "next" ? 1 : -1);
      if (next < 0 || next > spreads.length - 1) return;
      if (!isDesktop) {
        setSpread(next); // Mobile: instant page swap, no 3D flap.
        return;
      }
      // Desktop: hold the current spread while the 3D flap animates.
      setTurning(dir);
      turnTimer.current = setTimeout(() => {
        setSpread(next);
        setTurning(null);
      }, TURN_MS);
    },
    [turning, spreadIndex, spreads.length, isDesktop],
  );

  useEffect(
    () => () => {
      if (turnTimer.current) clearTimeout(turnTimer.current);
    },
    [],
  );

  useEffect(() => {
    if (autoFocus) viewportRef.current?.focus();
  }, [autoFocus]);

  useEffect(() => {
    if (!globalKeys) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") turn("next");
      else if (e.key === "ArrowLeft") turn("prev");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [globalKeys, turn]);

  // ----- drag: one pointer stream, captured, axis-locked, snap on release -----

  function endDrag(el: HTMLElement) {
    const d = drag.current;
    drag.current = null;
    setDragDx(0);
    try {
      if (d && el.hasPointerCapture(d.id)) el.releasePointerCapture(d.id);
    } catch {
      // Pointer already gone (cancel/leave) — nothing to release.
    }
  }

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (turning !== null) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY, axis: "none" };
    // Capture: the rest of the gesture is delivered here even if the pointer
    // leaves the book (or the page images below it).
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Non-capturable pointer — the drag still tracks, just uncaptured.
    }
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;

    if (d.axis === "none") {
      if (Math.abs(dx) < AXIS_LOCK_PX && Math.abs(dy) < AXIS_LOCK_PX) return;
      d.axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
      if (d.axis === "y") {
        endDrag(e.currentTarget); // vertical intent — hand it back to the scroller
        return;
      }
    }
    if (d.axis !== "x") return;

    const blocked = (dx < 0 && !canNext) || (dx > 0 && !canPrev);
    const pulled = blocked ? dx * OVERDRAG_FACTOR : dx;
    setDragDx(Math.max(-MAX_DRAG_PX, Math.min(MAX_DRAG_PX, pulled)));
  }

  function onPointerUp(e: React.PointerEvent<HTMLDivElement>) {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const dx = e.clientX - d.x;
    const axis = d.axis;
    endDrag(e.currentTarget);
    if (axis !== "x") return; // below the threshold in both axes = a click
    if (dx <= -DRAG_THRESHOLD_PX) turn("next");
    else if (dx >= DRAG_THRESHOLD_PX) turn("prev");
  }

  function onPointerCancel(e: React.PointerEvent<HTMLDivElement>) {
    if (drag.current?.id === e.pointerId) endDrag(e.currentTarget);
  }

  const dragging = dragDx !== 0;

  const target =
    turning === "next" ? spreads[spreadIndex + 1] : spreads[spreadIndex - 1];
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
            draggable={false}
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

  // Modal sizing: cap the book so a whole spread (2 pages wide on desktop,
  // 1 on mobile) fits the viewport height without scrolling.
  const bookRatio = isDesktop ? aspectRatio * 2 : aspectRatio;
  const maxWidth = fitViewport
    ? `calc((100svh - 11rem) * ${bookRatio})`
    : undefined;

  return (
    <div ref={rootRef} className="mx-auto w-full select-none" style={{ maxWidth }}>
      <div
        ref={viewportRef}
        role="region"
        aria-label="Brand book catalog"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") turn("next");
          if (e.key === "ArrowLeft") turn("prev");
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        // Kill the browser's native image/selection drag, which otherwise
        // swallows the pointer stream mid-gesture.
        onDragStart={(e) => e.preventDefault()}
        className={`relative flex w-full touch-pan-y items-center justify-center outline-none [perspective:2400px] ${
          dragging ? "cursor-grabbing" : "cursor-grab"
        }`}
      >
        {/* Resting layer — follows the pointer while dragging, springs back on release */}
        <div
          className="flex w-full shadow-2xl"
          style={{
            transform: `translateX(${dragDx}px)`,
            transition: dragging ? "none" : "transform 250ms ease-out",
          }}
        >
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
                draggable={false}
                className="h-full w-full object-contain"
              />
            </div>
            <div className="absolute inset-0 bg-white [backface-visibility:hidden] [transform:rotateY(180deg)]">
              {flapBack !== null && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={pageSrc(flapBack)}
                  alt=""
                  draggable={false}
                  className="h-full w-full object-contain"
                />
              )}
            </div>
          </div>
        )}

        {/* Arrows sit inside the drag surface — stop the gesture starting on them. */}
        <button
          aria-label="Previous page"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => turn("prev")}
          disabled={!canPrev}
          className="absolute -left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 shadow transition-opacity disabled:opacity-30 md:-left-14"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          aria-label="Next page"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => turn("next")}
          disabled={!canNext}
          className="absolute -right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 shadow transition-opacity disabled:opacity-30 md:-right-14"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      <p
        className={`mt-4 text-center text-xs tracking-widest ${captionClassName}`}
      >
        {isDesktop && current.left !== null
          ? `PAGES ${current.left + 1}–${current.right !== null ? current.right + 1 : current.left + 1}`
          : `PAGE ${(current.right ?? 0) + 1}`}{" "}
        OF {pageCount} · DRAG OR USE ARROWS
      </p>

      {/* Preload neighbours so turns don't flash */}
      <div className="hidden">
        {[spreadIndex - 1, spreadIndex + 1]
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

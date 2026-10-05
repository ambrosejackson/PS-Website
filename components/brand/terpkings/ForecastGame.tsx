"use client";

import { useEffect, useRef, useState } from "react";
import {
  ROUNDS,
  accuracyPct,
  bandFor,
  predict,
  type ForecastBand,
  type Move,
} from "@/lib/terpkings/forecast";
import { trackEvent } from "@/components/site/Analytics";

/**
 * Beat the Forecast — Sur'Haze's mini-game (PRD King Origins §7), a terminal
 * overlay styled after the TERPKINGS OS age gate. Loaded by dynamic import only
 * when RUN FORECAST TEST is clicked.
 *
 * 40 inputs. Before each one the machine's forecast is committed (held in
 * state, shown as a locked glyph) and revealed after the input. Lower forecast
 * accuracy is better for the player. No server state (D6): the best result
 * lives in localStorage. Silent — it never touches video or audio.
 *
 * Modal: focus is trapped while open, Esc / EXIT closes, and focus returns to
 * whatever opened it.
 */

/** EDIT ME: all game copy. Premise + result lines are the PRD §7 drafts (Ambrose to approve). */
export const FORECAST_COPY = {
  header: "TERPKINGS OS v2.6 — FORECAST TEST",
  title: "> BEAT THE FORECAST_",
  premise:
    "The Chairman’s machine forecasts frightened minds. Sur’Haze kept a piece of the one that ended Venus. Make 40 choices. Stay unpredictable.",
  begin: "[ BEGIN TEST ]",
  left: "◄ LEFT",
  right: "RIGHT ►",
  keys: "KEYS: ← → OR A D · ESC TO EXIT",
  locked: "FORECAST LOCKED",
  again: "[ RUN AGAIN ]",
  share: "[ SHARE ]",
  copied: "COPIED TO CLIPBOARD",
  exit: "[ EXIT ]",
} as const;

/** EDIT ME: result line per band (thresholds live in lib/terpkings/forecast.ts). */
export const RESULT_COPY: Record<ForecastBand["bucket"], string> = {
  "0-50": "Forecast broken",
  "51-60": "Forecast strained",
  "61-100": "The Chairman saw you coming.",
};

/** EDIT ME: share text. */
const shareText = (pct: number, result: string) =>
  `Beat the Forecast: the machine called ${pct}% of my ${ROUNDS} moves. ${result} — TerpKings`;

const BEST_KEY = "tk:forecast-best";
const MOVE_LABEL: Record<Move, string> = { L: "LEFT", R: "RIGHT" };

function readBest(): number | null {
  try {
    const raw = localStorage.getItem(BEST_KEY);
    const n = raw === null ? NaN : Number(raw);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

function writeBest(pct: number) {
  try {
    localStorage.setItem(BEST_KEY, String(pct));
  } catch {
    /* storage unavailable — the result still shows for this game */
  }
}

interface Game {
  phase: "intro" | "play" | "done";
  history: Move[];
  /** Per input: did the forecast call it? */
  calls: boolean[];
  /** The committed forecast for the NEXT input — set before the player moves. */
  forecast: Move | null;
  last: { forecast: Move; move: Move } | null;
  best: number | null;
  newBest: boolean;
}

const INTRO: Game = {
  phase: "intro",
  history: [],
  calls: [],
  forecast: null,
  last: null,
  best: null,
  newBest: false,
};

const btn =
  "tk-mono flex-1 cursor-pointer rounded-[4px] py-3 text-[22px] tracking-[.1em] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D8F26E]";

export function ForecastGame({ onClose }: { onClose: () => void }) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [game, setGame] = useState<Game>(INTRO);
  const [copied, setCopied] = useState(false);

  const start = () => {
    setCopied(false);
    trackEvent("forecast_start");
    setGame({ ...INTRO, phase: "play", forecast: predict([]), best: readBest() });
  };

  const input = (move: Move) => {
    const g = game;
    if (g.phase !== "play" || !g.forecast) return;
    const history = [...g.history, move];
    const calls = [...g.calls, g.forecast === move];
    const last = { forecast: g.forecast, move };
    if (history.length < ROUNDS) {
      // Commit the next forecast now, before the player's next input.
      setGame({ ...g, history, calls, last, forecast: predict(history) });
      return;
    }
    const finalPct = accuracyPct(calls.filter(Boolean).length);
    const newBest = g.best === null || finalPct < g.best;
    if (newBest) writeBest(finalPct);
    // Accuracy bucket only — the input sequence never leaves the browser.
    trackEvent("forecast_complete", { accuracy: bandFor(finalPct).bucket });
    setGame({
      ...g,
      phase: "done",
      history,
      calls,
      last,
      forecast: null,
      best: newBest ? finalPct : g.best,
      newBest,
    });
  };
  // Latest handler for the document key listener (re-bound every render).
  const inputRef = useRef(input);
  useEffect(() => {
    inputRef.current = input;
  });

  const hits = game.calls.filter(Boolean).length;
  const pct = accuracyPct(hits);
  const pctText = Math.round(pct);
  const result = RESULT_COPY[bandFor(pct).bucket];

  // Modal behaviour: remember the opener, lock page scroll, restore both on close.
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
      opener?.focus?.();
    };
  }, []);

  // Each screen change moves focus to that screen's primary control.
  useEffect(() => {
    panelRef.current?.querySelector<HTMLElement>("[data-autofocus]")?.focus();
  }, [game.phase]);

  // Keys: Esc exits; ←/→ and A/D play; Tab is trapped inside the panel.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === "Tab") {
        const nodes = panelRef.current?.querySelectorAll<HTMLElement>("button:not([disabled])");
        if (!nodes || nodes.length === 0) return;
        const first = nodes[0];
        const lastNode = nodes[nodes.length - 1];
        const activeEl = document.activeElement;
        if (!panelRef.current?.contains(activeEl)) {
          e.preventDefault();
          first.focus();
        } else if (e.shiftKey && activeEl === first) {
          e.preventDefault();
          lastNode.focus();
        } else if (!e.shiftKey && activeEl === lastNode) {
          e.preventDefault();
          first.focus();
        }
        return;
      }
      if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (k === "arrowleft" || k === "a") {
        e.preventDefault();
        inputRef.current("L");
      } else if (k === "arrowright" || k === "d") {
        e.preventDefault();
        inputRef.current("R");
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const share = async () => {
    const text = shareText(pctText, result);
    const url = `${window.location.origin}/terpkings`;
    try {
      if (typeof navigator.share === "function") {
        await navigator.share({ text, url });
        return;
      }
    } catch (err) {
      if ((err as Error)?.name === "AbortError") return; // visitor dismissed the sheet
    }
    try {
      await navigator.clipboard.writeText(`${text} ${url}`);
      setCopied(true);
    } catch {
      /* no share and no clipboard — nothing else to do */
    }
  };

  return (
    <div
      className="tk-mono fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto p-4"
      style={{ background: "rgba(3,4,2,.96)" }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="tk-forecast-title"
    >
      <div
        ref={panelRef}
        className="relative w-full max-w-[480px] overflow-hidden rounded-lg border-2 border-[#3A4A22] bg-[#0B0F07] px-5 py-7 md:px-9 md:py-10"
        style={{ boxShadow: "0 0 60px rgba(168,198,78,.15), inset 0 0 40px rgba(0,0,0,.8)" }}
      >
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "repeating-linear-gradient(0deg, rgba(0,0,0,.3) 0px, rgba(0,0,0,.3) 2px, transparent 2px, transparent 4px)",
          }}
        />
        <div className="tk-grain pointer-events-none absolute inset-0 rounded-[inherit] opacity-50" />

        <div className="relative flex flex-col gap-[14px]">
          <div className="flex items-start justify-between gap-3">
            <div className="text-[16px] tracking-[.1em] text-[#5B6E35]">{FORECAST_COPY.header}</div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close forecast test"
              className="tk-mono tk-btn-ghost -mr-2 -mt-2 flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-[4px] text-[22px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#D8F26E]"
            >
              ✕
            </button>
          </div>
          <div id="tk-forecast-title" className="tk-hum text-[30px] leading-[1.2] text-[#A8C64E]">
            {FORECAST_COPY.title}
          </div>

          {game.phase === "intro" && (
            <>
              <div className="text-[19px] leading-[1.5] text-[#8A9E5C]">{FORECAST_COPY.premise}</div>
              <div className="mt-2 flex">
                <button type="button" data-autofocus onClick={start} className={`${btn} tk-btn-solid`}>
                  {FORECAST_COPY.begin}
                </button>
              </div>
            </>
          )}

          {game.phase === "play" && (
            <>
              <div className="flex justify-between text-[19px] tracking-[.1em] text-[#8A9E5C]">
                <span>
                  INPUT {String(game.history.length + 1).padStart(2, "0")} / {ROUNDS}
                </span>
                <span>FORECAST HITS: {hits}</span>
              </div>

              {/* The forecast for THIS input is already committed — shown locked until you move. */}
              <div className="flex items-center justify-between gap-3 rounded-[4px] border border-[#3E5222] bg-[rgba(168,198,78,.06)] px-4 py-3">
                <span className="text-[19px] tracking-[.1em] text-[#A8C64E]">{FORECAST_COPY.locked}</span>
                <span aria-hidden="true" className="text-[26px] leading-none tracking-[.2em] text-[#FFB000]">
                  ▓▓▓
                </span>
              </div>

              <div aria-live="polite" className="min-h-[52px] text-[19px] leading-[1.35] text-[#8A9E5C]">
                {game.last ? (
                  <>
                    LAST: FORECAST {MOVE_LABEL[game.last.forecast]} · YOU {MOVE_LABEL[game.last.move]}
                    <br />
                    {game.last.forecast === game.last.move ? (
                      <span className="text-[#FF2E2E]">&gt; THE MACHINE CALLED IT.</span>
                    ) : (
                      <span className="text-[#D8F26E]">&gt; FORECAST MISSED.</span>
                    )}
                  </>
                ) : (
                  <>&gt; AWAITING FIRST INPUT_</>
                )}
              </div>

              <Tally calls={game.calls} />

              <div className="mt-1 flex gap-3">
                <button type="button" data-autofocus onClick={() => input("L")} className={`${btn} tk-btn-solid`}>
                  {FORECAST_COPY.left}
                </button>
                <button type="button" onClick={() => input("R")} className={`${btn} tk-btn-solid`}>
                  {FORECAST_COPY.right}
                </button>
              </div>
              <div className="text-center text-[15px] tracking-[.1em] text-[#5B6E35]">{FORECAST_COPY.keys}</div>
            </>
          )}

          {game.phase === "done" && (
            <>
              <div aria-live="polite" className="flex flex-col gap-1">
                <div className="text-[19px] tracking-[.1em] text-[#8A9E5C]">
                  THE MACHINE CALLED {hits} OF {ROUNDS} — {pctText}%
                </div>
                <div className="text-[28px] leading-[1.2] text-[#D8F26E]">&gt; {result.toUpperCase()}</div>
                <div className="text-[17px] tracking-[.1em] text-[#5B6E35]">
                  {game.newBest ? "NEW BEST. " : ""}
                  {game.best !== null ? `BEST: ${Math.round(game.best)}% (LOWER IS BETTER)` : ""}
                </div>
              </div>

              <Tally calls={game.calls} />

              <div className="mt-1 flex gap-3">
                <button type="button" data-autofocus onClick={start} className={`${btn} tk-btn-solid`}>
                  {FORECAST_COPY.again}
                </button>
                <button type="button" onClick={share} className={`${btn} tk-btn-ghost`}>
                  {FORECAST_COPY.share}
                </button>
              </div>
              <div className="flex">
                <button type="button" onClick={onClose} className={`${btn} tk-btn-ghost`}>
                  {FORECAST_COPY.exit}
                </button>
              </div>
              <div aria-live="polite" className="min-h-[18px] text-center text-[15px] tracking-[.1em] text-[#5B6E35]">
                {copied ? FORECAST_COPY.copied : ""}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/** 40 cells: red = the forecast called that input, green = it missed. */
function Tally({ calls }: { calls: boolean[] }) {
  return (
    <div aria-hidden="true" className="grid grid-cols-[repeat(20,minmax(0,1fr))] gap-[3px]">
      {Array.from({ length: ROUNDS }, (_, i) => (
        <span
          key={i}
          className="h-[10px] rounded-[1px]"
          style={{
            background:
              i >= calls.length ? "rgba(168,198,78,.12)" : calls[i] ? "#FF2E2E" : "#A8C64E",
          }}
        />
      ))}
    </div>
  );
}

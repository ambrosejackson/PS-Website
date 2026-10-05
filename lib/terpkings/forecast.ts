/**
 * Beat the Forecast — the predictor and scoring (PRD King Origins §7).
 * Pure functions, no React, no DOM: unit-tested by forecast.test.mjs
 * (`npm test`). Keep this file to erasable TypeScript syntax and relative
 * imports so Node can run it directly.
 */

export type Move = "L" | "R";

/** Inputs per game. */
export const ROUNDS = 40;
/** Longest context: the last 5 inputs (2^5 = 32 contexts). */
export const MAX_CONTEXT = 5;

/**
 * Forecast the next input from everything played so far.
 *
 * For the longest context first (the last 5 inputs), count what followed that
 * same run every earlier time it appeared. A majority is the forecast; a tie or
 * no history backs off to a shorter context (4, 3, 2, 1), then to a coin flip.
 */
export function predict(history: readonly Move[], rand: () => number = Math.random): Move {
  const n = history.length;
  for (let k = Math.min(MAX_CONTEXT, n - 1); k >= 1; k--) {
    let left = 0;
    let right = 0;
    // Every earlier position where the k inputs before it match the last k.
    for (let i = k; i < n; i++) {
      let match = true;
      for (let j = 1; j <= k; j++) {
        if (history[i - j] !== history[n - j]) {
          match = false;
          break;
        }
      }
      if (!match) continue;
      if (history[i] === "L") left++;
      else right++;
    }
    if (left !== right) return left > right ? "L" : "R";
  }
  return rand() < 0.5 ? "L" : "R";
}

/** Share of inputs the forecast called correctly, 0–100 (unrounded). */
export function accuracyPct(hits: number, rounds: number = ROUNDS): number {
  return rounds > 0 ? (hits / rounds) * 100 : 0;
}

export interface ForecastBand {
  /** Analytics bucket — the only score detail that is ever recorded. */
  bucket: "0-50" | "51-60" | "61-100";
  /** Inclusive upper bound of forecast accuracy, in percent. */
  maxPct: number;
}

/** EDIT ME: result thresholds (tunable). Lower forecast accuracy = better for the player. */
export const BAND_BROKEN: ForecastBand = { bucket: "0-50", maxPct: 50 };
export const BAND_STRAINED: ForecastBand = { bucket: "51-60", maxPct: 60 };
export const BAND_SEEN: ForecastBand = { bucket: "61-100", maxPct: 100 };
export const FORECAST_BANDS: readonly ForecastBand[] = [BAND_BROKEN, BAND_STRAINED, BAND_SEEN];

export function bandFor(pct: number): ForecastBand {
  return FORECAST_BANDS.find((b) => pct <= b.maxPct) ?? BAND_SEEN;
}

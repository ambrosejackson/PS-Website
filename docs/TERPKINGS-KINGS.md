# TerpKings Kings — chart data and games

How to edit the FILE 03 star chart and how to add a game to a King's dossier. Decisions: `docs/DECISIONS.md` D-099 to D-114.

## Where things live

| What | File |
|---|---|
| Chart data (worlds, distances, line styles, `hasGame`) | `lib/terpkings/kings.ts` |
| Dossier copy, King videos and posters | `lib/terpkings-content.ts` (`KINGS`) |
| FILE 03 section, shared selection, game trigger | `components/brand/terpkings/TKDossiers.tsx` |
| Star chart drawing and layout | `components/brand/terpkings/StarChart.tsx` |
| Beat the Forecast overlay and its copy | `components/brand/terpkings/ForecastGame.tsx` |
| Predictor and result thresholds | `lib/terpkings/forecast.ts` |
| Predictor tests (`npm test`) | `lib/terpkings/forecast.test.mjs` |

## Editing `kings.ts`

Each entry in `KING_WORLDS` is one King's world.

- `id` must equal that King's `slotId` in `lib/terpkings-content.ts` (`king-gas`, `king-haze`, `king-dessert`, `king-fruit`, `king-floral`). Rename both or neither. Keep the array in the same order as `KINGS`.
- `name`, `world`, `star`, `constellation` are labels. The chart shows "WORLD / STAR" on desktop and the star (or the world, when there is no star) on phones. The screen-reader label is "King {name} — {world / star}, {distance}".
- `distance` is data, not text:
  - `{ kind: "range", min, max, unit: "light-minutes", approx? }` for inner-band worlds. `approx: true` adds a leading "~".
  - `{ kind: "value", value, unit: "light-years" }` for outer-band worlds. The value places the world on the log axis automatically (10 to 10,000 ly).
- `band` is `"inner"` or `"outer"`.
- `line` picks the line style: `ember`, `solid`, `meteor`, `moon-end`, `moon-route`.
- Optional: `earthMarker` (a second marker hung off Earth), `observationNote` (the tag under an unconfirmed world), `travelToggle` (the light-time / craft-time button in the readout).

Changing a distance or a label needs no other edit. Moving an inner-band world or a label on the chart is done in `StarChart.tsx` (`INNER_X`, `WORLD_Y`, `LABELS`; each holds a phone value and a desktop value).

Earth's color is the `EARTH_COLOR` constant at the top of `StarChart.tsx`.

## Editing the game

- Copy: `FORECAST_COPY` (premise, buttons) and `RESULT_COPY` (the three result lines) at the top of `ForecastGame.tsx`. The share text is `shareText` in the same file.
- Thresholds: `BAND_BROKEN`, `BAND_STRAINED`, `BAND_SEEN` in `lib/terpkings/forecast.ts`. If you change a `maxPct`, update the band test in `forecast.test.mjs` and run `npm test`.
- Number of inputs: `ROUNDS`. Predictor memory: `MAX_CONTEXT`.

## Adding a future game via `hasGame`

Today `hasGame: true` on a King shows the RUN FORECAST TEST button in that King's dossier, and there is only one game. To add a second one:

1. Build the game as its own component in `components/brand/terpkings/`, taking `{ onClose }` like `ForecastGame`. Keep pure game logic in `lib/terpkings/` with a test.
2. In `kings.ts`, replace the boolean with a game key, for example `game?: "forecast" | "parity"`, and set it on the King.
3. In `TKDossiers.tsx`, add a `next/dynamic` import for the new component (`ssr: false`), choose the button label and the component from the King's `game` key, and render it where `ForecastGame` renders now. Loading on click keeps the game out of the page's initial JavaScript.
4. Send events with `trackEvent` from `components/site/Analytics.tsx`. Record a result bucket only, never the raw inputs.
5. Keep it silent, and do not touch `TKKingVideo` or the hero audio.

## Analytics events

| `event_type` | `element` (JSON string) |
|---|---|
| `king_select` | `{"king":"king-haze","source":"chart"}` — source is `chart`, `tab` or `arrow` |
| `forecast_start` | empty |
| `forecast_complete` | `{"accuracy":"0-50"}` — or `51-60`, `61-100` |

Nothing is sent before the visitor accepts analytics cookies.

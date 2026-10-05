# PRD — TerpKings King Origins: Star Chart + "Beat the Forecast"

*Rev 2 · 2026-10-04 · Status: ALL BLOCKING QUESTIONS ANSWERED, AWAITING "PROCEED" · Repo: PS-Website (`dev`) · No DB changes, no PSM contact*
*Rev 2 changes: Floraxa keeps the Bermuda seabed garden; existing King videos + dossiers replace portraits and on-map bios; no counsel review; placement decided from a review of live `/terpkings` (§3).*

## 0. Context

Brainstormed in chat 2026-10-04. Ambrose chose a star chart plus one mini-game (Sur'Haze, "Beat the Forecast") and moved Floraxa's home world to **Mars** (humanity's original home world). Production `/terpkings` already ships **FILE 03 // CLASSIFIED DOSSIERS — TerpKings History & Lore**: a per-King video (`/brand-assets/terpkings/kings/king-*.mp4`, TAP FOR SOUND), a five-King selector (▸ KING …), long-form dossier text, and ←/→ paging.

## 1. Problem

The dossiers tell each King's origin in text and video, but nothing shows where the five worlds actually are relative to Earth, and the section gives visitors nothing to do beyond reading.

## 2. Decisions

| # | Decision | Source |
|---|---|---|
| D1 | **Floraxa's home world = Mars; the Bermuda seabed garden survives.** Time-travel element dropped. | Ambrose, 2026-10-04 |
| D2 | **v1 = star chart + one game (Beat the Forecast).** Other game concepts parked (§9). | Ambrose |
| D3 | **Worlds rendered in the single TerpKings green.** Earth the only off-color node. | Proposed, §8 Q1 |
| D4 | **Two-band scale with a labeled break:** inner band (Venus, Earth, Moon, Mars) in light-minutes; outer band (Arcturus, 55 Cancri, Kepler-51) log-scaled in light-years. | Proposed |
| D5 | **King chart data is a static config** (`lib/terpkings/kings.ts`). Dossier copy stays wherever it lives today. | Proposed |
| D6 | **No server state for the game:** no leaderboard, accounts, or rewards points. | Proposed |
| D7 | **The chart lives inside FILE 03 as the King selector**, not as a new section. Selecting a world selects that King (video + dossier swap exactly as the ▸ tabs do today). The ▸ tab list stays as the accessible text selector; chart, tabs, and ←/→ share one selection state. | Proposed (§3) |
| D8 | **The game opens as a terminal overlay** ("TERPKINGS OS" styling, matching the age gate) from a **RUN FORECAST TEST** control in Sur'Haze's dossier. Code loads on click only. | Proposed (§3) |
| D9 | **No counsel review** before merge. | Ambrose |
| D10 | **The King videos are the character visuals.** The chart adds no portraits and no bios; the dossier carries the story. | Ambrose |

## 3. Placement — why inside FILE 03

Live page order today: Hero → FILE 01 Arsenal → FILE 04 Terp-Scanner → FILE 02 Graphic Novel → FILE 03 Dossiers → FILE 05 Merch → FILE 06 Locator → Signal feed → Join the court.

Options considered:
- **A. Chart becomes FILE 03's selector (chosen).** One place for origins, no duplicate King picker, chart has a job (navigation) instead of being decoration. Deep-links into existing content.
- **B. New section directly above FILE 03.** Two King selectors stacked; clicking a world would have to scroll and drive the dossier anyway. Rejected as redundant.
- **C. Per-King inset inside each dossier showing only that King's line.** Loses the whole point (seeing all five scales at once). Rejected.
- **D. Inside FILE 04 Terp-Scanner** (profiles are already King-keyed). Mixes chemistry with cosmology; Scanner is already dense. Rejected.

Game: an overlay keeps a 40-tap game out of the reading flow, costs nothing until opened, and fits the page's existing terminal motif.

**Layout:** desktop — chart as the navigation console beside or above the video, dossier text below as today. Mobile (375px) — compact chart (~260px tall) on top, video, then text. Exact arrangement set after Claude Code reads the current FILE 03 component.

## 4. World reference

| King | World | Distance | Line treatment |
|---|---|---|---|
| Sur'Haze | Venus | 2–14.5 light-min | Thin solid line; dim ember node with an offset translucent duplicate |
| Floraxa | Mars | ~3–22 light-min | Solid line to Mars **plus** a short line from Earth's surface down to a Bermuda seabed garden marker |
| Fruvian | EdenRoot / Arcturus (Boötes) | 36.7 ly | Animated meteor-streak dashes toward Earth (Quadrantids) |
| Gaz'Rax | Forge Nexus / 55 Cancri e | 41 ly | Line ends at the Moon station (the still); world shown as a vapor smudge, "no confirmed observation" |
| Dulcir | Velvetreach / Kepler-51 (Cygnus) | 2,600 ly | Routes through the Moon station; toggle "light: 2,600 years ↔ Afim craft: 20 minutes" |

Venus and Mars flank Earth as the two lost neighbor worlds; the inner band should make the pairing obvious. Moon = Council station hub ring.

## 5. Success criteria

Targets marked *(h)* are hypotheses checked at 30 days.

1. Zero bytes added to `/terpkings` initial JS; chart loads by dynamic import when FILE 03 nears the viewport; game chunk loads on click. Chart chunk ≤ 35 KB gzipped.
2. No LCP regression (Lighthouse mobile, ≤ +100 ms vs. pre-PR baseline on the Vercel preview).
3. Chart, ▸ tabs, and ←/→ always agree on the selected King; selecting via any of them swaps video + dossier identically to today.
4. Keyboard-only and screen-reader usable; chart nodes are real buttons labelled with King, world, and distance.
5. `prefers-reduced-motion`: no camera tween, no meteor animation.
6. Selecting a King never starts video sound on its own; existing TAP FOR SOUND behavior unchanged; game is silent.
7. ≥ 25% of `/terpkings` sessions select a King via the chart *(h)*; ≥ 60% of game starts reach the result screen *(h)*.

## 6. Scope

**In**
- `lib/terpkings/kings.ts` — five Kings: id (matching the existing dossier/tab ids), world, constellation, distance (value or range + unit), line treatment, `hasGame`.
- `components/terpkings/StarChart.tsx` — SVG, D4 bands, Moon hub, §4 lines; select → short camera tween + distance counter + selection event.
- Shared selection state with the existing FILE 03 component (lift state; do not fork the dossier component).
- `components/terpkings/ForecastGame.tsx` in an overlay (§7); trigger in Sur'Haze's dossier only.
- `web_events` via the existing first-party helper and consent path: `king_select` (king id, source: chart|tab|arrow), `forecast_start`, `forecast_complete` (accuracy bucket).
- Decorative CRT layers stay `pointer-events: none` over the chart.
- `docs/DECISIONS.md` appended with D1–D10.

**Out:** see §9.

## 7. Beat the Forecast — rules

- **Premise copy (draft, Ambrose to approve):** "The Chairman's machine forecasts frightened minds. Sur'Haze kept a piece of the one that ended Venus. Make 40 choices. Stay unpredictable."
- **Input:** LEFT / RIGHT buttons; keyboard ←/→ and A/D. 40 inputs.
- **Predictor:** frequency table over the last 5 inputs (32 contexts), backing off to shorter contexts, then a coin flip. Client-side only.
- **Visible fairness:** forecast committed as a locked glyph before each input, revealed after.
- **Result bands (tunable):** ≤ 50% "Forecast broken"; 51–60% "Forecast strained"; > 60% "The Chairman saw you coming."
- **Replay** instant; best result in `localStorage` (try/catch). **Share** via Web Share API text + clipboard fallback. Esc / close button exits; focus trapped while open and restored on close.

## 8. Open questions

1. **Earth color** *(Ambrose, minor)* — off-color per D3, or green like the rest?
2. **Game premise + result copy** *(Ambrose)* — approve the §7 draft or rewrite.

## 9. Parked (not v1)

Quadrantid Run, Parity, Root Signal, Lunar Still, "Find Them Tonight" live sky, live Venus/Mars distances, URL deep links per King (`#king-sur-haze`), leaderboards, game audio.

## 10. Plan

| Step | Where | What |
|---|---|---|
| 1 | Ambrose | Answer §8; reply "proceed" |
| 2 | Claude Code, read-only | Read the FILE 03 dossier component, its selection state and video handling, CRT layers, `web_events` helper + consent path; capture Lighthouse baseline |
| 3 | Claude Code, `dev` | `kings.ts` → `StarChart` → shared selection → `ForecastGame` overlay → instrumentation → DECISIONS append |
| 4 | Vercel preview | Verify §5 criteria 1–6; tune game thresholds by playing it |
| 5 | Ambrose | PR `dev` → `main` |

**Rollback:** revert the PR. Nothing persistent is created.

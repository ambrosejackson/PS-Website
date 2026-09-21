# Handoff: Rewards Program Hero — privatestock.co

## Overview
Landing-page hero announcing the Private Stock Rewards program. Dark (pure black) section: left column = eyebrow pill, headline, subline, primary CTA + text link, three proof-point stats; right column = three floating UI cards (Black member card, Gold points card, "Early access unlocked" toast) that gently bob.

## About the Design Files
`Rewards Hero.dc.html` is a **design reference built in HTML** — a prototype showing intended look and behavior, not production code to paste in. Recreate it in the privatestock.co codebase using its existing stack, components and Tailwind theme (the site uses the PS Management theme: Poppins base font, black `primary`, pale-blue `secondary`/`accent` tokens). If the site has no framework yet, plain React + Tailwind is fine. The `_ds/` folder holds the theme tokens/fonts for reference.

The file contains two sections: (1) the **responsive hero** — implement this; (2) a fixed **1920×800 static banner** — same design at fixed size, only for image export; ignore unless a static image is needed.

## Fidelity
**High-fidelity.** Recreate pixel-accurately. Copy is final unless marketing changes it.

## Screen: Hero section

### Layout
- `<section>` full-width, `background:#000`, `color:#fff`, `position:relative; overflow:hidden`, `min-height:640px`.
- Padding: `clamp(56px,8vw,112px)` vertical, `clamp(24px,6vw,96px)` horizontal.
- CSS grid: `grid-template-columns: repeat(auto-fit, minmax(min(100%,440px),1fr))`, `align-items:center`, `gap:48px`. → two columns on desktop, stacks on mobile (text first, cards below).
- Two absolutely-positioned decorative layers (`inset:0; pointer-events:none`):
  1. Glow: `radial-gradient(60% 70% at 78% 40%, hsl(215 100% 20% / .55), transparent 70%), radial-gradient(40% 40% at 10% 100%, hsl(215 100% 90% / .08), transparent 70%)`
  2. Grid lines: `linear-gradient(hsl(0 0% 100% / .04) 1px, transparent 1px), linear-gradient(90deg, hsl(0 0% 100% / .04) 1px, transparent 1px)`, `background-size:64px 64px`, `mask-image: radial-gradient(70% 70% at 50% 50%, #000 40%, transparent 100%)`.

### Left column (`position:relative; flex column; gap:24px; max-width:600px`)
1. **Eyebrow pill** — inline-flex, `gap:10px`, `border:1px solid hsl(0 0% 100% / .18)`, `border-radius:999px`, `padding:6px 14px 6px 8px`, 12px / 500 / `letter-spacing:.08em` / uppercase, color `hsl(215 100% 90%)`. Leading dot: 8px circle, bg `hsl(215 100% 90%)`, `box-shadow:0 0 12px hsl(215 100% 90%)`. Text: **Private Stock Rewards**.
2. **H1** — `font-size:clamp(40px,5.2vw,72px)`, `line-height:1.02`, weight 600, `letter-spacing:-.03em`, `text-wrap:balance`. Copy: **Every order⏎earns you more.** (explicit `<br>`).
3. **Subline** — `clamp(16px,1.3vw,19px)`, `line-height:1.55`, weight 300, color `hsl(215 20% 72%)`, `max-width:480px`. Copy: *Earn points on every dollar, climb the tiers, and get first access to new drops before anyone else.*
4. **CTA row** — flex, wrap, `gap:16px`, `margin-top:8px`.
   - Primary button `Sign up free`: height 52px, `padding:0 28px`, `border-radius:.5rem` (theme `--radius`), bg `#fff`, text `#000`, 15px/600. Hover: bg `hsl(215 100% 90%)`. Links to signup.
   - Text link `See how it works →`: height 52px, `padding:0 8px`, color `hsl(215 100% 90%)`, 15px/500, no underline. Anchors to the how-it-works section.
5. **Stats row** — flex, wrap, `gap:28px`, `margin-top:16px`, `padding-top:24px`, `border-top:1px solid hsl(0 0% 100% / .1)`, 13px, color `hsl(215 20% 60%)`; bold value in `#fff`/600:
   - **1 pt** per $1 spent
   - **3 tiers** Silver · Gold · Black
   - **24hr** early access to exclusive drops

### Right column (cards)
Wrapper: `position:relative; min-height:440px; display:grid; place-items:center`. Inner stage: `position:relative; width:min(100%,460px); height:440px`. All cards `position:absolute`, `border-radius:.75rem`, `box-shadow:0 30px 60px -20px hsl(0 0% 0% / .8)`.

**A. Member card (back, Black tier)** — `right:0; top:0; width:240px; aspect-ratio:1.586; padding:20px`; bg `linear-gradient(135deg, hsl(0 0% 12%), hsl(0 0% 4%))`; `border:1px solid hsl(0 0% 100% / .14)`; extra inset shadow `inset 0 1px 0 hsl(0 0% 100% / .1)`; flex column, `justify-content:space-between`.
- Top row: label `MEMBER TIER` 11px/500/`.12em`/uppercase, color `hsl(215 20% 65%)`; badge `BLACK` 11px/600/`.08em`/uppercase, `padding:4px 8px`, pill, bg `hsl(215 100% 90%)`, text `hsl(215 100% 20%)`.
- Bottom: `Private Stock` 22px/600/`-.02em`; below it `•••• 4 2 1 9   MEMBER SINCE '24` 12px, color `hsl(215 20% 65%)`, `letter-spacing:.06em`, `margin-top:4px`.
- Animation `psFloatB` 8s.

**B. Points card (front, Gold)** — `left:0; top:200px; width:240px; padding:20px; z-index:2`; bg `linear-gradient(135deg, hsl(43 74% 66%), hsl(38 60% 48%))`; text `hsl(30 30% 8%)`.
- Top row (space-between): `POINTS BALANCE` 11px/500/`.08em`/uppercase, color `hsl(30 30% 20%)`; badge `GOLD` 10px/600/`.08em`/uppercase, `padding:3px 8px`, pill, bg `hsl(30 30% 8%)`, text `hsl(43 74% 66%)`.
- `2,480` 44px/600/`-.03em`, `line-height:1`, `margin-top:14px`.
- `+120 pts from last order` 13px, color `hsl(30 30% 20%)`, `margin-top:6px`.
- Progress: track `height:6px`, pill, bg `hsl(0 0% 100% / .35)`, `margin-top:16px`; fill `width:62%`, bg `hsl(30 30% 8%)`.
- Footer row (space-between) 11px, color `hsl(30 30% 20%)`, `margin-top:8px`: `Gold` / `1,520 to Black`.
- Animation `psFloatA` 7s.

**C. Early-access toast (front-most)** — `right:0; bottom:0; width:250px; padding:16px 18px; z-index:3`; bg `hsl(222 84% 5%)`; `border:1px solid hsl(215 100% 90% / .2)`; flex, `gap:14px`, `align-items:center`.
- Icon tile 40×40, `border-radius:.5rem`, bg `hsl(215 100% 90%)`, centered 18px lightning bolt (stroke `hsl(215 100% 20%)`, width 2.2; path `M13 2 4 14h7l-1 8 9-12h-7z`). Use the site's icon set (e.g. lucide `zap`).
- Title `Early access unlocked` 13px/600; sub `New drop opens for you in 24h` 12px, color `hsl(215 20% 65%)`.
- Animation `psFloatC` 6s.

## Interactions & Behavior
- Cards float continuously (`ease-in-out infinite`), each keeping its base rotation:
  - `psFloatA` (points): rotate(-4deg), translateY 0 → -10px → 0, 7s
  - `psFloatB` (member): rotate(3deg), 0 → -14px → 0, 8s
  - `psFloatC` (toast): rotate(-2deg), 0 → -8px → 0, 6s
- Respect `prefers-reduced-motion: reduce` → disable float, keep rotation.
- Primary button hover: bg → `hsl(215 100% 90%)`. Text link hover: color → `#fff`.
- Responsive: below ~900px the grid stacks; card stage stays 460px max and centers. On very narrow screens (<460px) cards shrink with the stage width; verify no card text clips at 360px — reduce card widths to ~85% if needed.
- No loading/error/form state; all content is static.

## State Management
None. Card values (2,480 pts, Gold, 62%, etc.) are illustrative marketing content, not live data.

## Design Tokens
From the PS Management theme (`_ds/.../tokens/tokens.css`), HSL channels used as `hsl(var(--x))`:
- Black / primary: `#000`
- White / primary-foreground: `#fff`
- Secondary/muted (pale blue): `hsl(215 100% 96%)`
- Accent (light blue): `hsl(215 100% 90%)` — used for eyebrow, dot, badges, icon tile, hover
- Accent-foreground / deep blue: `hsl(215 100% 20%)` — glow, badge text, progress fill, bolt
- Foreground near-black: `hsl(222 84% 5%)` — toast bg
- Muted text: `hsl(215 20% 72%)` subline, `hsl(215 20% 65%)` card secondary, `hsl(215 20% 60%)` stats
- Gold (new, not in theme — add as `--gold`): `hsl(43 74% 66%)` → `hsl(38 60% 48%)` gradient; gold ink `hsl(30 30% 8%)`, gold muted ink `hsl(30 30% 20%)`
- Radius: `.5rem` buttons/icon tile (theme `--radius`), `.75rem` cards, `999px` pills
- Font: Poppins 300/500/600 (self-hosted in `_ds/.../fonts/`)
- Shadow: `0 30px 60px -20px hsl(0 0% 0% / .8)` cards

## Assets
- `screenshots/hero-responsive.png` — responsive hero section as rendered (desktop width)
- `screenshots/banner-1920x800.png` — static 1920×800 banner export
- Poppins woff2 (300–700): `_ds/private-stock-*/fonts/`
- Lightning icon: inline SVG path above (or lucide `zap`)
- No raster images.

## Files
- `Rewards Hero.dc.html` — the design reference (hero section + 1920×800 banner)
- `_ds/` — theme tokens, theme utility classes, fonts

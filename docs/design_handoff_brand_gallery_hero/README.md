# Handoff: Private Stock — Brand Gallery Hero

## Overview
Full-width hero for the privatestock.co landing page (fills the area directly under the site header, replacing the current grow-room photo). It features the four house brands — Outfitters, Higher Self, TerpKings, Savage Squad Strains — as four full-height photo panels separated by diagonal dividers. Hovering a panel expands it.

## About the Design Files
The HTML file in this bundle (`Hero Options.dc.html`) is a **design reference built in HTML** — a prototype showing the intended look and behavior, not production code to drop in. Recreate the design in the site's existing stack (theme/framework, component conventions, image pipeline). The approved option is **2a** (the top-most artboard in the file); options 1a/1b/1c are earlier explorations and can be ignored.

## Fidelity
**High-fidelity.** Recreate layout, type, colors, geometry and motion as specified below.

## Screen: Brand Gallery Hero (option 2a)

**Canvas:** designed at 1440×600 (2.4:1). On the live site it should span the full viewport width; keep height ≈ 41–42% of width (or a fixed 600–785px tall band, matching the current hero). Background `#000`. `overflow: hidden`.

**Panels (4):** absolutely positioned, full height, laid out left→right in this order:
1. Outfitters — image `assets/outfitters.png`, background-position `30% 60%`
2. Higher Self — `assets/higher-self.jpg`, position `50% 55%`
3. TerpKings — `assets/terpkings.png`, position `50% 35%`
4. Savage Squad Strains — `assets/savage-squad-strains.png`, position `50% 45%`

Images are `background-size: cover` (or `object-fit: cover`) at the positions above.

**Widths:** flex ratio — active (hovered) panel 2.2, all others 1. Default active = Outfitters. Panel width `w_i = W * flex_i / sum(flex)` where W = hero width.

**Diagonal dividers:** dividers slant up-and-to-the-right. Skew `S = 90px` (horizontal offset between the divider's bottom point and its top point). Gap between panels `G = 3px` each side (6px visible black line). Implementation used in the prototype: each panel element is `left = x_i − S`, `width = w_i + 2S`, and clipped with

```
clip-path: polygon(TLpx 0, TRpx 0, BRpx 100%, BLpx 100%)
  TL = 2S + G   (first panel: S)
  BL = S + G    (first panel: S)
  TR = 2S + w − G  (last panel: S + w)
  BR = S + w − G   (last panel: S + w)
```
(x_i = running sum of previous widths). First and last panels have straight vertical outer edges.

**Overlay:** on every panel a gradient `linear-gradient(180deg, rgba(0,0,0,.05) 45%, rgba(0,0,0,.88) 100%)` for label legibility.

**Label (bottom-left of each panel):** positioned `left = BL + 26px`, `bottom = 26px`, column, gap 6px, `max-width = w − 60px`, color white.
- Subheader: Poppins 11px, weight 400, letter-spacing .2em, uppercase, color `rgba(255,255,255,.72)`
- Brand name: Poppins 28px, weight 600, line-height 1.05, letter-spacing −.01em, color `#fff`

**Copy (exact):**
- Outfitters — subheader "CRAFTED WITHOUT COMPROMISE"
- Higher Self — "PAUSE IN YOUR EVERYDAY LIFE"
- TerpKings — "EXPERIENCE THE FULL POTENTIAL OF CANNABIS"
- Savage Squad Strains — "NOT A BRAND. A MOVEMENT."

Each panel is a link to that brand's page.

## Interactions & Behavior
- `mouseenter` on a panel sets it active. Active panel grows to flex 2.2; others shrink to 1. Transition `left`, `width`, `clip-path` over 550ms, easing `cubic-bezier(.2,.7,.2,1)`.
- Panel image: inactive `transform: scale(1.08)`, active `scale(1)`, same 550ms/easing.
- Label `left` transitions with the same timing so it tracks the divider.
- Touch/no-hover devices: keep default active (Outfitters) or make equal widths; tap navigates.
- Responsive: below ~900px consider stacking to 2×2 or a vertical list — not designed; use judgement.
- Optional: on load, cycle active panel every ~4s until the user hovers.

## State Management
Single value: `activeKey` ∈ {outfitters, higherself, terpkings, sss}, default `outfitters`. Panel geometry derived from it on each render.

## Design Tokens (Private Stock theme)
- Black `#000` (hero ground, dividers), White `#fff`
- Label muted white `rgba(255,255,255,.72)`
- Font: Poppins (site base font); weights 400/600
- Motion: 550ms, `cubic-bezier(.2,.7,.2,1)`
- Geometry: S = 90px, G = 3px, label inset 26px

## Assets (in `assets/`)
- `outfitters.png` — 1920×1280 product/lifestyle shot
- `higher-self.jpg` — 1800×2482 lifestyle shot (portrait; cropped by cover)
- `terpkings.png` — 1920×1280 key art
- `savage-squad-strains.png` — 1024×1024 pendant logo
Compress/convert to WebP/AVIF for production; source files are large.

## Files
- `Hero Options.dc.html` — prototype. Option 2a geometry is computed in the `panels` block of the logic class (constants W, S, G).

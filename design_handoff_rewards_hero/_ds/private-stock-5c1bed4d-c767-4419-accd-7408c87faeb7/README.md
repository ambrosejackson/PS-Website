# PS Management — Design System (theme & tokens)

This is the **PS Management / Private Stock** brand theme: design tokens, self-hosted
fonts, and a semantic utility vocabulary. It is a **theme layer, not a component
library** — build with your normal components/layout, but reach for the class names
below so everything renders on-brand and tracks light/dark automatically.

## Setup

- **Import `styles.css`.** It is the whole system: it `@import`s the fonts, the tokens,
  and the utility classes. Nothing on-brand exists outside its import closure.
- **Base font is Poppins** (applied to `html, body`). Lato is available as a secondary face.
- **Dark mode:** add `class="dark"` to any container. All token-based classes below flip
  automatically — never hard-code hex colors; use the vocabulary so dark mode keeps working.

## Styling idiom — Tailwind utility classes

Style with utility classes (the idiom this system is built in). The theme defines the
**brand color / radius / font** vocabulary below; use ordinary Tailwind utilities for
everything else (layout, spacing, fl+grid, sizing, shadows).

**Colors.** Each role below has `bg-<role>`, `text-<role>`, and `border-<role>`, plus a
paired `-foreground` for text that sits on that color:

| Role | Meaning | Light look |
|---|---|---|
| `background` / `foreground` | page surface / default text | white / near-black |
| `primary` / `primary-foreground` | primary actions, emphasis | **black** bg, white text |
| `secondary` / `secondary-foreground` | secondary surfaces | pale blue / deep blue |
| `muted` / `muted-foreground` | subtle fills, secondary text | pale blue / gray-blue |
| `accent` / `accent-foreground` | hover/active tints | light blue / deep blue |
| `card` / `card-foreground` | card surfaces | white / near-black |
| `popover` / `popover-foreground` | menus, popovers | white / near-black |
| `destructive` / `destructive-foreground` | errors, delete | red / white |
| `border`, `input`, `ring` | borders, input borders, focus ring | light gray-blue |
| `sidebar` + `sidebar-*` | app sidebar | **black** bg, white text |

The brand signature is a **pure-black `primary` and black `sidebar`** on light neutral
surfaces with pale-blue secondary/muted/accent tints.

**Radius** (`--radius` = 0.5rem): `rounded-sm` · `rounded-md` · `rounded-lg`.
**Fonts:** `font-poppins` (default) · `font-lato`.
**Branded component class:** `.section-header` — dark gradient header band used across dashboards.

## Where the truth lives

Read these bound files before styling: **`styles.css`** (entry) and its imports
**`tokens/tokens.css`** (the `--*` HSL tokens) and **`tokens/theme.css`** (the class
vocabulary). Tokens are HSL channels — at raw-CSS use, wrap them: `hsl(var(--primary))`.

## Idiomatic snippet

```html
<div class="bg-card text-card-foreground rounded-lg border-border font-poppins p-6">
  <h3 class="text-foreground">Batch #204</h3>
  <p class="text-muted-foreground">Cultivation · ready to package</p>
  <button class="bg-primary text-primary-foreground rounded-md px-4 py-2">Approve</button>
</div>
```

---

## What's in this bundle

This is a **theme/tokens-only** sync (no compiled component library). Contents:

- `styles.css` — import this; it is the entry point and pulls in everything below.
- `tokens/tokens.css` — the HSL design tokens (`:root` light, `.dark` dark).
- `tokens/theme.css` — semantic utility classes mapped onto those tokens.
- `fonts/` — self-hosted Poppins (300–700) + Lato (400/700), woff2, latin subset.
- `guidelines/conventions.md` — the guidance above, standalone.

Source of truth in the app repo: `src/index.css` (tokens) and `tailwind.config.ts` (vocabulary).

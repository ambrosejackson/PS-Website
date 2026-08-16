@AGENTS.md

# CLAUDE.md — PS-Website (privatestock.co rebuild)

You are building the public consumer website for Private Stock Cannabis Co.
Two documents in `/docs` are the source of truth. Read both fully before any work:

1. `docs/PRIVATE-STOCK-WEBSITE-BUILD-PLAN.md` — decisions, schema, phases, feature specs.
2. `docs/PS-MANAGEMENT-CONTEXT.md` — the PSM back-office system this site integrates with.

If a requirement conflicts between them, the BUILD-PLAN wins (it is newer). If something
you need is in neither document, ASK Ambrose — do not guess schema, IDs, URLs, or copy.

## Stack (fixed — do not substitute)
- Next.js App Router + TypeScript on Vercel. Tailwind + shadcn/ui. TanStack Query where client fetching is needed; prefer RSC/SSG/ISR.
- Website Supabase project (its own project — NOT the PSM project). Migrations tracked in `supabase/migrations`, applied via Supabase CLI/MCP. Branch/preview freely — this project has no "no dev branch" constraint.
- GitHub flow: work on `dev`, PR to `main`. Vercel: `dev` = preview, `main` = production. Never commit secrets; env vars via Vercel/Supabase dashboards.

## Hard guardrails (violating any of these is a critical failure)
1. NEVER connect this site to the PSM production Supabase (`skdhqrjxvhegbufykhyp`) — no keys, no direct reads, no writes. PSM data arrives only through the publish pipeline defined in the build plan (§2, §5). PSM-side work (migrations, RPCs) is done by Ambrose in the PSM project — you produce specs/SQL for him, clearly labeled "PSM-SIDE — do not run here."
2. NEVER display product prices, MSRP, or discounts from menu-check data. Product availability = presence + store menu link + image + checked_at only.
3. Brand allowlist: `Outfitters, TerpKings, Higher Self, Savage Squad Strains` (single config in `lib/brands.ts`). Kush League and Clusters are excluded everywhere until the allowlist changes.
4. No promotional banners above or over the hero on any page. Banners render below the hero only.
5. Header structure is identical on every page: hamburger + large Private Stock logo left; `CATALOG  STORE LOCATOR  YOUR REWARDS  [login] [cart]` right in condensed uppercase; underline hover animation. CATALOG (renamed from BRANDS, D-021) still swaps the hero on hover — its asset's `nav_target` is still `BRANDS` — but its CLICK opens the Brand Book flip-book modal instead of navigating. Two chrome treatments, both driving the hero hover-swap:
   - **Every non-brand page** (landing, `/products` + product detail, `/apparel`, `/news` + posts, `/about`, `/contact`, `/rewards`, `/store-locator`, 404): a **SOLID WHITE bar that SITS ABOVE the hero** — never overlaying it — with all content black (hamburger, black badge logo `private-stock-black.png`, nav text). No per-asset light/dark theming here; the bar is always white. Hero starts flush beneath the bar, full-bleed, no gap. `docs/reference/lovable/01-header-hero.png` governs the white ground and black content, but **NOT the bar proportions** — Ambrose overrode those (D-018): the bar follows the expanded menu's old row (20px gutter mobile / 40px desktop, no max-width rail, height derived from the logo — ~117px mobile / ~155px desktop, taller than the reference). **Do not "restore" the reference's shorter bar, and do not revert this to the transparent overlay.**
   - **Brand landing pages ONLY** (`/outfitters`, `/higherself`, `/terpkings`, `/savagesquadstrains`): the transparent bar stays overlaid on a full-bleed hero flush to the top of the viewport, with per-asset light/dark theme switching (`content_heroes.theme`). Opt in via `<HeroSwitcher overlayHeader>` / `<Header variant="overlay" />`. Brand pages were NOT in scope for the D-016/D-018 size bumps — their geometry is unchanged.

   Bar geometry for BOTH treatments lives in `components/site/header-chrome.ts` and is imported by `Header` AND `FullscreenMenu`. The closed header and the open menu must stay positionally identical (D-015): never hard-code gutter/gap/icon/logo sizes in one of the two.
6. Age gate (21+) on entry, cookie-based. Brand subpaths reuse the cookie; direct/forwarded entry without it shows the brand-styled gate. Cookie consent gates ALL non-essential scripts; analytics are first-party only (`web_events`).
7. Newsletter persona tag is exactly `Website Sign-up – {Brand}`; non-brand pages tag `Private Stock`. Store persona + brand_context + source_path on every subscriber row.
8. Merch only through Stripe (cards, Apple Pay, Google Pay, Link, Cash App Pay). No THC commerce anywhere on this site. Keep merch presentation clean of plant-touching commerce.
9. SEO is a launch gate: every product, brand, and blog post gets its own statically-renderable page with metadata + structured data; 301 map lives in `next.config.js`.

## Working style
- Ambrose is the sole decision-maker. Give exact commands, exact paths, exact values; present options with tradeoffs when they exist; ask rather than assume.
- Small PRs per feature; each PR description lists what to verify on the Vercel preview.
- After any schema change: regenerate types (`supabase gen types typescript`) and keep `lib/database.types.ts` current.
- Keep a running `docs/DECISIONS.md` — append every decision Ambrose makes in-session.

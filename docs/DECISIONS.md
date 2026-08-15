# DECISIONS.md — running decision log

Append every decision Ambrose makes in-session. Newest at the bottom.

## 2026-08-15 — Phase 0/1 build session

**Decisions made by Ambrose:**
- D-001: Website Supabase project is `ihurvtxmcyahvtcydmnf` (privatestock.co website; separate from PSM).
- D-002: Migration applied via Supabase CLI (`supabase login` + `link` + `db push`) after the MCP OAuth client was rejected ("Unrecognized client_id"); CLI stays the applier for now.
- D-003: Service role key handled by Ambrose only — Vercel env (`SUPABASE_SERVICE_ROLE_KEY`, Production + Preview, Sensitive) and local `.env.local`. Never in chat or committed files.

**Implementation choices made by Claude (flag to Ambrose if wrong):**
- I-001: Env naming follows current Supabase convention: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (matches PSM's publishable-key naming).
- I-002: `/admin` auth = email + password sign-in (Supabase Auth user created in dashboard) + `ADMIN_ALLOWED_EMAILS` env allowlist (default `ambrose@privatestock.co`). Magic links skipped for now (preview-URL redirect allowlisting friction).
- I-003: Brand Book pre-rendered to 44 committed JPEGs (`public/brand-book/`, ~9.5 MB) via `scripts/render-brand-book.mjs`; re-run the script when the PDF changes.
- I-004: Newsletter code format `PS15-XXXXXX` (unambiguous alphabet); Stripe promotion-code creation stubbed (`stripe_promotion_code_id = 'stub_pending_stripe'`) until `STRIPE_ENABLED=true` in phase 3. Duplicate signups return the existing code.
- I-005: Rewards waitlist uses the standard persona `Website Sign-up – Private Stock` per kickoff item 7 (supersedes the earlier `rewards-waitlist` tag idea in decision 5 of the build plan).
- I-006: Placeholder brand accents/taglines in `lib/brands.ts` and placeholder wordmark logo (inline SVG, currentColor) until Drive logo files land in `public/brand-assets/`.
- I-007: Hero hover-swap keeps the swapped asset while the cursor is over the nav item OR the hero itself; reverts ~600ms after leaving (reconciles build-plan decision 8 with the docx wording).
- I-008: `product_availability` PK uses `variant text not null default ''` (build-plan §4 version, which supersedes the generated-column sketch in PS-MANAGEMENT-CONTEXT §6).
- I-009: Mock PSM rows live in the real website DB with fixed `00000000-…` UUIDs, gated by `MOCK_PSM_DATA=true`; the publish pipeline will delete/replace them.
- I-010: First-party analytics send only after explicit consent "Accept"; age-gate + consent cookies are the only pre-consent cookies.

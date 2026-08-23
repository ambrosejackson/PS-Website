# LAUNCH CHECKLIST — privatestock.co

Production = the Vercel `main` deployment (`ps-website-alpha.vercel.app`) until the DNS
cutover. Sections A–C gate the cutover; D is the cutover itself.

## A. Published to production (done — "Production launch: phases 0-3", 2026-08-22)
- [x] Landing, brand pages (Outfitters, TerpKings, Higher Self, SSS), products + SEO
      product pages, apparel storefront + cart + checkout, news, about/contact/rewards,
      store locator (coming-soon state on production), age gate, consent, analytics.
- [x] /admin: Products (sheet sync), Apparel, Orders, Heroes, Banners, Blog,
      Subscribers, Messages.
- [x] Production safety gate: mock PSM availability never renders on production
      (`lib/showRealAvailability.ts`).
- [x] Daily sheet sync cron (`vercel.json` → `/api/cron/sync-sheet`, 09:00 UTC).

## B. Commerce go-live (TEST mode today — must flip before announcing the shop)
- [ ] Stripe: swap to LIVE keys in Vercel Production (`STRIPE_SECRET_KEY`,
      `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`); Stripe Tax — real head office address +
      IL (and any other) registrations in LIVE mode; payment methods (Apple Pay,
      Google Pay, Link, Cash App Pay) enabled in LIVE; Apple Pay domain verification
      for the production domain.
- [ ] Stripe webhook for production: Developers → Webhooks → endpoint
      `https://<production domain>/api/stripe/webhook`, events
      `checkout.session.completed`, `checkout.session.async_payment_succeeded`,
      `checkout.session.async_payment_failed`, `checkout.session.expired` →
      `STRIPE_WEBHOOK_SECRET` (Production). Re-do when the domain changes (D).
- [ ] PayPal: LIVE app client id/secret + `PAYPAL_ENV=live` (Production).
- [ ] Re-run one live $1-class purchase on each rail, then refund in the dashboards.
- [ ] Newsletter promotion codes: existing `stub_pending_stripe` rows get real Stripe
      promotion codes lazily on first use — confirm with one code in LIVE.
- [ ] Deactivate/remove test rows: `PS Test Tee` (inactive), test orders (canceled),
      smoke-test message (archived).

## C. Content + ops before cutover
- [ ] ABOUT page copy (known open) and final CONTACT copy.
- [ ] Hero media on every page (Heroes admin) — especially landing default + the three
      hover targets; TerpKings MP4 + poster already in place.
- [ ] Banners: at least one live slide (or none — section hides).
- [ ] Blog: publish real posts (seeded placeholders are drafts).
- [ ] TerpKings art placeholders (comic cover, King art, merch photos, IG tiles).
- [ ] Resend: domain verified ✓; confirm order/contact emails from
      `notifications@privatestock.co` land in ambrose@ (not spam) — DMARC record optional.
- [ ] Vercel: Deployment Protection — keep previews protected (webhooks/PayPal then only
      work on production), or add a bypass token for preview testing.
- [ ] PSM publish pipeline (W1/W2): when live, unset `MOCK_PSM_DATA` in Production → real
      store locator + product availability appear automatically.
- [ ] Newsletter → PSM subscriber ingest (W3) and retailer messages feed.

## D. DNS cutover (privatestock.co)
- [ ] Vercel → Project → Domains: add `privatestock.co` + `www` (choose the canonical
      host; Vercel redirects the other); GoDaddy: A `@` → `76.76.21.21`, CNAME `www` →
      `cname.vercel-dns.com` (or the records Vercel shows).
- [x] `NEXT_PUBLIC_SITE_URL=https://privatestock.co` in Production (metadata, sitemap,
      emails, JSON-LD). (2026-08-23)
- [ ] Stripe: webhook URL + Apple Pay domain on the new host; PayPal return URLs are
      origin-relative (no change).
- [ ] 301 map from the old WordPress URLs (`lib/redirects.ts` — guardrail #9) populated
      and verified against the old sitemap.
- [ ] Google Search Console: verify, submit `/sitemap.xml`; robots allows `/`.
- [ ] Smoke: `/`, `/terpkings` (video + poster), a product page, `/apparel` + checkout
      (live), `/admin` login, age gate cookie on the new domain.

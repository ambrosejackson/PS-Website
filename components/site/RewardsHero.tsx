import Link from "next/link";
import { Zap } from "lucide-react";

/**
 * Rewards Program hero — top of /rewards (D-089). Recreated from
 * design_handoff_rewards_hero/README.md: copy, sizes and colours are the
 * handoff's, pixel for pixel. Static marketing content: the card values
 * (2,480 pts, Gold, 62%…) are illustrative, not live data.
 *
 * Server component, no client JS. The three cards float via the .ps-float-*
 * classes in app/globals.css, which also hold each card's base rotation so
 * prefers-reduced-motion can stop the bob without flattening the tilt.
 *
 * Card widths are CONTENT-box (`box-content`): the handoff HTML has no
 * box-sizing reset, so its "width:240px; padding:20px" cards render 280px wide
 * in the reference screenshot. The screenshot is the source of truth.
 *
 * Colours come from the hero-scoped tokens (--gold*, --ps-blue*, --ps-navy).
 * The site's global shadcn --accent / --secondary are deliberately untouched.
 */

const SIGNUP_HREF = "/signup";
/** Section is built later (PRD §2.6) — the anchor is inert until it exists. */
const HOW_IT_WORKS_HREF = "#how-it-works";

const cardShadow = "shadow-[0_30px_60px_-20px_hsl(0_0%_0%/0.8)]";

export function RewardsHero() {
  return (
    <section
      aria-labelledby="rewards-hero-title"
      className="relative grid min-h-[640px] grid-cols-[repeat(auto-fit,minmax(min(100%,440px),1fr))] items-center gap-12 overflow-hidden bg-black px-[clamp(24px,6vw,96px)] py-[clamp(56px,8vw,112px)] font-poppins text-white"
    >
      {/* Decorative layers: blue glow, then masked 64px grid lines. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_70%_at_78%_40%,hsl(215_100%_20%/0.55),transparent_70%),radial-gradient(40%_40%_at_10%_100%,hsl(215_100%_90%/0.08),transparent_70%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(hsl(0_0%_100%/0.04)_1px,transparent_1px),linear-gradient(90deg,hsl(0_0%_100%/0.04)_1px,transparent_1px)] bg-[length:64px_64px] [mask-image:radial-gradient(70%_70%_at_50%_50%,#000_40%,transparent_100%)]"
      />

      {/* Left column */}
      <div className="relative flex max-w-[600px] flex-col gap-6">
        <div className="inline-flex items-center gap-2.5 self-start rounded-full border border-white/[0.18] py-1.5 pl-2 pr-3.5 text-xs font-medium uppercase tracking-[0.08em] text-ps-blue">
          <span className="size-2 rounded-full bg-ps-blue shadow-[0_0_12px_var(--ps-blue)]" />
          Private Stock Rewards
        </div>

        <h1
          id="rewards-hero-title"
          className="text-balance text-[clamp(40px,5.2vw,72px)] font-semibold leading-[1.02] tracking-[-0.03em]"
        >
          Every order
          <br />
          earns you more.
        </h1>

        <p className="max-w-[480px] text-pretty text-[clamp(16px,1.3vw,19px)] font-light leading-[1.55] text-[hsl(215_20%_72%)]">
          Earn points on every dollar, climb the tiers, and get first access to new drops before anyone else.
        </p>

        <div className="mt-2 flex flex-wrap items-center gap-4">
          <Link
            href={SIGNUP_HREF}
            className="inline-flex h-[52px] items-center justify-center rounded-[0.5rem] bg-white px-7 text-[15px] font-semibold text-black transition-colors hover:bg-ps-blue focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ps-blue"
          >
            Sign up free
          </Link>
          <a
            href={HOW_IT_WORKS_HREF}
            className="inline-flex h-[52px] items-center px-2 text-[15px] font-medium text-ps-blue transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ps-blue"
          >
            See how it works →
          </a>
        </div>

        <div className="mt-4 flex flex-wrap gap-7 border-t border-white/10 pt-6 text-[13px] text-[hsl(215_20%_60%)]">
          <span><strong className="font-semibold text-white">1 pt</strong> per $1 spent</span>
          <span><strong className="font-semibold text-white">3 tiers</strong> Silver · Gold · Black</span>
          <span><strong className="font-semibold text-white">24hr</strong> early access to exclusive drops</span>
        </div>
      </div>

      {/* Right column — illustrative cards, hidden from assistive tech. */}
      {/* Under 460px the stage is narrower than the design's, so the toast would
          sit on the gold card's footer text; 36px of extra height drops it clear. */}
      <div aria-hidden="true" className="relative grid min-h-[440px] place-items-center max-[459px]:min-h-[476px]">
        <div className="relative h-[440px] w-[min(100%,460px)] max-[459px]:h-[476px]">
          {/* B. Points card (front, Gold) */}
          <div
            className={`ps-float-a absolute box-content left-0 top-[200px] z-[2] w-[240px] rounded-[0.75rem] bg-[linear-gradient(135deg,var(--gold),var(--gold-deep))] p-5 text-gold-ink ${cardShadow}`}
          >
            <div className="flex items-center justify-between text-[11px] font-medium uppercase tracking-[0.08em] text-gold-ink-muted">
              <span>Points balance</span>
              <span className="rounded-full bg-gold-ink px-2 py-[3px] text-[10px] font-semibold uppercase tracking-[0.08em] text-gold">
                Gold
              </span>
            </div>
            <div className="mt-3.5 text-[44px] font-semibold leading-none tracking-[-0.03em]">2,480</div>
            <div className="mt-1.5 text-[13px] text-gold-ink-muted">+120 pts from last order</div>
            <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/35">
              <div className="h-full w-[62%] rounded-full bg-gold-ink" />
            </div>
            <div className="mt-2 flex justify-between text-[11px] text-gold-ink-muted">
              <span>Gold</span>
              <span>1,520 to Black</span>
            </div>
          </div>

          {/* A. Member card (back, Black tier) */}
          <div className="ps-float-b absolute box-content right-0 top-0 flex aspect-[1.586] w-[240px] flex-col justify-between rounded-[0.75rem] border border-white/[0.14] bg-[linear-gradient(135deg,hsl(0_0%_12%),hsl(0_0%_4%))] p-5 text-white shadow-[0_30px_60px_-20px_hsl(0_0%_0%/0.9),inset_0_1px_0_hsl(0_0%_100%/0.1)]">
            <div className="flex items-start justify-between">
              <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-[hsl(215_20%_65%)]">
                Member tier
              </span>
              <span className="rounded-full bg-ps-blue px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-ps-blue-deep">
                Black
              </span>
            </div>
            <div>
              <div className="text-[22px] font-semibold tracking-[-0.02em]">Private Stock</div>
              <div className="mt-1 text-xs tracking-[0.06em] text-[hsl(215_20%_65%)]">
                •••• 4 2 1 9 &nbsp; MEMBER SINCE &apos;24
              </div>
            </div>
          </div>

          {/* C. Early-access toast (front-most) */}
          <div className="ps-float-c absolute box-content bottom-0 right-0 z-[3] flex w-[250px] items-center gap-3.5 rounded-[0.75rem] border border-ps-blue/20 bg-ps-navy px-[18px] py-4 text-white shadow-[0_30px_60px_-20px_hsl(0_0%_0%/0.9)]">
            <div className="grid size-10 shrink-0 place-items-center rounded-[0.5rem] bg-ps-blue">
              <Zap className="size-[18px] text-ps-blue-deep" strokeWidth={2.2} />
            </div>
            <div className="min-w-0">
              <div className="text-[13px] font-semibold">Early access unlocked</div>
              <div className="mt-0.5 text-xs text-[hsl(215_20%_65%)]">New drop opens for you in 24h</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { rsvpAction, type RsvpFormState } from "@/lib/events/actions";
import type { DispensaryOption } from "@/lib/events/types";
import { DispensaryPicker } from "./DispensaryPicker";

const IDLE: RsvpFormState = { status: "idle" };
const submitClass = "h-12 w-full font-condensed text-base font-semibold uppercase tracking-wide";

/** Special instruction shown to budtenders on the form, the confirmation and every email (D-012). */
export function BadgeInstruction({ className = "" }: { className?: string }) {
  return (
    <div className={`border-2 border-ink bg-kb-yellow p-4 text-sm leading-relaxed text-ink ${className}`}>
      <p className="font-condensed text-base font-bold uppercase tracking-wide">Bring your IDFPR badge</p>
      <p className="mt-1">
        On the day, bring your <strong>valid IDFPR dispensary agent badge</strong> and a government photo ID. Your free BBQ
        plate is released at check-in after we verify your badge. No badge, no plate.
      </p>
    </div>
  );
}

function Done({ state, slug }: { state: Extract<RsvpFormState, { status: "done" }>; slug: string }) {
  const ticket = `/events/${slug}/ticket/${state.ticketToken}`;
  return (
    <div className="border border-hairline p-6 md:p-8" role="status">
      <p className="font-condensed text-3xl font-bold uppercase tracking-tight text-ink">
        {state.upgraded ? "You're now on the list as a budtender" : state.duplicate ? "You're already on the list" : "You're on the list"}
      </p>
      <p className="mt-3 leading-relaxed text-neutral-600">
        {state.upgraded
          ? "We updated your existing RSVP and sent a new confirmation"
          : state.duplicate
            ? "We just re-sent your ticket"
            : "Your ticket is on its way"}{" "}
        to <span className="font-medium text-ink">{state.email}</span>. {state.upgraded ? "Your ticket and QR code stay the same." : "Show the QR code at the gate."}
      </p>
      {state.plateStatus === "confirmed" && (
        <div className="mt-6">
          <p className="mb-3 font-condensed text-lg font-semibold uppercase text-ink">Your free BBQ plate is reserved.</p>
          <BadgeInstruction />
        </div>
      )}
      {state.plateStatus === "waitlisted" && (
        <div className="mt-6 border border-hairline bg-neutral-50 p-4 text-sm leading-relaxed text-neutral-700">
          <p className="font-condensed text-base font-bold uppercase tracking-wide text-ink">
            You&apos;re {state.waitlistPosition ? `#${state.waitlistPosition} ` : ""}on the free-plate waitlist
          </p>
          <p className="mt-1">
            All comped plates are claimed right now. If one opens up we&apos;ll email you. Your RSVP is confirmed either
            way. Bring your IDFPR dispensary agent badge just in case.
          </p>
        </div>
      )}
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link href={ticket} className={buttonVariants({ className: `${submitClass} sm:w-auto sm:px-8` })}>
          View my ticket
        </Link>
        <a href={`/api/rsvp/ics/${slug}`} className={buttonVariants({ variant: "outline", className: `${submitClass} sm:w-auto sm:px-8` })}>
          Add to calendar
        </a>
      </div>
    </div>
  );
}

export function RsvpForm({
  slug,
  dispensaries,
  platesLeft,
  plateCap,
  source = "web",
}: {
  slug: string;
  dispensaries: DispensaryOption[];
  platesLeft: number;
  plateCap: number;
  source?: "web" | "walk_up";
}) {
  const [state, action, pending] = useActionState(rsvpAction, IDLE);
  const values = state.status === "error" ? state.values ?? {} : {};
  const errors = state.status === "error" ? state.fields ?? {} : {};
  const [budtender, setBudtender] = useState(values.isBudtender === "on");
  // Stamped after mount (not during render) so server and client HTML match.
  const startedRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (startedRef.current && !startedRef.current.value) startedRef.current.value = String(Date.now());
  }, []);

  if (state.status === "done") return <Done state={state} slug={slug} />;

  const fieldError = (k: string) => errors[k] && <p className="text-xs text-red-600">{errors[k]}</p>;

  return (
    <form action={action} className="space-y-5" noValidate={false}>
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="source" value={source} />
      <input ref={startedRef} type="hidden" name="startedAt" defaultValue="" />

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="firstName">First name</Label>
          <Input id="firstName" name="firstName" required maxLength={80} autoComplete="given-name" defaultValue={values.firstName} className="h-11" aria-invalid={Boolean(errors.firstName)} />
          {fieldError("firstName")}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="lastName">Last name</Label>
          <Input id="lastName" name="lastName" required maxLength={80} autoComplete="family-name" defaultValue={values.lastName} className="h-11" aria-invalid={Boolean(errors.lastName)} />
          {fieldError("lastName")}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" required autoComplete="email" defaultValue={values.email} className="h-11" aria-invalid={Boolean(errors.email)} />
          {fieldError("email")}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="phone">
            Mobile <span className="font-normal text-neutral-500">(optional)</span>
          </Label>
          <Input id="phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" defaultValue={values.phone} className="h-11" aria-invalid={Boolean(errors.phone)} />
          {errors.phone ? fieldError("phone") : <p className="text-xs text-neutral-500">Only used to reach you about this event on the day.</p>}
        </div>
      </div>

      {/* Budtender toggle (D-003..D-004). */}
      <div className={`border-2 p-4 transition-colors md:p-5 ${budtender ? "border-ink bg-kb-yellow/25" : "border-hairline"}`}>
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            name="isBudtender"
            checked={budtender}
            onChange={(e) => setBudtender(e.target.checked)}
            className="mt-1 size-5 accent-black"
          />
          <span>
            <span className="block font-condensed text-lg font-semibold uppercase leading-tight text-ink">
              I&apos;m a budtender at a licensed Illinois dispensary
            </span>
            <span className="mt-1 block text-sm text-neutral-600">
              Budtenders eat free: a BBQ plate on the house.{" "}
              {platesLeft > 0 ? (
                <strong className="text-ink">
                  {platesLeft} of {plateCap} plates left.
                </strong>
              ) : (
                <strong className="text-ink">All plates are claimed. RSVP to join the plate waitlist.</strong>
              )}
            </span>
          </span>
        </label>
        {budtender && (
          <div className="mt-5 space-y-5">
            <DispensaryPicker options={dispensaries} errors={errors} defaults={{ name: values.dispensaryName, city: values.dispensaryCity }} />
            <BadgeInstruction />
          </div>
        )}
      </div>

      <label className="flex items-start gap-2.5 text-sm text-neutral-700">
        <input type="checkbox" name="confirm21" required defaultChecked={values.confirm21 === "on"} className="mt-1" />
        <span>I confirm I am 21 years of age or older and will bring a valid government photo ID.</span>
      </label>
      {fieldError("confirm21")}
      <label className="flex items-start gap-2.5 text-sm text-neutral-700">
        <input type="checkbox" name="marketingOptIn" defaultChecked={values.marketingOptIn === "on"} className="mt-1" />
        <span>Send me Private Stock drops, events and news by email. Optional. Unsubscribe any time.</span>
      </label>

      {/* Honeypot: hidden from people, irresistible to bots. */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />

      {state.status === "error" && (
        <p className="text-sm text-red-600" role="alert">
          {state.message}
        </p>
      )}
      <Button type="submit" disabled={pending} className={submitClass}>
        {pending ? "Saving your spot…" : "RSVP free"}
      </Button>
      <p className="text-center text-xs text-neutral-500">
        We&apos;ll email your ticket. Your info is used by Private Stock for this event and, if you opted in, our emails. See our{" "}
        <Link href="/privacy" className="underline underline-offset-4">privacy policy</Link>.
      </p>
    </form>
  );
}

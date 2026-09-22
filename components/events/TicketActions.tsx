"use client";

import { useActionState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cancelRsvpAction, unsubscribeAction, type TicketActionState } from "@/lib/events/actions";

const IDLE: TicketActionState = { status: "idle" };
const btn = "h-11 font-condensed text-sm font-semibold uppercase tracking-wide";

/** Cancel / unsubscribe need a click (never a GET side effect), so link scanners can't cancel tickets. */
export function TicketActions({
  token,
  slug,
  cancelled,
  checkedIn,
  optedIn,
  intent,
}: {
  token: string;
  slug: string;
  cancelled: boolean;
  checkedIn: boolean;
  optedIn: boolean;
  intent: "cancel" | "unsubscribe" | null;
}) {
  const [cancelState, cancel, cancelling] = useActionState(cancelRsvpAction, IDLE);
  const [unsubState, unsub, unsubbing] = useActionState(unsubscribeAction, IDLE);

  return (
    <div className="mt-10 space-y-6">
      {!cancelled && (
        <a href={`/api/rsvp/ics/${slug}`} className={buttonVariants({ variant: "outline", className: `${btn} w-full` })}>
          Add to calendar
        </a>
      )}

      {intent === "unsubscribe" && optedIn && unsubState.status !== "done" && (
        <form action={unsub} className="border border-hairline p-5">
          <input type="hidden" name="token" value={token} />
          <p className="text-sm text-neutral-700">Stop Private Stock marketing emails to this address?</p>
          <Button type="submit" disabled={unsubbing} variant="outline" className={`${btn} mt-3`}>
            {unsubbing ? "Working…" : "Unsubscribe"}
          </Button>
        </form>
      )}
      {unsubState.status !== "idle" && (
        <p className={`text-sm ${unsubState.status === "error" ? "text-red-600" : "text-neutral-700"}`} role="status">
          {unsubState.message}
        </p>
      )}

      {!cancelled && !checkedIn && cancelState.status !== "done" && (
        <form action={cancel} className={`border p-5 ${intent === "cancel" ? "border-ink" : "border-hairline"}`}>
          <input type="hidden" name="token" value={token} />
          <p className="text-sm text-neutral-700">Can&apos;t make it? Cancel so someone else can take your spot.</p>
          <Button type="submit" disabled={cancelling} variant="destructive" className={`${btn} mt-3`}>
            {cancelling ? "Cancelling…" : "Cancel my RSVP"}
          </Button>
        </form>
      )}
      {cancelState.status !== "idle" && (
        <p className={`text-sm ${cancelState.status === "error" ? "text-red-600" : "text-neutral-700"}`} role="status">
          {cancelState.message}
        </p>
      )}
    </div>
  );
}

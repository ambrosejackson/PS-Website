"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ProfileFields } from "@/components/account/ProfileFields";
import {
  completeProfileAction,
  loginAction,
  signupAction,
  type AuthFormState,
} from "@/lib/account/actions";

const IDLE: AuthFormState = { status: "idle" };
const submitClass = "h-12 w-full font-condensed text-sm font-semibold uppercase tracking-wide";

function CheckYourEmail({ email }: { email: string }) {
  return (
    <div className="border border-hairline p-8 text-center" role="status">
      <p className="font-condensed text-2xl font-semibold uppercase tracking-tight text-ink">Check your email</p>
      <p className="mt-3 text-sm leading-relaxed text-neutral-600">
        {email ? (
          <>We sent a sign-in link to <span className="font-medium text-ink">{email}</span>.</>
        ) : (
          <>We sent you a sign-in link.</>
        )}{" "}
        Open it on this device, in this browser, to finish. It expires in an hour.
      </p>
    </div>
  );
}

function FormError({ state }: { state: AuthFormState }) {
  if (state.status !== "error") return null;
  return <p className="text-sm text-red-600" role="alert">{state.message}</p>;
}

export function SignupForm() {
  const [state, action, pending] = useActionState(signupAction, IDLE);
  if (state.status === "sent") return <CheckYourEmail email={state.email} />;
  return (
    <form action={action} className="space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" required autoComplete="email" className="h-11" />
        <p className="text-xs text-neutral-500">No password — we email you a link to sign in.</p>
      </div>
      <ProfileFields />
      {/* Honeypot: hidden from people, irresistible to bots. */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
      <FormError state={state} />
      <Button type="submit" disabled={pending} className={submitClass}>
        {pending ? "Sending…" : "Sign up free"}
      </Button>
      <p className="text-center text-sm text-neutral-500">
        Already a member?{" "}
        <Link href="/login" className="text-ink underline underline-offset-4">Log in</Link>
      </p>
    </form>
  );
}

export function LoginForm({ next, linkError }: { next: string; linkError: boolean }) {
  const [state, action, pending] = useActionState(loginAction, IDLE);
  if (state.status === "sent") return <CheckYourEmail email={state.email} />;
  return (
    <form action={action} className="space-y-5">
      {linkError && state.status === "idle" && (
        <p className="text-sm text-red-600" role="alert">
          That link has expired or was opened in a different browser. Enter your email for a fresh one.
        </p>
      )}
      <input type="hidden" name="next" value={next} />
      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" required autoComplete="email" className="h-11" />
      </div>
      <FormError state={state} />
      <Button type="submit" disabled={pending} className={submitClass}>
        {pending ? "Sending…" : "Email me a sign-in link"}
      </Button>
      <p className="text-center text-sm text-neutral-500">
        New here?{" "}
        <Link href="/signup" className="text-ink underline underline-offset-4">Sign up free</Link>
      </p>
    </form>
  );
}

export function CompleteProfileForm() {
  const [state, action, pending] = useActionState(completeProfileAction, IDLE);
  return (
    <form action={action} className="space-y-5">
      <ProfileFields />
      <FormError state={state} />
      <Button type="submit" disabled={pending} className={submitClass}>
        {pending ? "Saving…" : "Save my profile"}
      </Button>
    </form>
  );
}

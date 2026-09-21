/**
 * Consumer account profile fields (PRD claude/PRD-REWARDS-SIGNUP-AND-HERO.md §2.8).
 * Shared by the signup form, the "finish your profile" form on /account and the
 * auth callback, which re-validates before anything is written.
 *
 * personalEmail is an UNVERIFIED backup contact: never use it for login or to
 * match orders. Birthday is month + day only — no year is collected.
 */

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ZIP_RE = /^\d{5}$/;
/** Longest each month can be (Feb 29 allowed — no year to check against). */
const DAYS_IN_MONTH = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

export const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
] as const;

export interface ProfileInput {
  firstName: string;
  lastName: string;
  birthMonth: number;
  birthDay: number;
  zip: string;
  /** null when blank or identical to the login email. */
  personalEmail: string | null;
  marketingOptIn: boolean;
  /** ISO timestamp of the moment the 21+ box was submitted. */
  ageAttestedAt: string;
}

export type ProfileParse =
  | { ok: true; profile: ProfileInput }
  | { ok: false; error: string };

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

/**
 * Validate raw field values (FormData strings, or the JSON stashed in
 * user_metadata.pending_profile). `loginEmail` is only used to drop a personal
 * email that just repeats it.
 */
export function parseProfile(
  raw: Record<string, unknown>,
  loginEmail: string,
  opts: { ageAttestedAt?: string } = {},
): ProfileParse {
  const firstName = str(raw.firstName);
  const lastName = str(raw.lastName);
  if (!firstName || firstName.length > 80) return { ok: false, error: "Please enter your first name." };
  if (!lastName || lastName.length > 80) return { ok: false, error: "Please enter your last name." };

  const birthMonth = Number(raw.birthMonth);
  const birthDay = Number(raw.birthDay);
  if (
    !Number.isInteger(birthMonth) || birthMonth < 1 || birthMonth > 12 ||
    !Number.isInteger(birthDay) || birthDay < 1 || birthDay > DAYS_IN_MONTH[birthMonth - 1]
  ) {
    return { ok: false, error: "Please choose a valid birthday (month and day)." };
  }

  const zip = str(raw.zip);
  if (!ZIP_RE.test(zip)) return { ok: false, error: "Please enter a 5-digit ZIP code." };

  let personalEmail: string | null = str(raw.personalEmail).toLowerCase() || null;
  if (personalEmail && !EMAIL_RE.test(personalEmail)) {
    return { ok: false, error: "That personal email doesn't look right — fix it or leave it blank." };
  }
  if (personalEmail === loginEmail.trim().toLowerCase()) personalEmail = null;

  const attested = raw.ageAttested === true || raw.ageAttested === "on" || raw.ageAttested === "true";
  const ageAttestedAt = opts.ageAttestedAt ?? str(raw.ageAttestedAt);
  if (!attested && !ageAttestedAt) {
    return { ok: false, error: "You must confirm you are 21 or older to join." };
  }
  const attestedAt = ageAttestedAt && !Number.isNaN(Date.parse(ageAttestedAt))
    ? new Date(ageAttestedAt).toISOString()
    : new Date().toISOString();

  const marketingOptIn =
    raw.marketingOptIn === true || raw.marketingOptIn === "on" || raw.marketingOptIn === "true";

  return {
    ok: true,
    profile: {
      firstName, lastName, birthMonth, birthDay, zip, personalEmail,
      marketingOptIn, ageAttestedAt: attestedAt,
    },
  };
}

/** Only same-site paths survive as a post-login destination. */
export function safeNext(next: string | null | undefined, fallback = "/account"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("\\")) return fallback;
  return next;
}

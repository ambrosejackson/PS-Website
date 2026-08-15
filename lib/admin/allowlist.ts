/**
 * Staff email allowlist for /admin (build plan §3: "Supabase auth, staff allowlist").
 * Configured via ADMIN_ALLOWED_EMAILS (comma-separated) so additions don't need a
 * deploy-time code change — just a Vercel env update + redeploy.
 */

const DEFAULT_ALLOWLIST = ["ambrose@privatestock.co"];

export function adminAllowedEmails(): string[] {
  const raw = process.env.ADMIN_ALLOWED_EMAILS;
  const emails = raw ? raw.split(",") : DEFAULT_ALLOWLIST;
  return emails.map((e) => e.trim().toLowerCase()).filter(Boolean);
}

export function isAdminEmail(email: string | undefined | null): boolean {
  if (!email) return false;
  return adminAllowedEmails().includes(email.trim().toLowerCase());
}

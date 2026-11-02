/**
 * Bearer check shared by the Vercel cron routes (D-140, D-142). Vercel sends
 * `Authorization: Bearer <CRON_SECRET>`; the same header lets ops run a route
 * by hand. Constant-time compare; an unset secret rejects everything.
 */
export function cronAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  if (header.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < header.length; i++) diff |= header.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}

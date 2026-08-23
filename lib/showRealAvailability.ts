/**
 * PRODUCTION SAFETY GATE for PSM availability data (publish session).
 *
 * While the site runs on MOCK_PSM_DATA (fake Chicago stores / availability
 * seeded behind the flag), production must never show them. This is the ONE
 * place the rule lives:
 *   - MOCK_PSM_DATA=true on a PRODUCTION deployment  → hide availability
 *     (store locator shows "coming soon", product pages drop "Buy Now at the
 *     Below Locations", brand locators render their empty states)
 *   - preview / dev                                   → mock data, unchanged
 *   - real publish pipeline (MOCK_PSM_DATA unset)      → real data everywhere
 * When the PSM publish pipeline lands, unset MOCK_PSM_DATA and this flips by
 * itself — no code change.
 */
export function showRealAvailability(): boolean {
  const mock = process.env.MOCK_PSM_DATA === "true";
  const production = process.env.VERCEL_ENV === "production";
  return !(mock && production);
}

/** True when availability is hidden purely because this is production on mock data. */
export function availabilityComingSoon(): boolean {
  return !showRealAvailability();
}

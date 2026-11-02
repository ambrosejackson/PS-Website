/**
 * PostgREST caps a response at 1,000 rows, so admin reads that can grow past
 * that are fetched in pages. `maxPages` bounds the worst case. (Shared by the
 * P4 admin features; lib/admin/dashboard.ts keeps its own identical copy.)
 */
export async function fetchAll<T>(
  page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
  pageSize = 1000,
  maxPages = 30,
): Promise<T[]> {
  const out: T[] = [];
  for (let i = 0; i < maxPages; i++) {
    const { data, error } = await page(i * pageSize, (i + 1) * pageSize - 1);
    if (error) throw new Error(error.message);
    const rows = data ?? [];
    out.push(...rows);
    if (rows.length < pageSize) break;
  }
  return out;
}

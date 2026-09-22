import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getStaffAccess } from "@/lib/events/staff";
import { getEventBySlug } from "@/lib/events/queries";
import { CheckinApp } from "./CheckinApp";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Check-in", robots: { index: false, follow: false } };

/**
 * /checkin/[slug] — door check-in for admins and check-in-only staff (D-096).
 * Lives outside /admin so check-in staff never touch the admin layout.
 */
export default async function CheckinPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const access = await getStaffAccess();
  if (!access.email) redirect(`/admin/login?next=/checkin/${slug}`);
  if (!access.canCheckIn) {
    return (
      <main className="flex min-h-svh items-center justify-center bg-neutral-950 p-6 text-center text-white">
        <div>
          <p className="font-condensed text-2xl font-bold uppercase">No check-in access</p>
          <p className="mt-2 text-sm text-neutral-400">{access.email} isn&apos;t on the check-in staff list. Ask Ambrose to add you.</p>
          <form action="/admin/logout" method="post" className="mt-6"><button className="underline">Sign out</button></form>
        </div>
      </main>
    );
  }
  const ev = await getEventBySlug(slug);
  if (!ev) notFound();
  return (
    <main className="min-h-svh bg-neutral-950 text-white">
      <div className="mx-auto max-w-lg px-4 pb-16 pt-4">
        <div className="flex items-center justify-between text-xs text-neutral-400">
          <span>{access.email}</span>
          {access.isAdmin && <Link href={`/admin/events/${slug}`} className="underline">Admin</Link>}
        </div>
        <h1 className="mt-2 font-condensed text-3xl font-bold uppercase">{ev.name} check-in</h1>
        <CheckinApp slug={slug} />
      </div>
    </main>
  );
}

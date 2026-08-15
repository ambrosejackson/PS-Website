import Link from "next/link";
import { Logo } from "@/components/site/Logo";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-neutral-950 px-5 text-center text-white">
      <Logo className="h-20 w-auto" />
      <p className="mt-10 font-condensed text-3xl font-bold uppercase tracking-tight">
        PAGE NOT FOUND
      </p>
      <p className="mt-4 text-sm text-white/60">
        The page you&apos;re looking for doesn&apos;t exist or has moved.
      </p>
      <Link
        href="/"
        className="nav-underline mt-8 text-xs font-medium tracking-[0.25em]"
      >
        BACK TO HOME
      </Link>
    </main>
  );
}

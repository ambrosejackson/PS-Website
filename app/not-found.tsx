import Link from "next/link";
import { Header } from "@/components/site/Header";
import { Logo } from "@/components/site/Logo";

export default function NotFound() {
  return (
    <div className="flex min-h-svh flex-col">
      <Header />
      <main className="flex flex-1 flex-col items-center justify-center bg-neutral-950 px-5 text-center text-white">
        <Logo variant="white" className="h-20 w-auto" />
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
    </div>
  );
}

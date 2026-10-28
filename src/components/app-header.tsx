"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createBrowserSupabase } from "@/lib/supabase/browser";

export function AppHeader({ balance, isGuest }: { balance: number | null; isGuest: boolean }) {
  const path = usePathname();
  const router = useRouter();

  async function signOut() {
    await createBrowserSupabase().auth.signOut();
    router.replace("/");
    router.refresh();
  }

  const tab = (href: string, label: string) => (
    <Link
      href={href}
      aria-current={path.startsWith(href) ? "page" : undefined}
      className="rounded-md px-3 py-1.5 text-sm text-muted hover:text-text aria-[current=page]:bg-surface-2 aria-[current=page]:text-text"
    >
      {label}
    </Link>
  );

  return (
    <header className="sticky top-0 z-20 flex items-center gap-2 border-b border-border bg-bg/90 px-4 py-2 backdrop-blur">
      <Link href="/create" className="mr-2 font-semibold">
        Reel
      </Link>
      <nav className="flex gap-1">
        {tab("/create", "Create")}
        {tab("/library", "Library")}
      </nav>
      <div className="ml-auto flex items-center gap-3">
        <Link
          href="/pricing"
          className="rounded-full border border-border bg-surface px-3 py-1 text-sm tabular-nums"
          title="Your credit balance. Click to get more."
        >
          <span className="text-muted">Credits </span>
          {balance ?? "–"}
        </Link>
        {isGuest && <span className="hidden text-xs text-muted sm:inline">Guest</span>}
        <button onClick={signOut} className="text-sm text-muted hover:text-text">
          Sign out
        </button>
      </div>
    </header>
  );
}

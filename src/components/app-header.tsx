"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createBrowserSupabase } from "@/lib/supabase/browser";
import { Logo } from "@/components/logo";

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
      className="whitespace-nowrap rounded-lg px-2.5 py-1.5 text-sm text-muted transition-colors hover:text-text aria-[current=page]:bg-surface-2 aria-[current=page]:text-text sm:px-3"
    >
      {label}
    </Link>
  );

  return (
    <header className="sticky top-0 z-20 flex items-center gap-1 border-b border-border bg-bg/85 px-3 py-2 backdrop-blur sm:gap-2 sm:px-4">
      <Logo href="/create" className="mr-1 sm:mr-3" />
      <nav className="flex gap-0.5 sm:gap-1">
        {tab("/create", "Create")}
        {tab("/library", "Library")}
      </nav>
      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        <Link
          href="/pricing"
          className="flex items-center gap-1.5 whitespace-nowrap rounded-full border border-border bg-surface px-3 py-1 text-sm tabular-nums transition-colors hover:border-muted"
          title="Your credit balance. Click to get more."
        >
          <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" />
          {balance ?? "–"}
          <span className="text-muted">
            <span className="sm:hidden">cr</span>
            <span className="hidden sm:inline">credits</span>
          </span>
        </Link>
        {isGuest && (
          <span className="hidden rounded-full bg-surface-2 px-2 py-0.5 text-xs text-muted sm:inline" title="Your work lives in this browser until you sign in">
            Guest
          </span>
        )}
        <button onClick={signOut} className="whitespace-nowrap text-sm text-muted transition-colors hover:text-text">
          Sign out
        </button>
      </div>
    </header>
  );
}

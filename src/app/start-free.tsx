"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabase } from "@/lib/supabase/browser";

// Starts a guest session straight from the landing page, so "no account needed" is one click.
// If that fails, the sign-in page has the other ways in.
export function StartFree({ className, children }: { className: string; children: React.ReactNode }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function start() {
    setBusy(true);
    const { error } = await createBrowserSupabase().auth.signInAnonymously();
    if (error) return router.push("/sign-in");
    router.replace("/create");
    router.refresh();
  }

  return (
    <button onClick={start} disabled={busy} aria-busy={busy} className={`${className} disabled:opacity-70`}>
      {busy ? "Starting your session…" : children}
    </button>
  );
}

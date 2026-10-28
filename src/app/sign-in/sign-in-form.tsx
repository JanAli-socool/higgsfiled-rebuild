"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createBrowserSupabase } from "@/lib/supabase/browser";

type State = { kind: "idle" } | { kind: "busy" } | { kind: "sent"; email: string } | { kind: "error"; message: string };

export function SignInForm({ google }: { google: boolean }) {
  const supabase = createBrowserSupabase();
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") ?? "/create";
  const [email, setEmail] = useState("");
  const [state, setState] = useState<State>(
    params.get("error") ? { kind: "error", message: "That sign-in link has expired or was already used. Try again." } : { kind: "idle" },
  );
  const busy = state.kind === "busy";
  const callback = () => `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;

  async function sendLink(e: React.FormEvent) {
    e.preventDefault();
    setState({ kind: "busy" });
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: callback() } });
    setState(error ? { kind: "error", message: error.message } : { kind: "sent", email });
  }

  async function withGoogle() {
    setState({ kind: "busy" });
    const { error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: callback() } });
    if (error) setState({ kind: "error", message: error.message });
  }

  async function asGuest() {
    setState({ kind: "busy" });
    const { error } = await supabase.auth.signInAnonymously();
    if (error) return setState({ kind: "error", message: error.message });
    router.replace(next);
    router.refresh();
  }

  if (state.kind === "sent") {
    return (
      <div className="rounded-card border border-border bg-surface p-4" role="status">
        <p className="font-medium">Check your inbox</p>
        <p className="mt-1 text-sm text-muted">
          We sent a sign-in link to <span className="text-text">{state.email}</span>. It works once and expires in an hour.
        </p>
        <button className="mt-3 text-sm text-accent underline" onClick={() => setState({ kind: "idle" })}>
          Use a different email
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <button
        onClick={asGuest}
        disabled={busy}
        className="rounded-card bg-accent px-4 py-3 font-medium text-accent-text disabled:opacity-60"
      >
        Try it now, no account needed
      </button>
      <p className="-mt-2 text-center text-xs text-muted">Guests start with 30 credits.</p>

      <div className="flex items-center gap-3 text-xs text-muted">
        <span className="h-px flex-1 bg-border" /> or keep your work with an account <span className="h-px flex-1 bg-border" />
      </div>

      {google && (
        <button onClick={withGoogle} disabled={busy} className="rounded-card border border-border bg-surface px-4 py-3 disabled:opacity-60">
          Continue with Google
        </button>
      )}

      <form onSubmit={sendLink} className="flex flex-col gap-2">
        <label htmlFor="email" className="text-sm text-muted">
          Email
        </label>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="rounded-card border border-border bg-surface px-3 py-3 placeholder:text-muted"
        />
        <button type="submit" disabled={busy || !email} className="rounded-card border border-border bg-surface-2 px-4 py-3 disabled:opacity-60">
          Email me a sign-in link
        </button>
      </form>

      {state.kind === "error" && (
        <p role="alert" className="text-sm text-danger">
          {state.message}
        </p>
      )}
    </div>
  );
}

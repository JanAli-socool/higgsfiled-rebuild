"use client";

import { useState } from "react";

export function BuyButton({ pack, disabled, featured }: { pack: string; disabled: boolean; featured: boolean }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function buy() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ pack }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.url) throw new Error(data.error ?? "Couldn't open checkout. Try again.");
      window.location.assign(data.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't open checkout. Try again.");
      setBusy(false);
    }
  }

  return (
    <div>
      <button
        onClick={buy}
        disabled={disabled || busy}
        className={`w-full rounded-card px-4 py-2.5 font-medium disabled:opacity-50 ${featured ? "bg-accent text-accent-text" : "border border-border hover:bg-surface-2"}`}
      >
        {busy ? "Opening checkout…" : "Buy"}
      </button>
      {error && (
        <p role="alert" className="mt-2 text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

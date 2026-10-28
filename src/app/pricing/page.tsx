import Link from "next/link";
import { getUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { balanceOf, capabilities } from "@/lib/jobs";
import { MODELS } from "@/lib/models";
import { PACKS, formatPrice, outcomes } from "@/lib/pricing";
import { paymentsEnabled } from "@/lib/stripe";
import { AppHeader } from "@/components/app-header";
import { BuyButton } from "./buy-button";

export const metadata = { title: "Credits · Reel" };
export const dynamic = "force-dynamic";

const REASONS: Record<string, string> = {
  signup_grant: "Welcome credits",
  purchase: "Credit pack",
  generation: "Generation",
  refund: "Refund",
  adjustment: "Adjustment",
};

type LedgerRow = { id: string; delta: number; reason: string; created_at: string; generations: { prompt: string } | null };

export default async function PricingPage({ searchParams }: { searchParams: Promise<{ purchased?: string; pending?: string; cancelled?: string }> }) {
  const [user, params] = await Promise.all([getUser(), searchParams]);
  const isGuest = user?.is_anonymous ?? false;
  const enabled = paymentsEnabled();

  let balance: number | null = null;
  let ledger: LedgerRow[] = [];
  if (user) {
    const [b, { data }] = await Promise.all([
      balanceOf(user.id),
      createAdminClient()
        .from("credit_ledger")
        .select("id, delta, reason, created_at, generations(prompt)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(12)
        .returns<LedgerRow[]>(),
    ]);
    balance = b;
    ledger = data ?? [];
  }

  const canBuy = enabled && !!user && !isGuest;

  return (
    <div className="flex min-h-dvh flex-col">
      {user ? (
        <AppHeader balance={balance} isGuest={isGuest} />
      ) : (
        <header className="flex items-center border-b border-border px-4 py-2">
          <Link href="/" className="font-semibold">
            Reel
          </Link>
          <Link href="/sign-in?next=/pricing" className="ml-auto text-sm text-muted hover:text-text">
            Sign in
          </Link>
        </header>
      )}

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">
        {params.purchased && (
          <p role="status" className="mb-6 rounded-card border border-success/40 bg-success/10 px-4 py-3 text-sm">
            {params.purchased} credits added. Your balance is now {balance}.{" "}
            <Link href="/create" className="underline">
              Back to Create
            </Link>
          </p>
        )}
        {params.pending && (
          <p role="status" className="mb-6 rounded-card border border-border bg-surface px-4 py-3 text-sm">
            We&apos;re still confirming your payment with Stripe. Credits appear here within a minute; refresh to check.
          </p>
        )}
        {params.cancelled && (
          <p role="status" className="mb-6 rounded-card border border-border bg-surface px-4 py-3 text-sm text-muted">
            Checkout cancelled. You weren&apos;t charged.
          </p>
        )}

        <h1 className="text-2xl font-semibold">Credits</h1>
        <p className="mt-2 max-w-2xl text-muted">
          Pay only for what you make. Credits never expire, and anything that fails or that you cancel is refunded automatically.
          {balance !== null && (
            <>
              {" "}
              You have <span className="font-medium text-text tabular-nums">{balance}</span>.
            </>
          )}
        </p>

        {!enabled && (
          <p className="mt-4 rounded-card border border-border bg-surface px-4 py-3 text-sm text-muted">
            Payments aren&apos;t set up on this server yet, so buying is switched off. Everything else works with your free credits.
          </p>
        )}
        {enabled && isGuest && (
          <p className="mt-4 rounded-card border border-border bg-surface px-4 py-3 text-sm text-muted">
            You&apos;re trying Reel as a guest. <Link href="/sign-in?next=/pricing" className="text-text underline">Sign in with email</Link> to buy
            credits, so they belong to an account you can get back into.
          </p>
        )}
        {enabled && !user && (
          <p className="mt-4 text-sm text-muted">
            <Link href="/sign-in?next=/pricing" className="text-text underline">Sign in</Link> to buy credits. New accounts start with 100 free.
          </p>
        )}

        <ul className="mt-8 grid gap-4 md:grid-cols-3">
          {PACKS.map((p) => (
            <li key={p.id} className={`flex flex-col gap-4 rounded-card border bg-surface p-5 ${p.note === "Most picked" ? "border-accent" : "border-border"}`}>
              <div className="flex items-baseline justify-between">
                <h2 className="font-semibold">{p.name}</h2>
                {p.note && <span className="text-xs text-accent">{p.note}</span>}
              </div>
              <p>
                <span className="text-3xl font-semibold">{formatPrice(p.priceCents)}</span>
                <span className="ml-2 text-muted tabular-nums">{p.credits} credits</span>
              </p>
              <div className="text-sm">
                <p className="text-muted">Enough for about</p>
                <ul className="mt-1 space-y-0.5">
                  {outcomes(p.credits).map((o, i) => (
                    <li key={o.label}>
                      {i > 0 && <span className="text-muted">or </span>}
                      <span className="tabular-nums">{o.count}</span> {o.label}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mt-auto">
                <BuyButton pack={p.id} disabled={!canBuy} featured={p.note === "Most picked"} />
              </div>
            </li>
          ))}
        </ul>

        <section className="mt-12 grid gap-10 md:grid-cols-2">
          <div>
            <h2 className="font-semibold">What each take costs</h2>
            <table className="mt-3 w-full text-sm">
              <tbody>
                {MODELS.filter((m) => capabilities().models.includes(m.id)).map((m) => (
                  <tr key={m.id} className="border-b border-border last:border-0">
                    <td className="py-2">
                      {m.label}
                      <span className="block text-xs text-muted">{m.bestFor}</span>
                    </td>
                    <td className="py-2 text-right tabular-nums">
                      {m.cost} {m.cost === 1 ? "credit" : "credits"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {user && (
            <div>
              <h2 className="font-semibold">Recent activity</h2>
              {ledger.length === 0 ? (
                <p className="mt-3 text-sm text-muted">Nothing yet.</p>
              ) : (
                <ul className="mt-3 text-sm">
                  {ledger.map((r) => (
                    <li key={r.id} className="flex items-center gap-3 border-b border-border py-2 last:border-0">
                      <span className="min-w-0 flex-1">
                        {REASONS[r.reason] ?? r.reason}
                        {r.generations?.prompt && <span className="block truncate text-xs text-muted">{r.generations.prompt}</span>}
                      </span>
                      <span className="shrink-0 text-xs text-muted">{new Date(r.created_at).toLocaleDateString()}</span>
                      <span className={`w-12 shrink-0 text-right tabular-nums ${r.delta > 0 ? "text-success" : ""}`}>
                        {r.delta > 0 ? `+${r.delta}` : r.delta}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

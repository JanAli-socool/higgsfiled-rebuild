import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPack, type Pack } from "@/lib/pricing";

// Stripe's REST API called directly: three calls don't justify the SDK.
const API = "https://api.stripe.com/v1";

export const paymentsEnabled = () => !!process.env.STRIPE_SECRET_KEY;

type Session = {
  id: string;
  url: string | null;
  payment_status: "paid" | "unpaid" | "no_payment_required";
  metadata: { user_id?: string; pack?: string };
};

async function stripe<T>(path: string, init?: { form: Record<string, string> }): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method: init ? "POST" : "GET",
    headers: {
      authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
      ...(init && { "content-type": "application/x-www-form-urlencoded" }),
    },
    body: init ? new URLSearchParams(init.form) : undefined,
    cache: "no-store",
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message ?? `Stripe error ${res.status}`);
  return data as T;
}

export async function createCheckout(opts: { pack: Pack; userId: string; email?: string; origin: string }) {
  const { pack, userId, email, origin } = opts;
  const form: Record<string, string> = {
    mode: "payment",
    "line_items[0][quantity]": "1",
    "line_items[0][price_data][currency]": "usd",
    "line_items[0][price_data][unit_amount]": String(pack.priceCents),
    "line_items[0][price_data][product_data][name]": `Reel ${pack.name}: ${pack.credits} credits`,
    client_reference_id: userId,
    "metadata[user_id]": userId,
    "metadata[pack]": pack.id,
    success_url: `${origin}/pricing/return?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/pricing?cancelled=1`,
  };
  if (email) form.customer_email = email;
  return stripe<Session>("/checkout/sessions", { form });
}

// Grants a paid session's credits exactly once: the ledger's unique index on the session id
// makes the return page and the webhook safe to race each other.
export async function fulfill(sessionId: string) {
  const session = await stripe<Session>(`/checkout/sessions/${encodeURIComponent(sessionId)}`);
  const pack = getPack(session.metadata.pack ?? "");
  const userId = session.metadata.user_id;
  if (session.payment_status !== "paid" || !pack || !userId) return null;
  const { error } = await createAdminClient().rpc("grant_credits", {
    p_user: userId,
    p_amount: pack.credits,
    p_reason: "purchase",
    p_stripe_session: session.id,
  });
  if (error) throw error;
  return { userId, pack };
}

// Checks the Stripe-Signature header (HMAC-SHA256 over "timestamp.body"), rejecting replays older than 5 minutes.
export function verifyWebhook(body: string, header: string | null, secret: string) {
  const parts = Object.fromEntries((header ?? "").split(",").map((kv) => kv.split("=") as [string, string]));
  const signatures = (header ?? "").split(",").filter((kv) => kv.startsWith("v1=")).map((kv) => kv.slice(3));
  const t = Number(parts.t);
  if (!t || !signatures.length || Math.abs(Date.now() / 1000 - t) > 300) return false;
  const expected = Buffer.from(createHmac("sha256", secret).update(`${t}.${body}`).digest("hex"));
  return signatures.some((s) => {
    const got = Buffer.from(s);
    return got.length === expected.length && timingSafeEqual(got, expected);
  });
}

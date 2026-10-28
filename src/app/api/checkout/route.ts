import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getUser } from "@/lib/supabase/server";
import { getPack } from "@/lib/pricing";
import { createCheckout, paymentsEnabled } from "@/lib/stripe";

const schema = z.object({ pack: z.string() });

// Starts a Stripe Checkout session for one credit pack and returns its URL.
export async function POST(request: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Sign in first" }, { status: 401 });
  if (user.is_anonymous) {
    return NextResponse.json({ error: "Sign in with email to buy credits, so they belong to an account you can get back into." }, { status: 403 });
  }
  if (!paymentsEnabled()) return NextResponse.json({ error: "Payments aren't set up on this server yet." }, { status: 503 });

  const parsed = schema.safeParse(await request.json().catch(() => null));
  const pack = parsed.success ? getPack(parsed.data.pack) : undefined;
  if (!pack) return NextResponse.json({ error: "Unknown pack" }, { status: 400 });

  const origin = process.env.PUBLIC_URL?.replace(/\/$/, "") || request.nextUrl.origin;
  try {
    const session = await createCheckout({ pack, userId: user.id, email: user.email, origin });
    return NextResponse.json({ url: session.url });
  } catch (e) {
    console.error("checkout failed", e);
    return NextResponse.json({ error: "Couldn't open checkout. Try again in a moment." }, { status: 502 });
  }
}

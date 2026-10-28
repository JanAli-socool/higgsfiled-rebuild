import { NextResponse } from "next/server";
import { fulfill, verifyWebhook } from "@/lib/stripe";

// Backup path for credits when the buyer closes the tab before the return page loads.
// Needs STRIPE_WEBHOOK_SECRET (from the Stripe dashboard after deploy, or `stripe listen` locally).
export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });

  const body = await request.text();
  if (!verifyWebhook(body, request.headers.get("stripe-signature"), secret)) {
    return NextResponse.json({ error: "Bad signature" }, { status: 400 });
  }

  const event = JSON.parse(body) as { type: string; data: { object: { id: string } } };
  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
    // Re-reads the session from Stripe rather than trusting the payload; idempotent per session.
    await fulfill(event.data.object.id);
  }
  return NextResponse.json({ received: true });
}

import { NextResponse, type NextRequest } from "next/server";
import { fulfill, paymentsEnabled } from "@/lib/stripe";

// Stripe sends the buyer back here. We ask Stripe directly whether the session was paid,
// so credits arrive even without a webhook (local dev). The webhook does the same, once.
export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get("session_id");
  const to = new URL("/pricing", request.nextUrl.origin);
  if (!sessionId || !paymentsEnabled()) return NextResponse.redirect(to);
  try {
    const done = await fulfill(sessionId);
    to.searchParams.set(done ? "purchased" : "pending", done ? String(done.pack.credits) : "1");
  } catch (e) {
    console.error("fulfil on return failed", e);
    to.searchParams.set("pending", "1");
  }
  return NextResponse.redirect(to);
}

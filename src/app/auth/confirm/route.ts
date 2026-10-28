import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createSessionClient } from "@/lib/supabase/server";

// Email links that carry a token hash (works even when opened in a different browser,
// unlike the code flow in /auth/callback).
export async function GET(request: NextRequest) {
  const p = request.nextUrl.searchParams;
  const tokenHash = p.get("token_hash");
  const type = p.get("type") as EmailOtpType | null;
  const next = p.get("next");
  const dest = next?.startsWith("/") && !next.startsWith("//") ? next : "/create";
  if (tokenHash && type) {
    const supabase = await createSessionClient();
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    if (!error) return NextResponse.redirect(new URL(dest, request.url));
  }
  return NextResponse.redirect(new URL("/sign-in?error=link", request.url));
}

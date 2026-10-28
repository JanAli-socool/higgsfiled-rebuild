import { NextResponse, type NextRequest } from "next/server";
import { createSessionClient } from "@/lib/supabase/server";

// Magic-link and OAuth both land here with a one-time code.
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const next = request.nextUrl.searchParams.get("next");
  const dest = next?.startsWith("/") && !next.startsWith("//") ? next : "/create";
  if (code) {
    const supabase = await createSessionClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(dest, request.url));
  }
  return NextResponse.redirect(new URL("/sign-in?error=link", request.url));
}

import { NextResponse, type NextRequest } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { JobError, balanceOf, capabilities, createGenerations, createSchema, listGenerations } from "@/lib/jobs";

// Blocking providers finish inside after(), which shares this budget. A free-Space video takes
// ~60–90 s plus any queue; Vercel allows up to 300 s.
export const maxDuration = 300;

export async function GET(request: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Sign in first" }, { status: 401 });
  const p = request.nextUrl.searchParams;
  const kind = p.get("kind");
  const [items, balance] = await Promise.all([
    listGenerations(user.id, {
      kind: kind === "image" || kind === "video" ? kind : undefined,
      q: p.get("q") ?? undefined,
      before: p.get("before") ?? undefined,
    }),
    balanceOf(user.id),
  ]);
  return NextResponse.json({ items, balance, capabilities: capabilities() });
}

export async function POST(request: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Sign in first" }, { status: 401 });
  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request" }, { status: 400 });
  }
  try {
    return NextResponse.json(await createGenerations(user.id, parsed.data), { status: 201 });
  } catch (e) {
    if (e instanceof JobError) return NextResponse.json({ error: e.message, code: e.code }, { status: e.status });
    console.error("create generation failed", e);
    return NextResponse.json({ error: "Something went wrong. You were not charged." }, { status: 500 });
  }
}

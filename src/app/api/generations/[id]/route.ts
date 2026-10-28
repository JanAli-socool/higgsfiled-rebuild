import { NextResponse } from "next/server";
import { z } from "zod";
import { getUser } from "@/lib/supabase/server";
import { JobError, trashGeneration } from "@/lib/jobs";

type Ctx = { params: Promise<{ id: string }> };

// DELETE moves a finished take to the trash; POST { restore: true } brings it back (the Undo in the library).
export async function DELETE(_request: Request, ctx: Ctx) {
  return handle(ctx, false);
}

export async function POST(request: Request, ctx: Ctx) {
  const body = z.object({ restore: z.literal(true) }).safeParse(await request.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  return handle(ctx, true);
}

async function handle(ctx: Ctx, restore: boolean) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Sign in first" }, { status: 401 });
  const { id } = await ctx.params;
  if (!z.string().uuid().safeParse(id).success) return NextResponse.json({ error: "Not found" }, { status: 404 });
  try {
    await trashGeneration(user.id, id, restore);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof JobError) return NextResponse.json({ error: e.message, code: e.code }, { status: e.status });
    throw e;
  }
}

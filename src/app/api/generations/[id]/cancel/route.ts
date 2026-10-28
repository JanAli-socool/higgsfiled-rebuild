import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { JobError, cancelGeneration } from "@/lib/jobs";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Sign in first" }, { status: 401 });
  const { id } = await params;
  try {
    return NextResponse.json(await cancelGeneration(user.id, id));
  } catch (e) {
    if (e instanceof JobError) return NextResponse.json({ error: e.message, code: e.code }, { status: e.status });
    throw e;
  }
}

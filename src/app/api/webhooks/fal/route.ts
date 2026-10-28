import { NextResponse, type NextRequest } from "next/server";
import { getGenerationById, syncGeneration } from "@/lib/jobs";

// fal calls this when a job finishes. We treat it only as a nudge: syncGeneration
// re-reads the result from fal with our own key, so a forged call can't fake an output.
export async function POST(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  if (!id || !/^[0-9a-f-]{36}$/.test(id)) return NextResponse.json({ ok: true });
  const row = await getGenerationById(id);
  if (row) await syncGeneration(row);
  return NextResponse.json({ ok: true });
}

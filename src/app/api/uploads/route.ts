import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const MAX_BYTES = 10 * 1024 * 1024;
const EXT = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" } as const;

const schema = z.object({
  mime: z.enum(["image/png", "image/jpeg", "image/webp"], { message: "Use a PNG, JPEG or WebP image" }),
  bytes: z.number().int().positive().max(MAX_BYTES, "Images can be up to 10 MB"),
});

// Hands out a one-time signed upload URL. The browser sends the file straight to Storage,
// so large images never pass through (or time out) our function.
export async function POST(request: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Sign in first" }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid file" }, { status: 400 });

  const db = createAdminClient();
  const object = `${user.id}/${crypto.randomUUID()}.${EXT[parsed.data.mime]}`;
  const { data, error } = await db.storage.from("uploads").createSignedUploadUrl(object);
  if (error || !data) return NextResponse.json({ error: "Couldn't start the upload. Try again." }, { status: 500 });

  const path = `uploads/${object}`;
  const { error: rowError } = await db.from("uploads").insert({ user_id: user.id, path, mime: parsed.data.mime, bytes: parsed.data.bytes });
  if (rowError) return NextResponse.json({ error: "Couldn't start the upload. Try again." }, { status: 500 });

  return NextResponse.json({ path, object, token: data.token });
}

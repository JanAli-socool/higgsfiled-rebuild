"use client";

import { createBrowserSupabase } from "@/lib/supabase/browser";

export const UPLOAD_TYPES = ["image/png", "image/jpeg", "image/webp"];
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

// Asks the server for a one-time signed URL, then sends the file straight to Storage.
// Returns the storage path to use as a reference or start image.
export async function uploadImage(file: Blob): Promise<string> {
  if (!UPLOAD_TYPES.includes(file.type)) throw new Error("Use a PNG, JPEG or WebP image.");
  if (file.size > MAX_UPLOAD_BYTES) throw new Error("Images can be up to 10 MB.");
  const res = await fetch("/api/uploads", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ mime: file.type, bytes: file.size }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "Upload failed. Try again.");
  const { error } = await createBrowserSupabase()
    .storage.from("uploads")
    .uploadToSignedUrl(data.object, data.token, file, { contentType: file.type });
  if (error) throw new Error("Upload failed. Try again.");
  return data.path as string;
}

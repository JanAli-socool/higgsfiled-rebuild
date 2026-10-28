"use client";

import { DEFAULT_MODEL } from "@/lib/models";
import type { Generation } from "@/lib/types";
import type { Draft } from "@/components/draft";
import { uploadImage } from "@/components/upload";

// Free video models stop at 5 s. Longer shots are built the way editors chain takes:
// the next clip starts from the exact last frame of the previous one, linked by parent_id.

export const canExtend = (g: Generation) => g.kind === "video" && g.status === "succeeded" && !!g.outputPath?.endsWith(".mp4");

// Grabs the final frame of a clip as a PNG. Storage serves CORS headers, so the canvas isn't tainted.
async function lastFrame(url: string): Promise<Blob> {
  const video = document.createElement("video");
  video.crossOrigin = "anonymous";
  video.muted = true;
  video.preload = "auto";
  video.src = url;
  await new Promise<void>((resolve, reject) => {
    video.onloadedmetadata = () => resolve();
    video.onerror = () => reject(new Error("Couldn't read this clip"));
  });
  await new Promise<void>((resolve, reject) => {
    video.onseeked = () => resolve();
    video.onerror = () => reject(new Error("Couldn't read this clip"));
    video.currentTime = Math.max(0, video.duration - 0.05);
  });
  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  canvas.getContext("2d")!.drawImage(video, 0, 0);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  video.removeAttribute("src");
  if (!blob) throw new Error("Couldn't read this clip");
  return blob;
}

// The next clip: same prompt (edit it to change what happens next), the last frame as its start.
export async function extendDraft(g: Generation): Promise<Draft> {
  const frame = await lastFrame(g.outputUrl!);
  const path = await uploadImage(frame);
  return {
    kind: "video",
    modelId: DEFAULT_MODEL.video,
    prompt: g.prompt,
    aspect: g.aspect,
    count: 1,
    input: { path, url: URL.createObjectURL(frame) },
    parentId: g.id,
  };
}

// The clips that make up a shot, oldest first: walk back through parents while they're videos.
export function shotOf(g: Generation, all: Generation[]): Generation[] {
  const chain = [g];
  let cur = g;
  while (cur.parentId) {
    const parent = all.find((x) => x.id === cur.parentId);
    if (!parent || !canExtend(parent)) break;
    chain.unshift(parent);
    cur = parent;
  }
  return chain;
}

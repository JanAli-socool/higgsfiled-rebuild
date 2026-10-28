import "server-only";
import type { Aspect } from "@/lib/models";
import { ProviderJobFailed, type ModelProvider } from "./types";

// Free, keyless image API (pollinations.ai). One blocking GET per image, ~10–40 s.
// Its free tier doesn't follow reference images and stamps a small watermark.
// Video isn't offered, so video stays on another provider.

const RATIO: Record<Aspect, [number, number]> = {
  "1:1": [1, 1],
  "3:4": [3, 4],
  "9:16": [9, 16],
  "4:3": [4, 3],
  "16:9": [16, 9],
};

// "Fast" and "High quality" differ in resolution and prompt enhancement, so the price gap is real.
function size(modelId: string, aspect: Aspect) {
  const long = modelId === "img-quality" ? 1024 : 512;
  const [w, h] = RATIO[aspect];
  const scale = long / Math.max(w, h);
  return { width: Math.round((w * scale) / 8) * 8, height: Math.round((h * scale) / 8) * 8 };
}

// requestId = "pollinations::<seed>"; the URL is rebuilt from the job, so it stays short.
function url(prompt: string, modelId: string, aspect: Aspect, seed: string) {
  const { width, height } = size(modelId, aspect);
  const q = new URLSearchParams({
    width: String(width),
    height: String(height),
    seed,
    nologo: "true",
    model: "flux",
    ...(modelId === "img-quality" ? { enhance: "true" } : {}),
  });
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?${q}`;
}

export const pollinationsProvider: ModelProvider = {
  name: "pollinations",
  blocking: true,
  supportsReference: false,
  typicalSeconds: (modelId) => (modelId === "img-quality" ? 35 : 20),

  async submit(input) {
    if (input.kind !== "image") throw new Error("Pollinations only makes images");
    return `pollinations::${Math.floor(Math.random() * 2 ** 31)}`;
  },

  async status() {
    return "running"; // completed by the background task, never by polling
  },

  async result(job) {
    const seed = job.requestId.split("::")[1];
    let res: Response;
    try {
      res = await fetch(url(job.prompt, job.modelId, job.aspect, seed), { signal: AbortSignal.timeout(90_000) });
    } catch {
      throw new ProviderJobFailed("The image service didn't answer in time");
    }
    const type = res.headers.get("content-type") ?? "";
    if (!res.ok || !type.startsWith("image/")) {
      // The keyless tier allows one image per 45 s per IP and answers 402 FREE_LIMIT past that.
      const limited = res.status === 402 || res.status === 429;
      throw new ProviderJobFailed(
        limited ? "The free image service allows one image every 45 seconds. Try again shortly." : `The image service failed (${res.status})`,
      );
    }
    const { width, height } = size(job.modelId, job.aspect);
    return { bytes: new Uint8Array(await res.arrayBuffer()), contentType: type, ext: type.includes("png") ? "png" : "jpg", width, height };
  },

  async cancel() {},
};

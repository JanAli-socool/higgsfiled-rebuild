import "server-only";
import type { Aspect } from "@/lib/models";
import { ProviderJobFailed, type ModelProvider } from "./types";

// Text-to-video and image-to-video with Google Veo 3.1 through KIE (paid credits, KIE_API_KEY).
// The top-level model is always "veo-3-1"; the tier goes in input.model:
// veo3_lite, veo3_fast or veo3 (Quality), each at 720p or 1080p. KIE credits per clip:
// Lite 30 / 35, Fast 60 / 65, Quality 250 / 255. Lite at 1080p is the default: the sharpest
// frame for the least money. Veo makes 8 s clips with sound. Checked against docs.kie.ai on 2026-10-30.

const API = "https://api.kie.ai/api/v1/jobs";
const TIER = process.env.KIE_VEO_MODEL || "veo3_lite";
const RESOLUTION = process.env.KIE_VEO_RESOLUTION || "1080p";
// Veo offers 4, 6 or 8 s at the same price per clip, so Reel always asks for the longest.
const CLIP_SECONDS = 8;

// Veo renders 16:9 or 9:16 only; square frames are centre-cropped by "Auto".
const ASPECT: Record<Aspect, string> = { "1:1": "Auto", "3:4": "9:16", "9:16": "9:16", "4:3": "16:9", "16:9": "16:9" };

type Task = { state: "waiting" | "queuing" | "generating" | "success" | "fail"; resultJson?: string; failMsg?: string };

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${process.env.KIE_API_KEY}`, "Content-Type": "application/json" },
    cache: "no-store",
  });
  const body = (await res.json().catch(() => null)) as { code?: number; msg?: string; data?: T } | null;
  if (!res.ok || body?.code !== 200 || !body.data) {
    // KIE's own "top up" message reads as if the user were out of credits; it's our account.
    if (/insufficient|balance|top up/i.test(body?.msg ?? "")) throw new Error("the video service is out of capacity right now. Try again later");
    throw new Error(body?.msg || `KIE request failed (${res.status})`);
  }
  return body.data;
}

async function task(requestId: string) {
  return call<Task>(`/recordInfo?taskId=${encodeURIComponent(requestId)}`);
}

export const kieProvider: ModelProvider = {
  name: "kie",
  supportsReference: false,
  textToVideo: true,
  supportedModels: ["vid-5s"],
  modelLabels: { "vid-5s": "Veo 3.1" },
  typicalSeconds: () => 90,
  qualityNote: `Google Veo 3.1 at ${RESOLUTION} with sound. Add a start image to set the first frame, or let the prompt do it all. Reel picks the clip length; Extend keeps a shot going.`,

  async submit(input) {
    if (input.kind !== "video") throw new Error("This provider only makes video");
    // With a start image Veo animates it; without one it makes the clip from the prompt alone.
    const start = input.inputImageUrl
      ? { image_urls: [input.inputImageUrl], generation_type: "FIRST_AND_LAST_FRAMES_2_VIDEO", aspect_ratio: ASPECT[input.aspect] }
      : { generation_type: "TEXT_2_VIDEO", aspect_ratio: ASPECT[input.aspect] === "9:16" ? "9:16" : "16:9" };
    const data = await call<{ taskId: string }>("/createTask", {
      method: "POST",
      body: JSON.stringify({
        model: "veo-3-1",
        input: {
          model: TIER,
          prompt: input.prompt,
          ...start,
          resolution: RESOLUTION,
          duration: CLIP_SECONDS,
        },
      }),
    });
    return data.taskId;
  },

  async status(job) {
    const t = await task(job.requestId);
    if (t.state === "success" || t.state === "fail") return "completed";
    return t.state === "generating" ? "running" : "queued";
  },

  async result(job) {
    const t = await task(job.requestId);
    if (t.state === "fail") throw new ProviderJobFailed(`The video model failed: ${(t.failMsg || "no reason given").slice(0, 160)}`);
    // 720p comes back in resultUrls. Per the docs, 1080p is in data.result_urls with the 720p
    // copy in data.origin_urls, so take the sharpest one present.
    let url: string | undefined;
    try {
      const r = JSON.parse(t.resultJson || "{}") as { resultUrls?: string[]; data?: { result_urls?: string[]; origin_urls?: string[] } };
      url = r.data?.result_urls?.[0] ?? r.resultUrls?.[0] ?? r.data?.origin_urls?.[0];
    } catch {}
    if (!url) throw new ProviderJobFailed("The video model returned no file");

    const res = await fetch(url);
    if (!res.ok) throw new ProviderJobFailed(`Couldn't download the video (${res.status})`);
    return {
      bytes: new Uint8Array(await res.arrayBuffer()),
      contentType: "video/mp4",
      ext: "mp4",
      durationSeconds: CLIP_SECONDS,
    };
  },

  async cancel() {
    // KIE has no cancel endpoint; our cancel still refunds and discards the result.
  },
};

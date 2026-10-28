import "server-only";
import { fal } from "@fal-ai/client";
import type { Aspect } from "@/lib/models";
import { getModel } from "@/lib/models";
import { ProviderJobFailed, type ModelProvider, type SubmitInput } from "./types";

fal.config({ credentials: process.env.FAL_KEY });

const IMAGE_SIZE: Record<Aspect, string> = {
  "1:1": "square_hd",
  "3:4": "portrait_4_3",
  "9:16": "portrait_16_9",
  "4:3": "landscape_4_3",
  "16:9": "landscape_16_9",
};

// Model ids checked against fal's model pages on 2026-10-27.
function route(input: SubmitInput): { endpoint: string; body: Record<string, unknown> } {
  const model = getModel(input.modelId)!;
  if (model.kind === "video") {
    return {
      endpoint: "fal-ai/kling-video/v3/standard/image-to-video",
      body: { prompt: input.prompt, start_image_url: input.inputImageUrl, duration: String(model.durationSeconds), generate_audio: false },
    };
  }
  if (input.inputImageUrl) {
    return {
      endpoint: "fal-ai/flux/dev/image-to-image",
      body: { prompt: input.prompt, image_url: input.inputImageUrl, strength: 0.85, num_images: 1 },
    };
  }
  return input.modelId === "img-quality"
    ? { endpoint: "fal-ai/flux/dev", body: { prompt: input.prompt, image_size: IMAGE_SIZE[input.aspect], num_images: 1 } }
    : { endpoint: "fal-ai/flux/schnell", body: { prompt: input.prompt, image_size: IMAGE_SIZE[input.aspect], num_images: 1 } };
}

// We store "<endpoint>::<request id>" because status and result need the endpoint too.
function split(requestId: string) {
  const [endpoint, id] = requestId.split("::");
  return { endpoint, id };
}

type FalMedia = { url: string; content_type?: string; width?: number; height?: number };

export const falProvider: ModelProvider = {
  name: "fal",
  supportsReference: true,

  async submit(input) {
    const { endpoint, body } = route(input);
    const { request_id } = await fal.queue.submit(endpoint, { input: body, webhookUrl: input.webhookUrl });
    return `${endpoint}::${request_id}`;
  },

  async status(job) {
    const { endpoint, id } = split(job.requestId);
    const s = await fal.queue.status(endpoint, { requestId: id });
    if (s.status === "COMPLETED") return "completed";
    return s.status === "IN_PROGRESS" ? "running" : "queued";
  },

  async result(job) {
    const { endpoint, id } = split(job.requestId);
    let data: { images?: FalMedia[]; video?: FalMedia };
    try {
      ({ data } = await fal.queue.result(endpoint, { requestId: id }));
    } catch (e) {
      throw new ProviderJobFailed(e instanceof Error ? e.message : "The model could not finish this job");
    }
    const media = job.kind === "video" ? data.video : data.images?.[0];
    if (!media?.url) throw new ProviderJobFailed("The model returned no output");
    const res = await fetch(media.url);
    if (!res.ok) throw new ProviderJobFailed(`Could not download the output (${res.status})`);
    const contentType = media.content_type || res.headers.get("content-type") || (job.kind === "video" ? "video/mp4" : "image/jpeg");
    return {
      bytes: new Uint8Array(await res.arrayBuffer()),
      contentType,
      ext: contentType.includes("mp4") ? "mp4" : contentType.includes("png") ? "png" : contentType.includes("webp") ? "webp" : "jpg",
      width: media.width,
      height: media.height,
      durationSeconds: job.kind === "video" ? getModel(job.modelId)?.durationSeconds : undefined,
    };
  },

  async cancel(job) {
    const { endpoint, id } = split(job.requestId);
    await fal.queue.cancel(endpoint, { requestId: id }).catch(() => {});
  },
};

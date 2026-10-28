import "server-only";
import { Client, handle_file } from "@gradio/client";
import { ProviderJobFailed, type ModelProvider } from "./types";

// Image-to-video on a public Hugging Face ZeroGPU Space running Wan 2.2 (14B, fp8, 6-step).
// Free: the GPU time comes out of the caller's daily ZeroGPU quota (about 2 min anonymous,
// 5 min with a free account's HF_TOKEN). A 5 s clip reserves ~70 s, so expect a handful a day.
// The Space caps clips at 5 s, 832×480, 16 fps. Verified live on 2026-10-27 (≈60 s per clip).

const SPACE = process.env.HF_VIDEO_SPACE || "zerogpu-aoti/wan2-2-fp8da-aoti-faster";
const MAX_SECONDS = 5;

export const huggingfaceProvider: ModelProvider = {
  name: "huggingface",
  blocking: true,
  supportsReference: true,
  supportedModels: ["vid-5s"],
  typicalSeconds: () => 75,
  qualityNote: "Free video model: about 480p at 16 fps, 5 s per clip. Start from a sharp image, and use Extend on a finished clip for longer shots.",

  async submit(input) {
    if (input.kind !== "video") throw new Error("This provider only animates images");
    if (!input.inputImageUrl) throw new Error("A start image is required");
    // The signed start-frame URL is re-created at run time, so only a seed travels in the id.
    return `huggingface::${Math.floor(Math.random() * 2 ** 31)}`;
  },

  async status() {
    return "running"; // completed by the background task, never by polling
  },

  async result(job) {
    if (!job.inputImageUrl) throw new ProviderJobFailed("The start image is missing");
    const seed = Number(job.requestId.split("::")[1]);

    const image = await fetch(job.inputImageUrl).then((r) => (r.ok ? r.blob() : null)).catch(() => null);
    if (!image) throw new ProviderJobFailed("Couldn't read the start image");
    if (image.type.includes("svg")) throw new ProviderJobFailed("Placeholder images can't be animated. Make a real image first.");

    let file: { url?: string } | undefined;
    try {
      const token = process.env.HF_TOKEN as `hf_${string}` | undefined;
      const app = await Client.connect(SPACE, token ? { token } : {});
      const res = await app.predict("/generate_video", {
        input_image: handle_file(image),
        prompt: job.prompt,
        duration_seconds: MAX_SECONDS,
        seed,
        randomize_seed: false,
      });
      file = (res.data as [{ url?: string }, number])[0];
    } catch (e) {
      throw new ProviderJobFailed(explain(e));
    }
    if (!file?.url) throw new ProviderJobFailed("The video model returned no file");

    const res = await fetch(file.url);
    if (!res.ok) throw new ProviderJobFailed(`Couldn't download the video (${res.status})`);
    return {
      bytes: new Uint8Array(await res.arrayBuffer()),
      contentType: "video/mp4",
      ext: "mp4",
      // Size follows the start image's orientation (e.g. 480×832 for portrait), so we don't guess it.
      durationSeconds: MAX_SECONDS,
    };
  },

  async cancel() {
    // Gradio can't stop a ZeroGPU job once it runs; our cancel still refunds and discards the result.
  },
};

function explain(e: unknown) {
  const msg = (e as { message?: string })?.message ?? String(e);
  if (/quota|exceeded|GPU.*(limit|time)/i.test(msg)) {
    // e.g. "...ZeroGPU quota (150s requested vs. 126s left). Try again in 23:53:40."
    const wait = msg.match(/Try again in (\d+):(\d+)/);
    const when = wait ? (Number(wait[1]) >= 1 ? `in about ${Number(wait[1])} h` : `in ${Number(wait[2])} min`) : "within 24 hours";
    return `Today's free video allowance is used up. It resets ${when}.`;
  }
  if (/sleep|paused|build|runtime error|not found|404|503/i.test(msg)) return "The free video model is offline right now. Try again later.";
  return `The video model failed: ${msg.slice(0, 160)}`;
}

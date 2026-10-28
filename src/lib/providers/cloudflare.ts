import "server-only";
import { ProviderJobFailed, type ModelProvider } from "./types";

// Cloudflare Workers AI: FLUX.1 schnell on a free daily quota (account id + API token
// with the "Workers AI" permission). One blocking call, a few seconds, square output.
// It takes no reference image and no size, so both image models map to it, with more
// denoising steps for "High quality".

const MODEL = "@cf/black-forest-labs/flux-1-schnell";

export const cloudflareProvider: ModelProvider = {
  name: "cloudflare",
  blocking: true,
  supportsReference: false,
  typicalSeconds: (modelId) => (modelId === "img-quality" ? 8 : 4),

  async submit(input) {
    if (input.kind !== "image") throw new Error("Workers AI is only used for images here");
    if (!process.env.CLOUDFLARE_ACCOUNT_ID || !process.env.CLOUDFLARE_API_TOKEN) throw new Error("Cloudflare credentials are missing");
    return `cloudflare::${Math.floor(Math.random() * 2 ** 31)}`;
  },

  async status() {
    return "running"; // completed by the background task, never by polling
  },

  async result(job) {
    const seed = Number(job.requestId.split("::")[1]);
    const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/ai/run/${MODEL}`, {
      method: "POST",
      headers: { authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`, "content-type": "application/json" },
      body: JSON.stringify({ prompt: job.prompt, steps: job.modelId === "img-quality" ? 8 : 4, seed }),
      signal: AbortSignal.timeout(60_000),
    }).catch(() => null);
    if (!res) throw new ProviderJobFailed("The image service didn't answer in time");
    const data = (await res.json().catch(() => null)) as { success?: boolean; result?: { image?: string }; errors?: { message: string }[] } | null;
    if (!res.ok || !data?.result?.image) {
      const msg = data?.errors?.[0]?.message ?? `status ${res.status}`;
      throw new ProviderJobFailed(res.status === 429 ? "Today's free image quota is used up. Try again tomorrow." : `The image service failed: ${msg}`);
    }
    return { bytes: Buffer.from(data.result.image, "base64"), contentType: "image/jpeg", ext: "jpg", width: 1024, height: 1024 };
  },

  async cancel() {},
};

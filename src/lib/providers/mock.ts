import "server-only";
import type { Aspect } from "@/lib/models";
import { ProviderJobFailed, type ModelProvider } from "./types";

// A stand-in for real models: same lifecycle and timing shape, no cost.
// It renders an SVG from the prompt. Prompts containing "fail-test" fail, to exercise refunds.

const TIMINGS: Record<string, { queue: number; run: number }> = {
  "img-fast": { queue: 800, run: 2500 },
  "img-quality": { queue: 1000, run: 6000 },
  "vid-5s": { queue: 1500, run: 10000 },
  "vid-10s": { queue: 1500, run: 15000 },
};

const SIZE: Record<Aspect, [number, number]> = {
  "1:1": [1024, 1024],
  "3:4": [960, 1280],
  "9:16": [900, 1600],
  "4:3": [1280, 960],
  "16:9": [1600, 900],
};

function hash(s: string) {
  let h = 2166136261;
  for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
}

function escape(s: string) {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
}

function wrap(text: string, width: number) {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/)) {
    if ((line + " " + word).trim().length > width) {
      lines.push(line.trim());
      line = word;
    } else line += " " + word;
  }
  if (line.trim()) lines.push(line.trim());
  return lines.slice(0, 6);
}

function render(prompt: string, aspect: Aspect, animated: boolean, take: string) {
  const [w, h] = SIZE[aspect];
  const seed = hash(prompt + take); // each take looks different, like a real seed
  const hue = seed % 360;
  const hue2 = (hue + 40 + (seed % 80)) % 360;
  const lines = wrap(prompt, Math.round(w / 34));
  const motion = animated
    ? `<animateTransform attributeName="transform" type="scale" values="1;1.12;1" dur="6s" repeatCount="indefinite" additive="sum"/>`
    : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
<stop offset="0" stop-color="hsl(${hue} 55% 38%)"/><stop offset="1" stop-color="hsl(${hue2} 60% 18%)"/></linearGradient></defs>
<g transform-origin="${w / 2} ${h / 2}"><rect width="${w}" height="${h}" fill="url(#g)"/>
<circle cx="${w * 0.7}" cy="${h * 0.3}" r="${Math.min(w, h) * 0.18}" fill="hsl(${hue2} 80% 70% / 0.35)"/>${motion}</g>
<text x="48" y="${h - 48 - (lines.length - 1) * 40}" font-family="system-ui, sans-serif" font-size="30" fill="white" opacity="0.92">
${lines.map((l, i) => `<tspan x="48" dy="${i ? 40 : 0}">${escape(l)}</tspan>`).join("")}</text>
<text x="48" y="64" font-family="system-ui, sans-serif" font-size="22" fill="white" opacity="0.6">PREVIEW · mock ${animated ? "video" : "image"}</text>
</svg>`;
}

export const mockProvider: ModelProvider = {
  name: "mock",
  supportsReference: true,

  async submit() {
    return `mock::${Date.now()}::${Math.random().toString(36).slice(2, 8)}`;
  },

  async status(job) {
    const startedAt = Number(job.requestId.split("::")[1]);
    const t = TIMINGS[job.modelId] ?? TIMINGS["img-fast"];
    const elapsed = Date.now() - startedAt;
    if (elapsed < t.queue) return "queued";
    return elapsed < t.queue + t.run ? "running" : "completed";
  },

  async result(job) {
    if (job.prompt.includes("fail-test")) throw new ProviderJobFailed("Mock failure requested by the prompt");
    const [width, height] = SIZE[job.aspect];
    return {
      bytes: new TextEncoder().encode(render(job.prompt, job.aspect, job.kind === "video", job.requestId)),
      contentType: "image/svg+xml",
      ext: "svg",
      width,
      height,
    };
  },

  async cancel() {},
};

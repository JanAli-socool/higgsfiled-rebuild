import type { Kind } from "@/lib/models";

// Presets are plain words written into the prompt, so the user sees and can edit exactly what
// the model gets (the original hides the prompt once a preset is chosen). One look per kind at a time.
export type Preset = { id: string; kind: Kind; label: string; fragment: string };

export const PRESETS: Preset[] = [
  { id: "film", kind: "image", label: "35mm film", fragment: "shot on 35mm film, natural grain, soft contrast" },
  { id: "golden", kind: "image", label: "Golden hour", fragment: "warm golden hour light, long soft shadows" },
  { id: "studio", kind: "image", label: "Studio portrait", fragment: "studio portrait, softbox lighting, seamless backdrop, 85mm lens" },
  { id: "product", kind: "image", label: "Product shot", fragment: "clean product photography, white sweep, crisp reflections" },
  { id: "noir", kind: "image", label: "Noir", fragment: "black and white film noir, hard shadows, high contrast" },
  { id: "neon", kind: "image", label: "Neon night", fragment: "neon-lit night, wet streets, cyan and magenta glow" },
  { id: "watercolor", kind: "image", label: "Watercolor", fragment: "loose watercolor painting, soft bleeding edges, paper texture" },
  { id: "anime", kind: "image", label: "Anime cel", fragment: "anime cel shading, clean line art, vivid flat colors" },
  { id: "iso", kind: "image", label: "Isometric 3D", fragment: "isometric 3D render, soft clay materials, miniature diorama" },
  { id: "poster", kind: "image", label: "Vintage poster", fragment: "vintage travel poster, flat screen-printed colors, bold shapes" },
  { id: "slowmo", kind: "video", label: "Slow motion", fragment: "in smooth slow motion" },
  { id: "timelapse", kind: "video", label: "Time-lapse", fragment: "as a time-lapse, clouds and light moving fast" },
  { id: "subtle", kind: "video", label: "Subtle life", fragment: "gentle natural motion only, the scene stays calm and steady" },
];

const presetsFor = (kind: Kind) => PRESETS.filter((p) => p.kind === kind);

export function activePreset(prompt: string, kind: Kind) {
  return presetsFor(kind).find((p) => prompt.includes(p.fragment)) ?? null;
}

// Writes the preset's words at the end of the prompt text, before any trailing #camera tokens,
// replacing the previous look of the same kind.
export function applyPreset(prompt: string, preset: Preset) {
  const base = removePreset(prompt, preset.kind);
  const [, body, tokens] = base.match(/^([\s\S]*?)((?:\s*#[a-z][a-z-]*)*\s*)$/) ?? [base, base, ""];
  const text = body.trim().replace(/[,.\s]+$/, "");
  return `${text ? `${text}, ` : ""}${preset.fragment}${tokens.trimEnd() ? ` ${tokens.trim()} ` : ""}`;
}

export function removePreset(prompt: string, kind: Kind) {
  const p = activePreset(prompt, kind);
  if (!p) return prompt;
  return prompt.replace(`, ${p.fragment}`, "").replace(p.fragment, "").replace(/\s{2,}/g, " ").replace(/^[,\s]+/, "");
}

import { DEFAULT_MODEL, type Aspect, type Kind } from "@/lib/models";
import type { Generation } from "@/lib/types";

// Everything the composer needs to submit. Feed actions build one of these.
export type Draft = {
  kind: Kind;
  modelId: string;
  prompt: string;
  aspect: Aspect;
  count: number;
  input: { path: string; url: string | null } | null;
  parentId: string | null;
};

export const emptyDraft: Draft = {
  kind: "image",
  modelId: DEFAULT_MODEL.image,
  prompt: "",
  aspect: "3:4",
  count: 1,
  input: null,
  parentId: null,
};

export const recreateDraft = (g: Generation): Draft => ({
  kind: g.kind,
  modelId: g.modelId,
  prompt: g.prompt,
  aspect: g.aspect,
  count: 1,
  input: g.inputImagePath ? { path: g.inputImagePath, url: g.inputImageUrl } : null,
  parentId: g.id,
});

export const referenceDraft = (g: Generation, current: Draft): Draft => ({
  ...current,
  kind: "image",
  modelId: current.kind === "image" ? current.modelId : DEFAULT_MODEL.image,
  prompt: current.prompt || g.prompt,
  input: { path: g.outputPath!, url: g.outputUrl },
  parentId: g.id,
});

// Animate keeps the prompt (the original drops it) and makes the model switch visible.
export const animateDraft = (g: Generation): Draft => ({
  kind: "video",
  modelId: DEFAULT_MODEL.video,
  prompt: g.prompt,
  aspect: g.aspect,
  count: 1,
  input: { path: g.outputPath!, url: g.outputUrl },
  parentId: g.id,
});

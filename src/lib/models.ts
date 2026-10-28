// The curated model list. Shared by the composer (labels, live cost) and the server
// (authoritative quote). Adding a model is a product decision, so it lives in code.

export type Kind = "image" | "video";
export type Aspect = "1:1" | "3:4" | "9:16" | "4:3" | "16:9";

export const ASPECTS: Aspect[] = ["1:1", "3:4", "9:16", "4:3", "16:9"];

export type ModelDef = {
  id: string;
  kind: Kind;
  label: string;
  bestFor: string;
  cost: number; // credits per output
  typicalSeconds: number; // drives the progress bar and the stuck-job timeout
  durationSeconds?: number; // video only
};

export const MODELS: ModelDef[] = [
  { id: "img-fast", kind: "image", label: "Fast draft", bestFor: "Exploring ideas quickly", cost: 1, typicalSeconds: 4 },
  { id: "img-quality", kind: "image", label: "High quality", bestFor: "Final stills and detail", cost: 4, typicalSeconds: 15 },
  { id: "vid-5s", kind: "video", label: "Animate · 5 s", bestFor: "Bringing a still to life", cost: 20, typicalSeconds: 90, durationSeconds: 5 },
  { id: "vid-10s", kind: "video", label: "Animate · 10 s", bestFor: "Longer shots and camera moves", cost: 40, typicalSeconds: 150, durationSeconds: 10 },
];

export const DEFAULT_MODEL: Record<Kind, string> = { image: "img-fast", video: "vid-5s" };

export function getModel(id: string): ModelDef | undefined {
  return MODELS.find((m) => m.id === id);
}

export function modelsFor(kind: Kind) {
  return MODELS.filter((m) => m.kind === kind);
}

export const MAX_COUNT = 4;
export const MAX_ACTIVE_JOBS = 4;
export const MAX_PROMPT = 2000;


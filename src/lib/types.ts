import type { Aspect, Kind } from "@/lib/models";

export type GenerationStatus = "queued" | "running" | "succeeded" | "failed" | "cancelled";

// What the browser sees. Storage paths are kept so a result can be reused as an input.
export type Generation = {
  id: string;
  batchId: string;
  parentId: string | null;
  kind: Kind;
  status: GenerationStatus;
  modelId: string;
  typicalSeconds: number; // for the provider that ran it
  prompt: string;
  aspect: Aspect;
  inputImagePath: string | null;
  inputImageUrl: string | null;
  outputPath: string | null;
  outputUrl: string | null;
  width: number | null;
  height: number | null;
  durationSeconds: number | null;
  cost: number;
  error: string | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
};

export const isActive = (g: Pick<Generation, "status">) => g.status === "queued" || g.status === "running";

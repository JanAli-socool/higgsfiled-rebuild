import type { Aspect, Kind } from "@/lib/models";

export type JobRef = {
  requestId: string;
  modelId: string;
  kind: Kind;
  prompt: string; // expanded prompt sent to the model
  aspect: Aspect;
  inputImageUrl?: string; // short-lived signed URL the provider can fetch
};

export type SubmitInput = Omit<JobRef, "requestId"> & {
  webhookUrl?: string;
};

export type ProviderStatus = "queued" | "running" | "completed";

export type ProviderOutput = {
  bytes: Uint8Array;
  contentType: string;
  ext: string;
  width?: number;
  height?: number;
  durationSeconds?: number;
};

// Every model vendor sits behind this. Swapping fal for Replicate means one new file.
export interface ModelProvider {
  name: string;
  // Queue providers are polled with status(). Blocking providers (one long HTTP call)
  // set this, and the job is completed by a background task right after submit.
  blocking?: boolean;
  supportsReference: boolean;
  supportedModels?: string[]; // model ids this provider can serve; all of its kind if omitted
  typicalSeconds?(modelId: string): number | undefined; // overrides the model's default
  qualityNote?: string; // shown in the composer so output limits are known before paying
  submit(input: SubmitInput): Promise<string>; // returns requestId
  status(job: JobRef): Promise<ProviderStatus>;
  result(job: JobRef): Promise<ProviderOutput>; // throws if the job failed
  cancel(job: JobRef): Promise<void>;
}

export class ProviderJobFailed extends Error {}

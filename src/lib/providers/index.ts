import "server-only";
import type { Kind } from "@/lib/models";
import { cloudflareProvider } from "./cloudflare";
import { falProvider } from "./fal";
import { huggingfaceProvider } from "./huggingface";
import { kieProvider } from "./kie";
import { mockProvider } from "./mock";
import { pollinationsProvider } from "./pollinations";
import type { ModelProvider } from "./types";

const PROVIDERS: Record<string, ModelProvider> = {
  fal: falProvider,
  mock: mockProvider,
  pollinations: pollinationsProvider,
  cloudflare: cloudflareProvider,
  huggingface: huggingfaceProvider,
  kie: kieProvider,
};

// New jobs use the configured provider for their kind (IMAGE_PROVIDER / VIDEO_PROVIDER
// override MODEL_PROVIDER). Existing jobs keep the provider they were created with.
export function providerFor(kind: Kind): ModelProvider {
  const name = (kind === "image" ? process.env.IMAGE_PROVIDER : process.env.VIDEO_PROVIDER) || process.env.MODEL_PROVIDER || "mock";
  return PROVIDERS[name] ?? mockProvider;
}

export function providerByName(name: string): ModelProvider {
  return PROVIDERS[name] ?? mockProvider;
}

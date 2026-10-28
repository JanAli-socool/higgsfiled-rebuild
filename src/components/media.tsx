/* eslint-disable @next/next/no-img-element -- signed storage URLs, not optimisable assets */
import type { Generation } from "@/lib/types";

// Real videos are mp4; the mock provider renders animated SVGs, which play in an <img>.
export function Media({ g, className, controls = false }: { g: Generation; className?: string; controls?: boolean }) {
  if (!g.outputUrl) return null;
  if (g.outputPath?.endsWith(".mp4")) {
    return <video src={g.outputUrl} className={className} controls={controls} muted loop playsInline autoPlay={!controls} />;
  }
  return <img src={g.outputUrl} alt={g.prompt} className={className} />;
}

export function aspectClass(aspect: Generation["aspect"]) {
  return { "1:1": "aspect-square", "3:4": "aspect-[3/4]", "9:16": "aspect-[9/16]", "4:3": "aspect-[4/3]", "16:9": "aspect-video" }[aspect];
}

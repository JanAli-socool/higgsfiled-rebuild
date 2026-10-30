import { getModel } from "@/lib/models";

// One-off credit packs. Subscriptions were cut: packs prove the money loop without renewals or proration.
export type Pack = { id: string; name: string; credits: number; priceCents: number; note?: string };

export const PACKS: Pack[] = [
  { id: "starter", name: "Starter", credits: 150, priceCents: 500 },
  { id: "creator", name: "Creator", credits: 500, priceCents: 1500, note: "Most picked" },
  { id: "studio", name: "Studio", credits: 1200, priceCents: 3000, note: "Best value" },
];

export const getPack = (id: string) => PACKS.find((p) => p.id === id);

// Credits described as what they make, using the live model prices.
export function outcomes(credits: number) {
  const each = (id: string) => getModel(id)?.cost ?? 1;
  return [
    { label: "fast drafts", count: Math.floor(credits / each("img-fast")) },
    { label: "high-quality images", count: Math.floor(credits / each("img-quality")) },
    { label: "video clips", count: Math.floor(credits / each("vid-5s")) },
  ];
}

export const formatPrice = (cents: number) => `$${(cents / 100).toFixed(cents % 100 ? 2 : 0)}`;

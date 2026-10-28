"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AppHeader } from "@/components/app-header";
import { Composer } from "@/components/composer";
import { FeedCard } from "@/components/feed-card";
import { DetailPanel } from "@/components/detail-panel";
import { animateDraft, emptyDraft, recreateDraft, referenceDraft, takeStashedDraft, type Draft } from "@/components/draft";
import { isActive, type Generation } from "@/lib/types";

const POLL_MS = 2000;

export type Capabilities = { referenceImages: boolean; realVideo: boolean; models: string[] | null };

export function Workspace({ isGuest }: { isGuest: boolean }) {
  const [items, setItems] = useState<Generation[] | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [caps, setCaps] = useState<Capabilities>({ referenceImages: true, realVideo: true, models: null });
  const [loadError, setLoadError] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/generations", { cache: "no-store" });
      if (!res.ok) throw new Error();
      const data = (await res.json()) as { items: Generation[]; balance: number; capabilities: Capabilities };
      setItems(data.items);
      setBalance(data.balance);
      setCaps(data.capabilities);
      setLoadError(false);
    } catch {
      setLoadError(true);
    }
  }, []);

  useEffect(() => {
    refresh();
    const handed = takeStashedDraft();
    if (handed) {
      setDraft(handed);
      requestAnimationFrame(() => composerRef.current?.focus());
    }
  }, [refresh]);

  // Poll only while something is in flight.
  const hasActive = items?.some(isActive) ?? false;
  useEffect(() => {
    if (!hasActive) return;
    const t = setInterval(refresh, POLL_MS);
    return () => clearInterval(t);
  }, [hasActive, refresh]);

  const selected = items?.find((g) => g.id === selectedId) ?? null;

  function load(next: Draft) {
    setDraft(next);
    setSelectedId(null);
    requestAnimationFrame(() => composerRef.current?.focus());
  }

  async function cancel(id: string) {
    const res = await fetch(`/api/generations/${id}/cancel`, { method: "POST" });
    if (res.ok) setBalance(((await res.json()) as { balance: number }).balance);
    refresh();
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader balance={balance} isGuest={isGuest} />

      <main className="flex-1 px-4 pb-72 pt-4">
        {loadError && (
          <p role="alert" className="mb-4 rounded-card border border-danger/40 bg-danger/10 px-4 py-3 text-sm">
            Couldn&apos;t load your work. <button className="underline" onClick={refresh}>Try again</button>
          </p>
        )}

        {items === null && !loadError && <FeedSkeleton />}

        {items?.length === 0 && (
          <div className="mx-auto mt-16 max-w-md text-center">
            <h1 className="text-xl font-semibold">Your first take starts below</h1>
            <p className="mt-2 text-muted">
              Describe a scene and press Generate. Fast drafts cost 1 credit, so try a few. When you like a frame, hit
              Animate to turn it into a shot.
            </p>
          </div>
        )}

        {!!items?.length && (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {items.map((g) => (
              <li key={g.id}>
                <FeedCard generation={g} onOpen={() => setSelectedId(g.id)} onCancel={() => cancel(g.id)} />
              </li>
            ))}
          </ul>
        )}
      </main>

      <Composer
        ref={composerRef}
        draft={draft}
        onChange={setDraft}
        balance={balance}
        capabilities={caps}
        onSubmitted={(newBalance) => {
          if (newBalance !== undefined) setBalance(newBalance);
          // The draft stays as it is (parent included) so the next take is one click away.
          refresh();
        }}
      />

      {selected && (
        <DetailPanel
          generation={selected}
          parent={items?.find((g) => g.id === selected.parentId) ?? null}
          onClose={() => setSelectedId(null)}
          onSelect={setSelectedId}
          onRecreate={() => load(recreateDraft(selected))}
          onReference={() => load(referenceDraft(selected, draft))}
          onAnimate={() => load(animateDraft(selected))}
        />
      )}
    </div>
  );
}

function FeedSkeleton() {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5" aria-label="Loading your work">
      {Array.from({ length: 8 }, (_, i) => (
        <li key={i} className="aspect-[3/4] animate-pulse rounded-card bg-surface" />
      ))}
    </ul>
  );
}

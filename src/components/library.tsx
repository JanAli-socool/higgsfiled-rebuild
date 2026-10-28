"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { DetailPanel } from "@/components/detail-panel";
import { Media, aspectClass } from "@/components/media";
import { animateDraft, emptyDraft, recreateDraft, referenceDraft, stashDraft, type Draft } from "@/components/draft";
import type { Kind } from "@/lib/models";
import type { Generation } from "@/lib/types";

const PAGE = 40;
type Filter = "all" | Kind;
const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "image", label: "Images" },
  { id: "video", label: "Videos" },
];

export function Library({ isGuest, initialKind, initialQuery }: { isGuest: boolean; initialKind: Filter; initialQuery: string }) {
  const router = useRouter();
  const [kind, setKind] = useState<Filter>(initialKind);
  const [query, setQuery] = useState(initialQuery);
  const [items, setItems] = useState<Generation[] | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [trashed, setTrashed] = useState<Generation | null>(null);
  const [attempt, setAttempt] = useState(0);
  const request = useRef(0);

  const fetchPage = useCallback(
    async (before?: string) => {
      const p = new URLSearchParams({ finished: "1" });
      if (kind !== "all") p.set("kind", kind);
      if (query.trim()) p.set("q", query.trim());
      if (before) p.set("before", before);
      const res = await fetch(`/api/generations?${p}`, { cache: "no-store" });
      if (!res.ok) throw new Error();
      return (await res.json()) as { items: Generation[]; balance: number };
    },
    [kind, query],
  );

  // Reload whenever the filter or search changes; typing is debounced and stale answers are dropped.
  useEffect(() => {
    const id = ++request.current;
    const t = setTimeout(
      async () => {
        try {
          const data = await fetchPage();
          if (id !== request.current) return;
          setItems(data.items);
          setHasMore(data.items.length === PAGE);
          setBalance(data.balance);
          setLoadError(false);
        } catch {
          if (id === request.current) setLoadError(true);
        }
      },
      items === null ? 0 : 250,
    );
    // Keep the view in the URL so Back and reload land on the same results.
    const p = new URLSearchParams();
    if (kind !== "all") p.set("kind", kind);
    if (query.trim()) p.set("q", query.trim());
    window.history.replaceState(null, "", p.size ? `/library?${p}` : "/library");
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- items only decides the first-load delay
  }, [fetchPage, attempt]);

  async function loadMore() {
    if (!items?.length) return;
    setLoadingMore(true);
    try {
      const data = await fetchPage(items[items.length - 1].createdAt);
      setItems([...items, ...data.items]);
      setHasMore(data.items.length === PAGE);
    } catch {
      setLoadError(true);
    } finally {
      setLoadingMore(false);
    }
  }

  // Detail actions continue in the composer on /create.
  function continueIn(draft: Draft) {
    stashDraft(draft);
    router.push("/create");
  }

  async function trash(g: Generation) {
    setSelectedId(null);
    setItems((list) => list?.filter((x) => x.id !== g.id) ?? null);
    const res = await fetch(`/api/generations/${g.id}`, { method: "DELETE" });
    if (!res.ok) {
      setItems((list) => (list ? restoreInOrder(list, g) : list));
      return;
    }
    setTrashed(g);
  }

  async function undoTrash() {
    const g = trashed;
    if (!g) return;
    setTrashed(null);
    const res = await fetch(`/api/generations/${g.id}`, { method: "POST", body: JSON.stringify({ restore: true }) });
    if (res.ok) setItems((list) => (list ? restoreInOrder(list, g) : list));
  }

  useEffect(() => {
    if (!trashed) return;
    const t = setTimeout(() => setTrashed(null), 8000);
    return () => clearTimeout(t);
  }, [trashed]);

  const selected = items?.find((g) => g.id === selectedId) ?? null;
  const searching = query.trim().length > 0 || kind !== "all";

  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader balance={balance} isGuest={isGuest} />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 pb-16 pt-4">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <h1 className="mr-auto text-xl font-semibold">Library</h1>
          <div role="radiogroup" aria-label="Show" className="flex rounded-lg border border-border bg-surface p-0.5 text-sm">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                role="radio"
                aria-checked={kind === f.id}
                onClick={() => setKind(f.id)}
                className="rounded-md px-3 py-1 text-muted aria-checked:bg-surface-2 aria-checked:text-text"
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="relative w-full sm:w-72">
            <label htmlFor="library-search" className="sr-only">
              Search prompts
            </label>
            <input
              id="library-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search your prompts"
              className="w-full rounded-lg border border-border bg-surface px-3 py-1.5 text-sm placeholder:text-muted focus:border-muted focus:outline-none"
            />
          </div>
        </div>

        {loadError && (
          <p role="alert" className="mb-4 rounded-card border border-danger/40 bg-danger/10 px-4 py-3 text-sm">
            Couldn&apos;t load your library.{" "}
            <button className="underline" onClick={() => setAttempt((n) => n + 1)}>
              Try again
            </button>
          </p>
        )}

        {items === null && !loadError && <GridSkeleton />}

        {items?.length === 0 &&
          (searching ? (
            <div className="mx-auto mt-16 max-w-md text-center">
              <h2 className="text-lg font-semibold">Nothing matches</h2>
              <p className="mt-2 text-muted">
                {query.trim() ? <>No {kind === "all" ? "takes" : `${kind}s`} with “{query.trim()}” in the prompt.</> : <>You haven&apos;t made any {kind}s yet.</>}
              </p>
              <button
                onClick={() => {
                  setQuery("");
                  setKind("all");
                }}
                className="mt-4 rounded-card border border-border px-4 py-2 text-sm hover:bg-surface-2"
              >
                Show everything
              </button>
            </div>
          ) : (
            <div className="mx-auto mt-16 max-w-md text-center">
              <h2 className="text-lg font-semibold">Your finished takes land here</h2>
              <p className="mt-2 text-muted">Every image and video you make is kept here, searchable by its prompt.</p>
              <Link href="/create" className="mt-4 inline-block rounded-card bg-accent px-4 py-2 font-medium text-accent-text">
                Make your first image
              </Link>
            </div>
          ))}

        {!!items?.length && (
          <>
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {items.map((g) => (
                <li key={g.id}>
                  <button
                    onClick={() => setSelectedId(g.id)}
                    aria-label={`Open: ${g.prompt}`}
                    className={`${aspectClass(g.aspect)} group relative block w-full overflow-hidden rounded-card border border-border bg-surface text-left`}
                  >
                    <Media g={g} className="h-full w-full object-cover" />
                    {g.kind === "video" && <span className="absolute left-2 top-2 rounded bg-black/60 px-1.5 py-0.5 text-xs">Video</span>}
                    <span className="absolute inset-x-0 bottom-0 line-clamp-2 bg-gradient-to-t from-black/80 to-transparent p-2 pt-6 text-xs opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                      {g.prompt}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            {hasMore && (
              <div className="mt-6 text-center">
                <button onClick={loadMore} disabled={loadingMore} className="rounded-card border border-border px-4 py-2 text-sm hover:bg-surface-2 disabled:opacity-60">
                  {loadingMore ? "Loading…" : "Load more"}
                </button>
              </div>
            )}
          </>
        )}
      </main>

      {trashed && (
        <div role="status" className="fixed inset-x-0 bottom-4 z-40 mx-auto flex w-fit items-center gap-4 rounded-card border border-border bg-surface-2 px-4 py-2 text-sm shadow-xl">
          Moved to trash
          <button onClick={undoTrash} className="font-medium text-accent">
            Undo
          </button>
        </div>
      )}

      {selected && (
        <DetailPanel
          generation={selected}
          parent={items?.find((g) => g.id === selected.parentId) ?? null}
          onClose={() => setSelectedId(null)}
          onSelect={setSelectedId}
          onRecreate={() => continueIn(recreateDraft(selected))}
          onReference={() => continueIn(referenceDraft(selected, emptyDraft))}
          onAnimate={() => continueIn(animateDraft(selected))}
          onDelete={() => trash(selected)}
        />
      )}
    </div>
  );
}

function restoreInOrder(list: Generation[], g: Generation) {
  return [...list.filter((x) => x.id !== g.id), g].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function GridSkeleton() {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5" aria-label="Loading your library">
      {Array.from({ length: 10 }, (_, i) => (
        <li key={i} className="aspect-[3/4] animate-pulse rounded-card bg-surface" />
      ))}
    </ul>
  );
}

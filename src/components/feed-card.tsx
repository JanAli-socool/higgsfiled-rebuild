"use client";

import { useEffect, useState } from "react";
import type { Generation } from "@/lib/types";
import { Media, aspectClass } from "@/components/media";

type Props = { generation: Generation; onOpen: () => void; onCancel: () => void };

export function FeedCard({ generation: g, onOpen, onCancel }: Props) {
  const shape = `${aspectClass(g.aspect)} relative w-full overflow-hidden rounded-card border border-border bg-surface`;

  if (g.status === "succeeded") {
    return (
      <button onClick={onOpen} className={`${shape} group block text-left`} aria-label={`Open: ${g.prompt}`}>
        <Media g={g} className="h-full w-full object-cover" />
        {g.kind === "video" && <span className="absolute left-2 top-2 rounded bg-black/60 px-1.5 py-0.5 text-xs">Video</span>}
      </button>
    );
  }

  if (g.status === "queued" || g.status === "running") {
    // A backdrop instead of an empty box: the frame being animated (or the reference), slowly drifting;
    // a soft shimmer when there's no image yet.
    return (
      <div className={`${shape} flex flex-col justify-end p-3`}>
        {g.inputImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={g.inputImageUrl} alt="" aria-hidden="true" className="reel-drift absolute inset-0 h-full w-full object-cover opacity-60 blur-[1.5px]" />
        ) : (
          <div className="reel-shimmer absolute inset-0" aria-hidden="true" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/10" aria-hidden="true" />
        <div className="relative">
          <p className="mb-2 text-xs font-medium">{g.kind === "video" ? "Animating" : "Generating"}</p>
          <Progress g={g} />
          <p className="mt-2 line-clamp-2 text-xs text-muted">{g.prompt}</p>
        </div>
        <button onClick={onCancel} className="absolute right-2 top-2 rounded-md bg-black/50 px-2 py-1 text-xs backdrop-blur hover:bg-black/70">
          Cancel
        </button>
      </div>
    );
  }

  return (
    <div className={`${shape} flex flex-col justify-end p-3`}>
      <p className={`text-sm font-medium ${g.status === "failed" ? "text-danger" : "text-muted"}`}>
        {g.status === "failed" ? "Didn't work" : "Cancelled"}
      </p>
      {g.error && <p className="mt-1 line-clamp-3 text-xs text-muted">{g.error}</p>}
      <p className="mt-1 text-xs text-success">
        {g.cost} {g.cost === 1 ? "credit" : "credits"} refunded
      </p>
      <p className="mt-2 line-clamp-2 text-xs text-muted">{g.prompt}</p>
    </div>
  );
}

// Elapsed against the model's typical time. We never invent a percentage the provider didn't give us,
// so past the typical time the bar holds and the label says so.
function Progress({ g }: { g: Generation }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, []);

  const typical = g.typicalSeconds * 1000;
  const since = new Date(g.startedAt ?? g.createdAt).getTime();
  const elapsed = Math.max(0, now - since);
  const pct = g.status === "queued" ? 4 : Math.min(92, (elapsed / typical) * 100);
  const secs = Math.round(elapsed / 1000);
  const label =
    g.status === "queued"
      ? "Waiting for a free slot…"
      : elapsed > typical
        ? `${secs}s · taking longer than usual`
        : `${secs}s of about ${Math.round(typical / 1000)}s`;

  return (
    <div>
      <div className="h-1.5 overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100} aria-label="Generation progress">
        <div className="h-full rounded-full bg-accent transition-[width] duration-500" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-1.5 text-xs tabular-nums">{label}</p>
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { getModel } from "@/lib/models";
import type { Generation } from "@/lib/types";
import { Media } from "@/components/media";

type Props = {
  generation: Generation;
  parent: Generation | null;
  onClose: () => void;
  onSelect: (id: string) => void;
  onRecreate: () => void;
  onReference: () => void;
  onAnimate: () => void;
  onDelete?: () => void;
};

export function DetailPanel({ generation: g, parent, onClose, onSelect, onRecreate, onReference, onAnimate, onDelete }: Props) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const [copied, setCopied] = useState(false);
  const model = getModel(g.modelId);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function copyPrompt() {
    await navigator.clipboard.writeText(g.prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const ext = g.outputPath?.split(".").pop() ?? "jpg";
  const downloadUrl = g.outputUrl ? `${g.outputUrl}&download=reel-${g.id.slice(0, 8)}.${ext}` : null;

  return (
    <div className="fixed inset-0 z-30 flex bg-black/80 backdrop-blur-sm max-md:flex-col" role="dialog" aria-modal="true" aria-label="Generation details" onClick={onClose}>
      <div className="flex min-h-0 min-w-0 flex-1 items-center justify-center p-4">
        <div onClick={(e) => e.stopPropagation()} className="flex max-h-full min-h-0 justify-center">
          <Media g={g} controls className="max-h-[85dvh] max-w-full rounded-card object-contain max-md:max-h-[36dvh]" />
        </div>
      </div>

      <aside
        className="flex w-full max-w-sm shrink-0 flex-col gap-4 overflow-y-auto border-l border-border bg-surface p-4 max-md:max-h-[60dvh] max-md:max-w-none max-md:rounded-t-[calc(var(--radius)+6px)] max-md:border-l-0 max-md:border-t"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-medium">{g.kind === "video" ? "Video" : "Image"}</h2>
          <button ref={closeRef} onClick={onClose} aria-label="Close" className="rounded-md px-2 py-1 text-muted hover:text-text">
            ✕
          </button>
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between text-xs text-muted">
            <span>Prompt</span>
            <button onClick={copyPrompt} className="hover:text-text">
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <p className="whitespace-pre-wrap rounded-lg bg-surface-2 p-3 text-sm">{g.prompt}</p>
        </div>

        <dl className="grid grid-cols-2 gap-y-1.5 text-sm">
          <dt className="text-muted">Model</dt>
          <dd>{model?.label ?? g.modelId}</dd>
          <dt className="text-muted">Aspect</dt>
          <dd>{g.aspect}</dd>
          {g.width && g.height && (
            <>
              <dt className="text-muted">Size</dt>
              <dd className="tabular-nums">
                {g.width}×{g.height}
              </dd>
            </>
          )}
          {g.durationSeconds && (
            <>
              <dt className="text-muted">Length</dt>
              <dd>{g.durationSeconds}s</dd>
            </>
          )}
          <dt className="text-muted">Cost</dt>
          <dd>
            {g.cost} {g.cost === 1 ? "credit" : "credits"}
          </dd>
          <dt className="text-muted">Made</dt>
          <dd>{new Date(g.createdAt).toLocaleString()}</dd>
        </dl>

        {parent && (
          <button onClick={() => onSelect(parent.id)} className="flex items-center gap-2 rounded-lg border border-border p-2 text-left text-sm hover:bg-surface-2">
            {parent.outputUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={parent.outputUrl} alt="" className="h-10 w-10 rounded object-cover" />
            )}
            <span className="text-muted">Made from an earlier take</span>
          </button>
        )}

        <div className="mt-auto flex flex-col gap-2">
          {g.kind === "image" && (
            <button onClick={onAnimate} className="rounded-card bg-accent px-4 py-2.5 font-medium text-accent-text">
              Animate this image
            </button>
          )}
          <div className="grid grid-cols-2 gap-2">
            <button onClick={onRecreate} className="rounded-card border border-border px-3 py-2 text-sm hover:bg-surface-2" title="Same prompt and settings, new take">
              Recreate
            </button>
            {g.kind === "image" ? (
              <button onClick={onReference} className="rounded-card border border-border px-3 py-2 text-sm hover:bg-surface-2" title="Start a new image from this one">
                Use as reference
              </button>
            ) : (
              <span />
            )}
          </div>
          {downloadUrl && (
            <a href={downloadUrl} className="rounded-card border border-border px-3 py-2 text-center text-sm hover:bg-surface-2">
              Download
            </a>
          )}
          {onDelete && (
            <button onClick={onDelete} className="rounded-card px-3 py-2 text-sm text-muted hover:text-danger">
              Move to trash
            </button>
          )}
        </div>
      </aside>
    </div>
  );
}

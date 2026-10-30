"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { uploadImage } from "@/components/upload";
import { ASPECTS, DEFAULT_MODEL, MAX_COUNT, getModel, modelsFor, type Aspect, type Kind } from "@/lib/models";
import { CAMERA_MOVES, findMoves } from "@/lib/camera";
import { PRESETS, activePreset, applyPreset, removePreset } from "@/lib/presets";
import type { Draft } from "@/components/draft";
import type { Capabilities } from "@/components/workspace";

type Props = {
  ref?: React.Ref<HTMLTextAreaElement>;
  draft: Draft;
  onChange: (d: Draft) => void;
  balance: number | null;
  capabilities: Capabilities;
  onSubmitted: (balance?: number) => void;
  // Fired on click, before the server answers, so the feed can show the take at once.
  onSubmitStart?: (count: number) => void;
  onSubmitFailed?: () => void;
};

export function Composer({ ref, draft, onChange, balance, capabilities, onSubmitted, onSubmitStart, onSubmitFailed }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ message: string; code?: string } | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [styleOpen, setStyleOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const model = getModel(draft.modelId)!;
  const count = draft.kind === "video" ? 1 : draft.count;
  const cost = model.cost * count;
  const short = balance !== null && cost > balance;
  const videoOnly = capabilities.textToVideo === true; // the video model can start from the prompt alone
  const capsLoaded = capabilities.models !== null; // until then we don't know whether to show the Image tab
  const needsImage = draft.kind === "video" && !draft.input && !videoOnly;
  const moves = findMoves(draft.prompt);
  const look = activePreset(draft.prompt, draft.kind);
  const blocked = busy || !draft.prompt.trim() || needsImage || short;

  const set = (patch: Partial<Draft>) => {
    setError(null);
    onChange({ ...draft, ...patch });
  };

  function setKind(kind: Kind) {
    if (kind !== draft.kind) set({ kind, modelId: DEFAULT_MODEL[kind] });
  }

  function addMove(token: string) {
    const sep = draft.prompt && !draft.prompt.endsWith(" ") ? " " : "";
    set({ prompt: `${draft.prompt}${sep}#${token} ` });
    setCameraOpen(false);
  }

  function removeMove(token: string) {
    set({ prompt: draft.prompt.replace(new RegExp(`\\s?#${token}\\b`, "g"), "").trimStart() });
  }

  async function upload(file: File) {
    setUploading(true);
    setError(null);
    try {
      const path = await uploadImage(file);
      onChange({ ...draft, input: { path, url: URL.createObjectURL(file) }, parentId: null });
    } catch (e) {
      setError({ message: e instanceof Error ? e.message : "Upload failed. Check your connection and try again." });
    } finally {
      setUploading(false);
    }
  }

  function onPaste(e: React.ClipboardEvent) {
    const file = Array.from(e.clipboardData.files).find((f) => f.type.startsWith("image/"));
    if (file) {
      e.preventDefault();
      upload(file);
    }
  }

  async function submit() {
    if (blocked) return;
    setBusy(true);
    setError(null);
    onSubmitStart?.(count);
    let ok = false;
    try {
      const res = await fetch("/api/generations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          kind: draft.kind,
          modelId: draft.modelId,
          prompt: draft.prompt,
          aspect: draft.aspect,
          count,
          inputImagePath: draft.input?.path ?? null,
          parentId: draft.parentId,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return setError({ message: data.error ?? "Something went wrong", code: data.code });
      ok = true;
      onSubmitted(data.balance);
    } catch {
      setError({ message: "Couldn't reach the server. Check your connection and try again." });
    } finally {
      if (!ok) onSubmitFailed?.();
      setBusy(false);
    }
  }

  return (
    <section
      aria-label="Composer"
      className="fixed inset-x-0 bottom-0 z-10 border-t border-border bg-bg/95 px-3 pb-3 pt-2.5 backdrop-blur sm:inset-x-4 sm:bottom-4 sm:mx-auto sm:max-w-3xl sm:rounded-[calc(var(--radius)+6px)] sm:border sm:bg-surface/95 sm:px-4 sm:pb-4 sm:pt-3 sm:shadow-float"
    >
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          {capsLoaded && !videoOnly && (
            <div role="radiogroup" aria-label="What to make" className="flex rounded-lg border border-border bg-surface p-0.5 text-sm">
              {(["image", "video"] as Kind[]).map((k) => (
                <button
                  key={k}
                  role="radio"
                  aria-checked={draft.kind === k}
                  onClick={() => setKind(k)}
                  className="rounded-md px-3 py-1 capitalize text-muted aria-checked:bg-surface-2 aria-checked:text-text"
                >
                  {k}
                </button>
              ))}
            </div>
          )}

          {draft.input && (
            <div className="flex items-center gap-2 rounded-lg border border-border bg-surface py-0.5 pl-0.5 pr-2 text-xs">
              {draft.input.url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={draft.input.url} alt="" className="h-7 w-7 rounded object-cover" />
              )}
              <span>{draft.kind === "video" ? "Start frame" : "Reference image"}</span>
              <button aria-label="Remove image" className="text-muted hover:text-text" onClick={() => set({ input: null, parentId: null })}>
                ✕
              </button>
            </div>
          )}

          {!draft.input && (
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="rounded-lg border border-border bg-surface px-3 py-1 text-sm text-muted hover:text-text disabled:opacity-60"
            >
              {uploading ? "Uploading…" : videoOnly ? "Add start image (optional)" : draft.kind === "video" ? "Upload start image" : "Add reference image"}
            </button>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            aria-label="Upload an image"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) upload(file);
              e.target.value = "";
            }}
          />

          {draft.parentId && !draft.input && <span className="text-xs text-muted">Recreating a previous take</span>}
        </div>

        {draft.kind === "image" && draft.input && !capabilities.referenceImages && (
          <p className="text-sm text-muted">
            The free image model only reads your prompt, so describe what to keep from the reference.
          </p>
        )}
        {draft.kind === "video" && capabilities.realVideo && capabilities.videoNote && !needsImage && (
          <p className="text-xs text-muted">{capabilities.videoNote}</p>
        )}
        {draft.kind === "video" && !capabilities.realVideo && (
          <p className="text-sm text-muted">Video is in preview mode: you&apos;ll get a placeholder clip while real video is switched off.</p>
        )}

        {needsImage && (
          <p className="text-sm text-muted">
            Video starts from an image: upload one, paste one into the prompt, or open an image in your feed and press{" "}
            <span className="text-text">Animate</span>.
          </p>
        )}

        <div className="rounded-card border border-border bg-surface focus-within:border-muted">
          <label htmlFor="prompt" className="sr-only">
            Prompt
          </label>
          <textarea
            id="prompt"
            ref={ref}
            rows={2}
            enterKeyHint="go"
            value={draft.prompt}
            maxLength={2000}
            onChange={(e) => set({ prompt: e.target.value })}
            onPaste={onPaste}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                submit();
              }
            }}
            placeholder={
              videoOnly && !draft.input
                ? "Describe the shot, e.g. waves crash against a lighthouse at dusk as the lamp flickers on #push-in"
                : draft.kind === "video"
                ? "Describe the motion, e.g. waves crash below as the light fades #push-in"
                : "Describe a scene, e.g. a lighthouse on a cliff at dusk, 35mm film"
            }
            className="block w-full resize-none bg-transparent px-3 pt-3 placeholder:text-muted focus:outline-none"
          />

          <div className="flex flex-wrap items-center gap-1.5 px-2 pb-2">
            <div className="relative">
              <button
                aria-expanded={styleOpen}
                onClick={() => {
                  setStyleOpen((o) => !o);
                  setCameraOpen(false);
                }}
                className="rounded-md border border-border px-2 py-1 text-xs text-muted hover:text-text"
              >
                {draft.kind === "video" ? "Motion" : "Style"} ＋
              </button>
              {styleOpen && (
                <div className="absolute bottom-full left-0 z-10 mb-2 max-h-80 w-72 overflow-y-auto rounded-card border border-border bg-surface-2 p-1 shadow-xl">
                  <p className="px-2 py-1 text-xs text-muted">Adds these words to your prompt. Edit them like any other text.</p>
                  {PRESETS.filter((p) => p.kind === draft.kind).map((p) => (
                    <button
                      key={p.id}
                      aria-pressed={look?.id === p.id}
                      onClick={() => {
                        set({ prompt: applyPreset(draft.prompt, p) });
                        setStyleOpen(false);
                      }}
                      className="flex w-full flex-col rounded-md px-2 py-1.5 text-left hover:bg-surface aria-pressed:bg-surface"
                    >
                      <span className="text-sm">{p.label}</span>
                      <span className="text-xs text-muted">{p.fragment}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="relative">
              <button
                aria-expanded={cameraOpen}
                onClick={() => {
                  setCameraOpen((o) => !o);
                  setStyleOpen(false);
                }}
                className="rounded-md border border-border px-2 py-1 text-xs text-muted hover:text-text"
              >
                Camera ＋
              </button>
              {cameraOpen && (
                <div className="absolute bottom-full left-0 mb-2 w-64 rounded-card border border-border bg-surface-2 p-1 shadow-xl">
                  <p className="px-2 py-1 text-xs text-muted">Add a camera move, or type # in the prompt. Order matters.</p>
                  {CAMERA_MOVES.map((m) => (
                    <button
                      key={m.token}
                      onClick={() => addMove(m.token)}
                      className="flex w-full flex-col rounded-md px-2 py-1.5 text-left hover:bg-surface"
                    >
                      <span className="text-sm">{m.label}</span>
                      <span className="text-xs text-muted">{m.hint}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {look && (
              <span className="flex items-center gap-1 rounded-md bg-surface-2 px-2 py-1 text-xs">
                {look.label}
                <button aria-label={`Remove ${look.label}`} className="text-muted hover:text-text" onClick={() => set({ prompt: removePreset(draft.prompt, draft.kind) })}>
                  ✕
                </button>
              </span>
            )}
            {moves.map((m) => (
              <span key={m.token} className="flex items-center gap-1 rounded-md bg-accent/15 px-2 py-1 text-xs text-accent">
                {m.label}
                <button aria-label={`Remove ${m.label}`} onClick={() => removeMove(m.token)}>
                  ✕
                </button>
              </span>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor="model">
            Model
          </label>
          <select
            id="model"
            value={draft.modelId}
            onChange={(e) => set({ modelId: e.target.value })}
            className="rounded-lg border border-border bg-surface px-2 py-2 text-sm"
          >
            {modelsFor(draft.kind)
              .filter((m) => !capabilities.models || capabilities.models.includes(m.id))
              .map((m) => (
              <option key={m.id} value={m.id}>
                {videoOnly ? `${capabilities.labels?.[m.id] ?? m.label} · ${m.cost} cr` : `${capabilities.labels?.[m.id] ?? m.label}: ${m.bestFor} · ${m.cost} cr`}
              </option>
            ))}
          </select>

          {videoOnly && !draft.input && (
            <>
              <label className="sr-only" htmlFor="aspect">
                Aspect ratio
              </label>
              <select
                id="aspect"
                value={draft.aspect}
                onChange={(e) => set({ aspect: e.target.value as Aspect })}
                className="rounded-lg border border-border bg-surface px-2 py-2 text-sm"
              >
                <option value="16:9">16:9 landscape</option>
                <option value="9:16">9:16 portrait</option>
              </select>
            </>
          )}

          {draft.kind === "image" && (
            <>
              <label className="sr-only" htmlFor="aspect">
                Aspect ratio
              </label>
              <select
                id="aspect"
                value={draft.aspect}
                onChange={(e) => set({ aspect: e.target.value as Aspect })}
                className="rounded-lg border border-border bg-surface px-2 py-2 text-sm"
              >
                {ASPECTS.map((a) => (
                  <option key={a}>{a}</option>
                ))}
              </select>

              <div className="flex items-center rounded-lg border border-border bg-surface text-sm" aria-label="Number of images">
                <button aria-label="Fewer" className="px-2 py-2 text-muted disabled:opacity-40" disabled={count <= 1} onClick={() => set({ count: count - 1 })}>
                  −
                </button>
                <span className="w-8 text-center tabular-nums" aria-live="polite">
                  ×{count}
                </span>
                <button aria-label="More" className="px-2 py-2 text-muted disabled:opacity-40" disabled={count >= MAX_COUNT} onClick={() => set({ count: count + 1 })}>
                  +
                </button>
              </div>
            </>
          )}

          <div className="ml-auto flex items-center gap-3">
            <span className="hidden text-xs text-muted sm:inline tabular-nums">
              {balance !== null && !short && `${balance} → ${balance - cost} left`}
            </span>
            <button
              onClick={submit}
              disabled={blocked}
              title="Ctrl/⌘ + Enter"
              className="rounded-card bg-accent px-4 py-2 font-medium text-accent-text disabled:opacity-50"
            >
              {busy ? "Starting…" : `Generate · ${cost} cr`}
            </button>
          </div>
        </div>

        {short && (
          <p className="text-sm text-danger">
            This needs {cost} credits and you have {balance}.{" "}
            <Link href="/pricing" className="underline">
              Get more credits
            </Link>{" "}
            or pick a cheaper option.
          </p>
        )}
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error.message}
            {error.code === "insufficient_credits" && (
              <>
                {" "}
                <Link href="/pricing" className="underline">
                  Get more credits
                </Link>
              </>
            )}
          </p>
        )}
      </div>
    </section>
  );
}

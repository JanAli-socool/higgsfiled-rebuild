import "server-only";
import { after } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { ASPECTS, MAX_ACTIVE_JOBS, MAX_COUNT, MAX_PROMPT, MODELS, getModel, type Aspect, type Kind } from "@/lib/models";
import { expandPrompt } from "@/lib/camera";
import { providerByName, providerFor } from "@/lib/providers";
import { ProviderJobFailed, type JobRef, type ModelProvider } from "@/lib/providers/types";
import type { Generation } from "@/lib/types";

type Row = {
  id: string;
  user_id: string;
  batch_id: string;
  parent_id: string | null;
  kind: Kind;
  status: Generation["status"];
  model_id: string;
  prompt: string;
  params: { aspect?: Aspect };
  input_image_path: string | null;
  provider: string;
  provider_request_id: string | null;
  output_path: string | null;
  output_width: number | null;
  output_height: number | null;
  output_duration_s: number | null;
  cost_credits: number;
  error: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
};

const ACTIVE = ["queued", "running"];

export class JobError extends Error {
  constructor(message: string, public status: number, public code: string) {
    super(message);
  }
}

// ------------------------------------------------------------------ create

export const createSchema = z.object({
  kind: z.enum(["image", "video"]),
  modelId: z.string(),
  prompt: z.string().trim().min(1, "Write a prompt first").max(MAX_PROMPT),
  aspect: z.enum(ASPECTS as [Aspect, ...Aspect[]]).default("1:1"),
  count: z.number().int().min(1).max(MAX_COUNT).default(1),
  inputImagePath: z.string().nullish(),
  parentId: z.string().uuid().nullish(),
});
export type CreateRequest = z.infer<typeof createSchema>;

export async function createGenerations(userId: string, req: CreateRequest) {
  const db = createAdminClient();
  const model = getModel(req.modelId);
  if (!model || model.kind !== req.kind) throw new JobError("Unknown model", 400, "bad_model");
  if (req.kind === "video" && !req.inputImagePath) throw new JobError("Pick a start image to animate", 400, "needs_image");
  if (req.inputImagePath && ownerOf(req.inputImagePath) !== userId) throw new JobError("That image isn't yours", 403, "bad_image");
  const count = req.kind === "video" ? 1 : req.count;
  const provider = providerFor(req.kind);
  if (provider.supportedModels && !provider.supportedModels.includes(model.id)) {
    throw new JobError(`${model.label} isn't available right now`, 400, "model_unavailable");
  }

  const { count: active } = await db
    .from("generations")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .in("status", ACTIVE);
  if ((active ?? 0) + count > MAX_ACTIVE_JOBS) {
    throw new JobError(`Up to ${MAX_ACTIVE_JOBS} jobs can run at once. Wait for one to finish.`, 429, "too_many_jobs");
  }

  // Insert and charge in one transaction: either every job exists and is paid for, or none.
  const { data: ids, error } = await db.rpc("create_generations", {
    p_user: userId,
    p_count: count,
    p_kind: req.kind,
    p_model: model.id,
    p_prompt: req.prompt,
    p_params: { aspect: req.aspect },
    p_input_image_path: req.inputImagePath ?? null,
    p_parent: req.parentId ?? null,
    p_cost_each: model.cost,
  });
  if (error) {
    if (error.message.includes("insufficient_credits")) throw new JobError("Not enough credits for this", 402, "insufficient_credits");
    if (error.message.includes("bad_parent")) throw new JobError("Unknown source generation", 400, "bad_parent");
    throw error;
  }

  const inputImageUrl = req.inputImagePath ? await signedUrl(req.inputImagePath, 3600) : undefined;
  const expanded = expandPrompt(req.prompt);

  await Promise.all(
    (ids as string[]).map(async (id) => {
      try {
        const requestId = await provider.submit({
          modelId: model.id,
          kind: model.kind,
          prompt: expanded,
          aspect: req.aspect,
          inputImageUrl,
          webhookUrl: webhookUrl(id, provider.name),
        });
        const started = provider.blocking ? { status: "running", started_at: new Date().toISOString() } : {};
        await db.from("generations").update({ provider: provider.name, provider_request_id: requestId, ...started }).eq("id", id);
        // Blocking providers answer in one long call: run it after the response so the composer frees up at once.
        if (provider.blocking) after(() => runBlocking(id));
      } catch (e) {
        await fail(id, `Could not start the job: ${e instanceof Error ? e.message : "provider error"}`);
      }
    }),
  );

  return { ids: ids as string[], balance: await balanceOf(userId) };
}

// ------------------------------------------------------------------ sync

// Moves one job forward by asking its provider. Safe to call repeatedly and concurrently:
// every write is conditional on the job still being active.
export async function syncGeneration(row: Row): Promise<Row> {
  if (!ACTIVE.includes(row.status)) return row;
  const db = createAdminClient();
  const model = getModel(row.model_id)!;
  const age = Date.now() - new Date(row.created_at).getTime();

  if (!row.provider_request_id) {
    if (age > 60_000) await fail(row.id, "The job never started");
    return reload(row.id);
  }

  const provider = providerByName(row.provider);
  const job = jobRef(row);

  if (age > Math.max(typicalSeconds(provider, model.id) * 3, 120) * 1000) {
    await provider.cancel(job);
    await fail(row.id, "This took far longer than usual, so we stopped it");
    return reload(row.id);
  }
  if (provider.blocking) return row; // the background task finishes it

  let status;
  try {
    status = await provider.status(job);
  } catch {
    return row; // transient: try again on the next poll
  }

  if (status === "running" && row.status === "queued") {
    await db.from("generations").update({ status: "running", started_at: new Date().toISOString() }).eq("id", row.id).eq("status", "queued");
  }
  if (status === "completed") await complete(row, provider, job);
  return reload(row.id);
}

// Fetches the output, stores it, and marks the job done (unless it was cancelled meanwhile).
async function complete(row: Row, provider: ModelProvider, job: JobRef) {
  const db = createAdminClient();
  try {
    const out = await provider.result(job);
    const path = `outputs/${row.user_id}/${row.id}.${out.ext}`;
    const { error } = await db.storage.from("outputs").upload(stripBucket(path), out.bytes, { contentType: out.contentType, upsert: true });
    if (error) throw error;
    await db
      .from("generations")
      .update({
        status: "succeeded",
        output_path: path,
        output_width: out.width ?? null,
        output_height: out.height ?? null,
        output_duration_s: out.durationSeconds ?? null,
        started_at: row.started_at ?? new Date().toISOString(),
        completed_at: new Date().toISOString(),
      })
      .eq("id", row.id)
      .in("status", ACTIVE);
  } catch (e) {
    if (e instanceof ProviderJobFailed || provider.blocking) await fail(row.id, e instanceof Error ? e.message : "Saving the result failed");
    // For queue providers, anything else (a storage hiccup) is retried on the next poll.
  }
}

async function runBlocking(id: string) {
  const row = await getGenerationById(id);
  if (!row || !ACTIVE.includes(row.status)) return;
  const inputImageUrl = row.input_image_path ? await signedUrl(row.input_image_path) : undefined;
  await complete(row, providerByName(row.provider), jobRef(row, inputImageUrl));
}

function jobRef(row: Row, inputImageUrl?: string): JobRef {
  return {
    requestId: row.provider_request_id!,
    modelId: row.model_id,
    kind: row.kind,
    prompt: expandPrompt(row.prompt),
    aspect: row.params.aspect ?? "1:1",
    inputImageUrl,
  };
}

function typicalSeconds(provider: ModelProvider, modelId: string) {
  return provider.typicalSeconds?.(modelId) ?? getModel(modelId)?.typicalSeconds ?? 30;
}

// What the composer should know about the providers currently serving new jobs.
export function capabilities() {
  const image = providerFor("image");
  const video = providerFor("video");
  const ids = (p: ModelProvider, kind: Kind) => MODELS.filter((m) => m.kind === kind && (!p.supportedModels || p.supportedModels.includes(m.id))).map((m) => m.id);
  return {
    referenceImages: image.supportsReference,
    realVideo: video.name !== "mock",
    videoNote: video.qualityNote ?? null,
    models: [...ids(image, "image"), ...ids(video, "video")],
  };
}

// ------------------------------------------------------------------ cancel / fail

export async function cancelGeneration(userId: string, id: string) {
  const db = createAdminClient();
  const { data } = await db
    .from("generations")
    .update({ status: "cancelled", completed_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", userId)
    .in("status", ACTIVE)
    .select()
    .maybeSingle<Row>();
  if (!data) throw new JobError("This job has already finished", 409, "not_active");
  await db.rpc("refund_generation", { p_generation: id });
  if (data.provider_request_id) {
    await providerByName(data.provider).cancel(jobRef(data)).catch(() => {});
  }
  return { balance: await balanceOf(userId) };
}

async function fail(id: string, message: string) {
  const db = createAdminClient();
  const { data } = await db
    .from("generations")
    .update({ status: "failed", error: message, completed_at: new Date().toISOString() })
    .eq("id", id)
    .in("status", ACTIVE)
    .select("id");
  if (data?.length) await db.rpc("refund_generation", { p_generation: id });
}

// ------------------------------------------------------------------ read

export async function listGenerations(
  userId: string,
  opts: { kind?: Kind; q?: string; before?: string; limit?: number; finished?: boolean },
) {
  const db = createAdminClient();
  let query = db
    .from("generations")
    .select("*")
    .eq("user_id", userId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(opts.limit ?? 40);
  if (opts.kind) query = query.eq("kind", opts.kind);
  if (opts.finished) query = query.eq("status", "succeeded");
  if (opts.before) query = query.lt("created_at", opts.before);
  const tsquery = prefixQuery(opts.q);
  if (tsquery) query = query.textSearch("search", tsquery, { config: "english" });

  const { data, error } = await query.returns<Row[]>();
  if (error) throw error;
  const rows = await Promise.all(data.map((r) => (ACTIVE.includes(r.status) ? syncGeneration(r) : r)));
  return Promise.all(rows.map(toDto));
}

// Every word must match, each as a prefix, so results narrow while you type ("light" finds "lighthouse").
function prefixQuery(q?: string) {
  const words = (q ?? "").toLowerCase().match(/[\p{L}\p{N}]+/gu)?.slice(0, 8) ?? [];
  return words.map((w) => `${w}:*`).join(" & ");
}

// Soft delete: the row and its files stay, so a mistaken delete can be undone.
export async function trashGeneration(userId: string, id: string, restore = false) {
  const db = createAdminClient();
  let query = db
    .from("generations")
    .update({ deleted_at: restore ? null : new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", userId);
  // Active jobs are cancelled, not deleted, so their refund logic stays in one place.
  if (!restore) query = query.not("status", "in", `(${ACTIVE.join(",")})`);
  const { data } = await query.select("id");
  if (!data?.length) throw new JobError(restore ? "Nothing to restore" : "Cancel the job before deleting it", 409, "not_deletable");
}

export async function getGeneration(userId: string, id: string) {
  const db = createAdminClient();
  const { data } = await db.from("generations").select("*").eq("id", id).eq("user_id", userId).maybeSingle<Row>();
  return data;
}

export async function getGenerationById(id: string) {
  const db = createAdminClient();
  const { data } = await db.from("generations").select("*").eq("id", id).maybeSingle<Row>();
  return data;
}

export async function balanceOf(userId: string) {
  const db = createAdminClient();
  const { data } = await db.from("profiles").select("credits").eq("id", userId).single();
  return (data?.credits as number) ?? 0;
}

async function toDto(r: Row): Promise<Generation> {
  return {
    id: r.id,
    batchId: r.batch_id,
    parentId: r.parent_id,
    kind: r.kind,
    status: r.status,
    modelId: r.model_id,
    typicalSeconds: typicalSeconds(providerByName(r.provider), r.model_id),
    prompt: r.prompt,
    aspect: r.params.aspect ?? "1:1",
    inputImagePath: r.input_image_path,
    inputImageUrl: r.input_image_path ? await signedUrl(r.input_image_path) : null,
    outputPath: r.output_path,
    outputUrl: r.output_path ? await signedUrl(r.output_path) : null,
    width: r.output_width,
    height: r.output_height,
    durationSeconds: r.output_duration_s,
    cost: r.cost_credits,
    error: r.error,
    createdAt: r.created_at,
    startedAt: r.started_at,
    completedAt: r.completed_at,
  };
}

// ------------------------------------------------------------------ helpers

async function reload(id: string) {
  return (await getGenerationById(id))!;
}

// Paths are "<bucket>/<user id>/<file>".
function ownerOf(path: string) {
  return path.split("/")[1];
}
function stripBucket(path: string) {
  return path.split("/").slice(1).join("/");
}

// Signed URLs are cached so the feed's polling doesn't hand the browser a new URL
// (and a re-download) for the same file every two seconds.
const urlCache = new Map<string, { url: string; expires: number }>();
async function signedUrl(path: string, ttl = 3600) {
  const hit = urlCache.get(path);
  if (hit && hit.expires - Date.now() > 10 * 60_000) return hit.url;
  const [bucket] = path.split("/");
  const { data, error } = await createAdminClient().storage.from(bucket).createSignedUrl(stripBucket(path), ttl);
  if (error || !data) return null as unknown as string;
  urlCache.set(path, { url: data.signedUrl, expires: Date.now() + ttl * 1000 });
  return data.signedUrl;
}

function webhookUrl(id: string, provider: string) {
  const base = process.env.PUBLIC_URL;
  if (!base || provider !== "fal" || base.includes("localhost")) return undefined;
  return `${base.replace(/\/$/, "")}/api/webhooks/fal?id=${id}`;
}

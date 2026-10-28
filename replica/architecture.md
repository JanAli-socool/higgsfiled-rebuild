# Architecture: working name "Reel" (a rebuild of Higgsfield's core loop)

Sources: `recon/MAP.md` (recon map), `replica/features.csv` (scope), `replica/schema.sql` (first migration).
Constraint: 24 hours, judged on how much working product ships, product judgement and UX. It must not be a 1:1 clone.

The whole product is one loop: **prompt → generate → watch it land → iterate / animate**. Every choice below is about keeping that loop fast and honest, and about how few moving parts it takes.

## Stack

| layer | choice | why |
| --- | --- | --- |
| web | Next.js 15 (App Router) + TypeScript | one deploy for UI, server actions and webhooks |
| styling | Tailwind + tokens from `/replica-design` | fast, and the tokens give us our own look rather than Higgsfield's lime-on-black |
| database | Supabase Postgres | Postgres, Auth, Storage and Realtime in one managed service with one key set |
| data access | `supabase-js` + generated types, no ORM | 4 tables; an ORM adds setup time and no value at this size |
| auth | Supabase Auth: magic link + Google | built-in email sending, no separate email provider needed |
| files | Supabase Storage, private buckets, signed URLs | outputs are copied from the provider so they don't expire or leak |
| live updates | Supabase Realtime on `generations` and `profiles` | status and balance update without polling; RLS applies |
| model API | fal.ai queue API behind a `ModelProvider` adapter | async queue + webhooks fit long video jobs; the adapter keeps Replicate as a swap |
| payments | Stripe Checkout, one-time credit packs, test mode | proves the money loop without subscriptions, proration or renewals |
| jobs | none: fal webhooks + a lazy reconcile, plus a daily Vercel cron | Vercel Hobby crons run once a day, so stuck jobs are reconciled when the client looks at them |
| hosting | Vercel | zero-config for Next.js |

One database, one app, one provider adapter.

## Model registry (in code, not the database)

`lib/models.ts`. A curated list is a product decision (MAP §5: model choice was the most confusing part of the original), so it lives in code and gets reviewed like code.

| id | kind | label in UI | cost | typical time |
| --- | --- | --- | --- | --- |
| `img-fast` | image | Fast draft (best for exploring ideas) | 1 credit | ~3 s |
| `img-quality` | image | High quality (best for final stills) | 4 credits | ~15 s |
| `vid-5s` | video | Animate 5 s (best for image → video) | 20 credits | ~90 s |
| `vid-10s` | video | Animate 10 s | 40 credits | ~150 s |

Each entry maps to a fal endpoint, its parameter shape and its output parser. **Check the exact fal model IDs against fal's docs on build day** (they change often). Candidates: a FLUX schnell/dev-class model for images and a Kling-class image-to-video model for video. Costs are whole credits, so there's no `0.125` maths. Signup grants 100 credits, which buys about 25 quality images plus a couple of videos and is enough to judge the product.

Presets (~10) and camera moves (~8) also live in code (`lib/presets.ts`) as `{ id, label, thumbnail, promptFragment }`. A camera move is a `#token` in the prompt; on submit it expands to its fragment. The expanded prompt is what we send, and the token prompt is what we store and display.

## Schema

Tables: 4 (`profiles`, `uploads`, `generations`, `credit_ledger`). Full SQL is in `replica/schema.sql`.
Access: **RLS** on all tables. Clients only `select` their own rows. Every write goes through server code with the service role. Credits only change through four `security definer` functions that clients can't call (`create_generations`, `charge_generation`, `refund_generation`, `grant_credits`).

Key decisions:
- `profiles.credits` is a cached balance with `check (credits >= 0)`; `credit_ledger` is the history. The charge is a single conditional `UPDATE … where credits >= amount`, so parallel Generate clicks can't overspend.
- Partial unique indexes make the signup grant, each charge, each refund and each Stripe purchase happen **at most once**, so retried webhooks are harmless.
- `generations.parent_id` gives Recreate / Reference / Animate lineage and a version tree for free.
- `batch_id` turns "×4 outputs" into 4 rows, each with its own job and refund.
- `search` is a generated `tsvector` with a GIN index, so the library prompt search is one indexed query.
- `deleted_at` soft delete (trash is a should-have).

## API

Reads (feed, library, balance, ledger) go **directly from the browser through `supabase-js` under RLS**, so they need no API routes. These are the writes and webhooks:

| method path | does | who | input | output | flow |
| --- | --- | --- | --- | --- | --- |
| `GET /auth/callback` | finish magic link / OAuth, redirect to `/create` | anyone | code | redirect | F01 |
| `POST /api/uploads` | validate type/size, return a signed upload URL, insert `uploads` row | user | `{ mime, bytes }` | `{ uploadId, path, signedUrl }` | F02 |
| `POST /api/generations` | expand `#tokens`, server-side quote from registry, `create_generations` (insert + charge atomically), submit each to fal with webhook URL, store `provider_request_id`; on submit error refund + mark failed | user | `{ kind, modelId, prompt, params, count, inputImagePath?, parentId? }` | `{ ids[], balance }` or `402 insufficient_credits` | F02 F03 F04 |
| `POST /api/generations/:id/cancel` | mark `cancelled` (any non-terminal state), refund, best-effort cancel at fal | owner | — | `{ balance }` | F02 |
| `POST /api/generations/:id/reconcile` | if `queued/running` past 3× typical time, ask fal for status and finish/fail it (refund on fail) | owner | — | `{ status }` | F02 |
| `DELETE /api/generations/:id` | soft delete | owner | — | 204 | library |
| `POST /api/checkout` | create Stripe Checkout session for a pack (`metadata.user_id`) | user | `{ packId }` | `{ url }` | F08 |
| `POST /api/webhooks/fal` | treat as a ping: re-fetch the result from fal by request id with our key, copy output to Storage, set `succeeded` + dims; on error `failed` + refund. Ignore if the row is already terminal (e.g. cancelled) | fal | provider payload | 200 | F02 |
| `POST /api/webhooks/stripe` | verify signature; on `checkout.session.completed` → `grant_credits(user, pack, 'purchase', session.id)` | Stripe | event | 200 | F08 |
| `GET /api/cron/sweep` | daily: reconcile anything stuck in `queued/running` | Vercel cron (secret) | — | count | — |

Recreate, Use as reference and Animate need **no routes of their own**. They prefill the composer (prompt, params, `inputImagePath`, `parentId`) and go through `POST /api/generations`. Animate prefills video mode with the image as start frame, **keeps the prompt**, and picks `vid-5s` visibly. These fix MAP §5's Turn to video problems.

Webhooks in: fal (job done), Stripe (`checkout.session.completed`). Webhooks out: none.
Only official public APIs with our own keys. Nothing from Higgsfield's private endpoints.

## Screens (our 7)

| route | screen | covers |
| --- | --- | --- |
| `/` | short landing: one line, one sample loop, Sign in | S01 |
| `/sign-in` | magic link + Google | S02 |
| `/create` | **workspace**: composer (image/video toggle) + live results feed + detail drawer | S04 S07 S09 S10 S11 S14 S15 S16-17 merged |
| `/library` | all generations, image/video filter, prompt search, empty state | S19 |
| `/pricing` | 3 credit packs explained as outcomes ("≈ 40 images or 4 videos") | S21 |
| `/account` | balance + ledger | — |
| states | empty, loading, failed, out of credits, sign-in required | — |

## The parts that bite

- **Idempotency:** both webhooks can arrive twice or out of order. Partial unique indexes on the ledger, plus "ignore if the row is already terminal" on the generation, make replays no-ops.
- **Races:** double-clicking Generate is handled by the atomic conditional update plus disabling the button. Cancel racing a completion: whichever terminal write lands first wins, enforced with `update … where status in ('queued','running')`. If fal finishes a job we cancelled, we drop the result and the user keeps the refund (we absorb that cost).
- **Lost webhooks:** jobs stuck in `queued/running` are reconciled when the feed shows a job past 3× its typical time, and by the daily cron.
- **Trusting webhook bodies:** we never trust the payload. We re-fetch from fal with our key, so a forged webhook can't mark a job succeeded.
- **Rate limits / cost blowups:** max 4 concurrent active jobs per user (server check) and `count ≤ 4`; prompt ≤ 2000 chars.
- **File limits:** uploads are PNG/JPEG/WebP ≤ 10 MB, checked server-side and enforced by DB checks. The output copy streams from fal to Storage.
- **Output URLs:** private buckets, `createSignedUrls` in one batch per feed page (1-hour expiry).
- **Long video latency (~1–3 min):** the UI shows elapsed vs typical time and the composer stays usable while jobs run, so the user can keep iterating on stills.
- **Search:** Postgres full-text on the prompt is enough; no search service.
- **Time zones:** timestamps are `timestamptz` in UTC and shown relative ("2 min ago").
- **Secrets:** fal and Stripe keys plus the service role key are server-only env vars, and never `NEXT_PUBLIC_*`.
- **GDPR deletion:** deleting the auth user cascades to every table. Storage files are removed by path prefix (manual for now).
- Not applicable: realtime collaboration, offline, multi-tenancy, email deliverability (Supabase sends the magic links).

## Build order (24 h)

Times are budgets. If a milestone runs over, cut from the bottom of the next one, not from the polish of this one.

1. **Vertical slice (h 0–5).** Sign in → `/create` → type prompt → `img-fast` → row goes queued→running→succeeded in the feed live → click opens detail. Ugly is fine.
   Screens: `/sign-in`, `/create`. Tables: all 4 (migration). Routes: `/auth/callback`, `POST /api/generations`, `POST /api/webhooks/fal`. Proves Supabase + fal + Realtime + Storage end to end. **Deploy to Vercel at the end of this step** (fal webhooks need a public URL).
2. **Core loop must-haves (h 5–12).** Credits shown on Generate next to the balance, insufficient-credits state before clicking, cancel + refund, failure + refund, reconcile, honest progress, count ×1–4, aspect ratio, Recreate / Use as reference / upload reference, **Animate → video** (`vid-5s`, lineage, prompt kept), download.
   Routes: `/api/uploads`, `/cancel`, `/reconcile`.
3. **Directing (h 12–15).** `#` camera-move tokens (picker + chips in the prompt + expansion on submit), ~10 presets with thumbnails that show their prompt fragment.
4. **Library + money (h 15–19).** `/library` (filter, search, empty state), `/pricing` with packs, Stripe Checkout test mode + webhook, `/account` ledger.
   Routes: `/api/checkout`, `/api/webhooks/stripe`, `DELETE /api/generations/:id`.
5. **Polish + design pass (h 19–22).** Apply the `/replica-design` tokens throughout, check every empty/loading/error state, keyboard (⌘↵ to generate), mobile width for `/create`, landing page.
6. **Test + ship (h 22–24).** `/replica-test` click-through of F01–F04, F08; fix the top bugs; write the README with the product-judgement story (what we built first, what we cut, why, from MAP §7).

Should-haves if time remains, in order: compare takes side by side → version tree view → start/end frame → share link → trash.

## Needed from the user before step 1

- A **fal.ai API key** (real generations; roughly $5–10 of usage covers build + demo).
- A **Supabase project** (URL, anon key, service role key).
- **Stripe test-mode** secret key + webhook secret (only needed from step 4).
- A **Vercel** account to deploy (step 1 end).

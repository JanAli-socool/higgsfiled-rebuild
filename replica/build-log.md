# Build log

| ID | date | state | missing | harder than expected |
| --- | --- | --- | --- | --- |
| shell | 2026-10-27 | done | design tokens are placeholders until the design pass | `create-next-app` overwrote our `.gitignore` (fixed: `.env*` ignored, `.env.example` kept) |
| S02 sign-in | 2026-10-27 | done | Google provider not configured. Guest sign-in verified (30 credits, isolated feed); email link verified (admin-generated link + `/auth/confirm`) | Supabase's built-in mailer allows only a few magic links an hour, so guest sign-in is the main way in. A link generated for a brand-new user is a signup token, not a magic-link token |
| S04/S09 /create (composer + feed + detail) | 2026-10-27 | done (M1 + M2) | style presets (M3); mobile width not checked (window could not be resized). Upload, paste, Recreate, Use as reference, Download, out-of-credits state and Ctrl+Enter verified | — |
| API generations / cancel / fal webhook | 2026-10-27 | done on mock | real image provider pending (see below) | see providers |
| providers | 2026-10-27 | partial | real images: Cloudflare credentials pending (Pollinations used for single test images); real video: verified in-app with HF_TOKEN (upload start image → Wan 2.2 Space → 5 s portrait MP4 in ~2.5 min incl. queue, push-in visible, stored + playable) | fal has no balance. Pollinations: 1 image / 45 s per IP. A 5 s Wan clip reserves **150 s** of ZeroGPU quota, so a free account gets ~2 per day. See `reports/Free video generation options.md` |
| S19 /library | 2026-10-28 | done | 390px not checked (Chrome window would not resize); favourites (could) | Undo toast appeared only after the delete returned and auto-hid before it could be clicked: now optimistic, held on hover, Undo waits for the delete |
| S21 /pricing + Stripe | 2026-10-28 | done: test-card purchase verified (+150 once, replay-safe) | needs `STRIPE_SECRET_KEY` (test mode). No webhook secret needed locally: `/pricing/return` re-reads the session from Stripe and grants once (ledger unique index on session id) | Stripe called via REST (no SDK). Guests are blocked from buying: anonymous credits are lost with the browser session |

## Verified in the browser (2026-10-27)

Email sign-in → `/create` with 100 credits → prompt + `#push-in` + ×2 → charged 2 → progress → 2 outputs stored in Supabase Storage → detail panel → Animate (video mode, prompt + camera move kept, start frame attached) → video charged 20 → cancel → 20 refunded → video again → done. Two provider failures (402/500) were each refunded once. Ledger sum equals the balance (78). Recording: `reel_core_loop_slice1.gif` (browser downloads folder).

Bugs found and fixed: identical ×N mock takes (now seeded per take); lineage dropped on the second take from the same draft; "1 credits".

## Deviations from architecture.md

- **Reads go through `GET /api/generations`, not supabase-js in the browser.** Every poll also advances active jobs with the provider (the lazy reconcile) and returns cached signed URLs. One code path means local dev works without public webhooks. Supabase Realtime is now optional polish.
- **Server reads use the service role with an explicit `user_id` filter** (data-layer checks). RLS still blocks any direct client access.
- **Video always starts from an image** (image-to-video only). The core loop is still → motion, and this halves the model surface.
- **Providers are chosen per kind** (`IMAGE_PROVIDER` / `VIDEO_PROVIDER` override `MODEL_PROVIDER`). "Blocking" providers (one long HTTP call) are finished with Next's `after()` right after the response; a job lost to a crashed worker is caught by the timeout and refunded.
- **Mock provider** renders SVG placeholders with realistic timings; a prompt containing `fail-test` fails on purpose to exercise refunds.

## Gotcha

Running `npm run build` while `npm run dev` is running overwrites `.next` and breaks the dev server (and on Windows leaves an orphaned node process holding port 3000). Build in CI or stop dev first.

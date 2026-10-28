# Build log

| ID | date | state | missing | harder than expected |
| --- | --- | --- | --- | --- |
| shell | 2026-10-27 | done | design tokens are placeholders until the design pass | `create-next-app` overwrote our `.gitignore` (fixed: `.env*` ignored, `.env.example` kept) |
| S02 sign-in | 2026-10-27 | done | Google provider not configured. Guest sign-in verified (30 credits, isolated feed); email link verified (admin-generated link + `/auth/confirm`) | Supabase's built-in mailer allows only a few magic links an hour, so guest sign-in is the main way in. A link generated for a brand-new user is a signup token, not a magic-link token |
| S04/S09 /create (composer + feed + detail) | 2026-10-28 | done (M1-M3) | style presets done 2026-10-28; mobile width not checked (window could not be resized). Upload, paste, Recreate, Use as reference, Download, out-of-credits state and Ctrl+Enter verified | — |
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

## Design pass (2026-10-28)

- Own identity: "darkroom" tokens (warm near-black neutrals, one safelight-orange accent), a film-frame logo with a play notch, reduced-motion respected.
- Landing rebuilt around the core loop using our own outputs: the still, the prompt with `#push-in`, and the real Wan clip it became.
- Composer floats as a card on wider screens and stays a bottom sheet on phones. First run offers three starter prompts.
- **Phone width (390 px) checked** for landing, sign-in, create, library, pricing and the detail panel, using a temporary same-origin page of 390 px iframes (Chrome would not resize its window; headless Chrome clamps to ~500 px). Fixed: header wrapping, pricing horizontal scroll (grid children needed `min-w-0`), detail sheet covering the image (now stacked).
- Sign-in hides "Continue with Google" until the provider is enabled in Supabase (read from `/auth/v1/settings`), so the button can never lead to a provider error.

## Video quality, longer shots, generating backdrop (2026-10-28)

- **Pixelation, root cause** (measured, not guessed): the free Wan 2.2 Space has no resolution input and always renders ~480p at 16 fps (480×832 for 9:16, 624×832 for 3:4, ~1 Mbps). Our own contribution was fast drafts at 384×512: Animate fed them in and the model upscaled them. Fix: fast drafts are now 832 on the long side (verified in-app: 624×832). The composer states the video model's limits before you pay. Real HD needs a paid model (one env change in the provider adapter).
- **Longer shots: Extend.** Free video stops at 5 s, so a shot is built from linked clips: Extend grabs the exact last frame of a clip in the browser (canvas; Storage sends `Access-Control-Allow-Origin: *`), uploads it, and opens the composer with it as the start frame and `parent_id` set. "Play full shot" plays the chain back to back. Verified: 624×832 PNG last frame, real continuation clip in 115 s, 3-clip / 15 s shot plays in order and loops. Limit: about 2 free clips a day, so 30 s (6 clips) or 60 s (12 clips) takes days on the free token.
- **Generating backdrop**: in-progress cards show the start frame (or reference) dimmed with a slow push-in, or a shimmer for prompt-only images, instead of a black box.
- **Pollinations 503** ("Classic API is at its limit right now") is retried once after 12 s; the remaining failure reads "busy, try again in a minute".

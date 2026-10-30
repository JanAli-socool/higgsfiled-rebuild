# Reel

**Make a still. Then make it move.** Reel is a 24-hour rebuild of the core of [higgsfield.ai](https://higgsfield.ai): one workspace where you draft images, pick the frame you like, and animate it into a short video shot with camera moves you direct in words.

It is not a clone. It keeps the one loop people pay Higgsfield for and fixes the parts that got in the way during recon.

**Live: https://higgsfiled-rebuild.vercel.app** (Stripe in test mode; free model tiers, see [Honest constraints](#honest-constraints)).

## Try it in 60 seconds

1. **Start free, no account needed**: one click and you're in the workspace with 30 credits.
2. Click a starter prompt (or write your own), add a **Style** like Noir, press **Generate** (1 credit).
3. Open the result and press **Animate this image**. The prompt carries over; add a camera move like `#push-in` and generate.
4. Watch the honest progress bar over the frame being animated. Cancel any time and the credits come back.
5. Open a finished clip and press **Extend** to continue it from its exact last frame; **Play full shot** plays the linked clips as one.
6. Find everything later in **Library** (filter, search as you type). Top up on **Credits** (Stripe test card `4242 4242 4242 4242`).

## The product judgement story

### What I studied first

Before any code I went through Higgsfield end to end and saved 42 screenshots and a map of flows, the core loop, and what was slow or confusing ([`recon/MAP.md`](recon/MAP.md)). The loop users actually pay for is short: **prompt → still → pick → animate → keep.** Almost everything else on the site (22 top-nav items, ~30 models, community, effects, editing suites) sits around that loop, and a lot of it gets in its way.

### What I built first, and why in that order

| # | Milestone | Why it came here |
| --- | --- | --- |
| 1 | **A thin vertical slice**: sign in → prompt → job → result in the feed | Proves the risky part first: async jobs against real model latency, stored outputs, the whole stack talking. |
| 2 | **Money-safe job pipeline**: atomic charge, cancel at any stage, automatic refunds on failure or timeout | Credits are the product's trust contract. One conditional SQL update charges; partial unique indexes make refunds and grants idempotent, so double webhooks or races can't double-charge or double-refund. |
| 3 | **The loop itself**: detail panel, Recreate, Use as reference, **Animate** with lineage, uploads | This is what people pay for, so it got built before anything decorative. |
| 4 | **Camera moves as `#tokens`** and **style presets as visible words** | The cheapest way to give direction without a camera-rig UI. |
| 5 | **Library** (filter, prefix search, trash with Undo) and **Pricing with Stripe Checkout** | Retention and the money loop, each verified end to end. |
| 6 | **Design pass and phone width** | Last on purpose: polish on a loop that already works. |
| 7 | **Extend** (longer shots from linked 5 s clips) and a generating backdrop | Asked for after using it: the free video model stops at 5 s and ~480p, so length comes from chaining clips frame-exactly, not from a bigger model. |
| 8 | **Deploy and a live end-to-end test** | Guest, email and Google sign-in, drafts, library, a test-card purchase and the Stripe webhook, all on the live URL. The test found two UX issues, fixed the same day (below). |

### What I fixed compared with the original

| On Higgsfield (seen in recon) | In Reel |
| --- | --- |
| Four different generate forms across Image, Video, Cinema Studio, Effects | **One composer** with an Image / Video switch |
| "Turn to video" switches model **and drops your prompt** | **Animate keeps the prompt**, the start frame and the link back to the parent take |
| Just "Generating" for 25 s, no ETA; Cancel disappears once a job runs | **Elapsed vs typical time**, honest "taking longer than usual", **Cancel in every state** with refund |
| The default model is paywalled, and you find out after writing the prompt | **Cost and what you'll have left on the Generate button**; short credits are flagged *before* you press it |
| Choosing a preset hides the prompt | **Presets write plain words into the prompt** you can read and edit |
| ~30 models, marketing names, prices that vary ~100× | **Three choices labelled "best for"** (fast draft, high quality, animate) |
| Pricing explained in model names ("≈ 60 Nano Banana Pro generations") | **Packs explained as outcomes**: "about 150 drafts, or 7 five-second videos" |
| Sign-up lands on the marketing page; empty tabs show onboarding | **Straight into the workspace**, real empty states with starter prompts |
| Delete with no way back | **Trash with Undo** |
| Clips are a fixed length | **Extend** a clip from its exact last frame and play the chain as one shot |

Found in our own live test and fixed: the landing button led to a sign-in page that asked the same question again (now one click), and Generate showed nothing for ~8 s on a cold serverless start (the card now appears the instant you click).

### What I cut, and why

| Cut | Why |
| --- | --- |
| ~25 of ~30 models | Model choice was the most confusing step; three curated options cover the use cases. |
| Subscriptions | Proration and renewals cost hours; one-off packs prove the money loop. |
| Camera body / lens / aperture rig | Camera *moves* give most of the value for a fraction of the UI. |
| Community, profiles, likes, contests | A network effect plus moderation, and it doesn't help a solo creator's loop. |
| Characters / AI influencer / Soul ID, video edit suite, Motion Control, effects | Each is its own model pipeline or fine-tuning job. |
| Projects and folders | A flat library with fast search is enough at this scale. |
| Promo banners, academy, enterprise plans | Marketing, not product. |

Higgsfield's own models, preset videos and community content can't be cloned at all; Reel uses public models and its own outputs (the landing-page clip was made in Reel).

### Honest constraints

- **Free models.** The paid model API (fal) had no balance, so Reel runs on free tiers behind one provider adapter (`src/lib/providers/`): images from Pollinations (about one per 45 s per IP) or Cloudflare Workers AI, video from a public Hugging Face ZeroGPU Space running **Wan 2.2 image-to-video** (real 5 s clips, ~1–2.5 min, about 2 clips a day on a free token). Research behind that choice: [`reports/Free video generation options.md`](reports/Free%20video%20generation%20options.md). Swapping to a paid provider is an env change, and that was proven: **Google Veo 3.1** (Lite, through KIE) plugs into the same adapter with `VIDEO_PROVIDER=kie` and makes 8 s, 720p clips with sound in about 80 s, at about $0.15 a clip.
- **Video always starts from an image** (image-to-video only). It matches the loop and halves the model surface.
- **Video quality and length.** The free Space renders ~480p at 16 fps and 5 s per clip (Veo 3.1: 720p, 8 s), and the composer says which before you pay. A 30 s shot is six extended clips, which takes days on the free daily allowance; with a paid video provider the same Extend flow works unchanged.
- **Guests can't buy credits**: anonymous credits would be lost with the browser session, so the page asks them to sign in with email first.

## What's in the box

- **Next.js 15** (App Router, React 19, TypeScript, Tailwind v4), **Supabase** (Postgres, Auth, Storage, RLS), **Stripe Checkout** via its REST API.
- **Auth**: guest (anonymous), email magic link, Google (shown only once enabled in Supabase).
- **Jobs**: `POST /api/generations` charges and submits in one transaction; reads go through `GET /api/generations`, which also advances active jobs with their provider (works locally without public webhooks). Long single-call providers finish in `after()`; a timeout fails and refunds anything stuck.
- **Credits**: a ledger (`credit_ledger`) with one charge and one refund per generation and one grant per Stripe session, enforced by unique indexes. The balance always equals the ledger sum.
- **Payments**: credits are granted when the buyer returns from Checkout (the server re-reads the session from Stripe) and by a signature-checked webhook, whichever arrives first, exactly once.

Plans and tracking: [`replica/architecture.md`](replica/architecture.md), [`replica/schema.sql`](replica/schema.sql), [`replica/features.csv`](replica/features.csv) (feature matrix: 27 of 28 must-haves done and verified; the 28th, curated models, runs on free tiers), [`replica/build-log.md`](replica/build-log.md).

## Run it locally

```bash
npm install
cp .env.example .env.local   # fill in the values below
npm run dev                  # http://localhost:3000
```

1. Create a Supabase project and run [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql) in the SQL editor. In Auth → Providers, enable **Anonymous sign-ins** (and Google, optionally).
2. Fill `.env.local` (names in [`.env.example`](.env.example)):
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
   - Providers: `IMAGE_PROVIDER` (`pollinations` | `cloudflare` | `fal` | `mock`), `VIDEO_PROVIDER` (`huggingface` | `kie` | `fal` | `mock`), plus `HF_TOKEN` (a free read token) for the free video model, or `KIE_API_KEY` for Veo 3.1
   - `STRIPE_SECRET_KEY` (test mode). `STRIPE_WEBHOOK_SECRET` only once deployed.
3. A prompt containing `fail-test` fails on purpose (mock provider), to see the refund path.

Don't run `npm run build` while `npm run dev` is running: they share `.next`.

## Deploy (Vercel)

1. Import the repo in Vercel and add the same environment variables, plus `PUBLIC_URL=https://<your-domain>`.
2. In Supabase → Auth → URL configuration, set the Site URL to the Vercel domain and add `https://<your-domain>/auth/callback` to the redirect URLs.
3. In Stripe (test mode) → Developers → Webhooks, add `https://<your-domain>/api/webhooks/stripe` for `checkout.session.completed` and `checkout.session.async_payment_succeeded` (payload style **Snapshot**: Checkout events aren't offered as thin events), then set its signing secret as `STRIPE_WEBHOOK_SECRET` and redeploy.
4. Google sign-in (optional): a Google OAuth web client with redirect URI `https://<project>.supabase.co/auth/v1/callback`, its ID and secret in Supabase → Auth → Providers → Google. The button appears on the next visit to sign-in.

`/api/generations` uses `maxDuration = 300` so a free-tier video can finish in the background.

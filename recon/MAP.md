# Higgsfield recon map

Walkthrough of higgsfield.ai on 2026-10-27, done in the browser using the user's own account (signed in, 0 credits, no paid plan). Screenshots `01`–`42` in this folder are for reference only: none of Higgsfield's assets, copy or branding go into the build.

Spend during recon: one Soul 2.0 image (listed at 0.125 credits; it went through on a 0 balance). No video was generated. GPT Image 2 hit the paywall before any generation.

---

## 1. What Higgsfield actually is

Higgsfield is a single **front end over roughly 30 third-party image and video models** (Kling, Seedance, Veo, Wan, Nano Banana, GPT Image, FLUX, plus its own Soul models). On top of the models it adds:

1. **Presets.** 250+ named motion and VFX templates ("Float Spin", "Sticker Peel") and style moodboards. A preset swaps prompt engineering for a single click on a thumbnail.
2. **Camera language.** A camera, lens, focal length and aperture rig, plus camera *moves* (crane up, rack focus, POV) that go into the prompt as tokens.
3. **Credits.** One currency across every model. Every Generate button shows its cost.
4. **Library and community.** Assets, projects and "elements" (reusable characters and locations), plus public projects that show their prompts.

The top nav has **22 items** (Explore, Image, Video, Audio, MCP, API, Genjutsu, Content Factory, Playable, AI Influencer, Academy, Katana, ChatGPT Plugin, Ads Studio, Effects, Cinema Studio, Contests…). Most are separate product bets wrapped around the same generate step.

---

## 2. Screen inventory

| ID | Screen | Route / how reached | Shot(s) | States seen |
|---|---|---|---|---|
| S01 | Landing / Explore | `/` | 01–03 | logged-out, logged-in |
| S02 | Sign-up | `/auth/sign-up` (logged-out) | 42 | default (OAuth ×3 + work email, ToS checkbox) |
| S03 | Image mega-menu | hover "Image" | 04 | 12 features, 12+ models |
| S04 | Image generator | `/ai/image?model=…` | 05–07, 22, 24, 28, 38 | empty hero, typing, generating, results feed, blank while loading (21) |
| S05 | Media / reference picker | `+` in composer | 08 | empty (tabs: Uploads, AI Influencer, Elements, Generations, Liked) |
| S06 | Style / moodboard picker | "Change" on Soul composer | 25 | curated grid |
| S07 | Generation detail | click a result | 29, 30 | hover actions, info panel |
| S08 | Upgrade wall | Generate on a gated model | 23 | full-screen plan picker |
| S09 | Video generator: Create | `/ai/video?model=…` | 11, 13, 31 | default (prompt), preset selected (no prompt, image required), prefilled from image |
| S10 | Video preset gallery | "Change" on preset card | 12 | grid, tabbed by model |
| S11 | Video model picker | Model row | 14 | list with resolution and duration chips |
| S12 | Video: Edit tools | Edit Video tab | 32 | 8 tools (extend, reframe, upscale…) |
| S13 | Video: Motion Control | Motion Control tab | 33 | motion library |
| S14 | Video History | History tab | 15 | **empty = shows "how it works" again** |
| S15 | Cinema Studio | `/generate` | 09, 34 | image mode, video mode (separate sidebar app shell) |
| S16 | Camera rig picker | camera card / Camera chip | 10, 35 | camera/lens/focal/aperture "slot machine" |
| S17 | Camera movement picker | Camera › Movement | 36 | grid of named moves |
| S18 | Effects | `/effects/use` | 39 | preset form with character/location/product slots |
| S19 | Assets library | `/asset/all` | 16, 37 | empty, one item |
| S20 | Profile | avatar → `/@handle` | 19, 20 | skeleton, own profile |
| S21 | Pricing | `/pricing` | 17, 18 | plans, per-model credit table, plan quiz |
| S22 | Community project | `/@user/projects/…` | 40, 41 | player, asset breakdown by folder |

There are **four different versions of the generate form**: the bottom composer bar (S04), the left settings panel (S09), Cinema Studio's centred composer with chips (S15), and the Effects slot form (S18). They do the same job in four layouts.

---

## 3. Flows

Click counts are for the happy path, from a logged-in start.

**F01 Sign up**
S01 → Sign up → S02 → OAuth (or work email → verify) → back on S01
3 clicks with OAuth. Work email gets 50 credits, personal email gets nothing visible. Signing up drops you on the marketing page, not on a generator.

**F02 Text → image (the core action)**
S01 → hover Image → Create Image → S04 → type prompt → Generate → wait about 25 s → result in feed
3 clicks plus typing. Default model on our visit was GPT Image 2, which is **gated**: the first Generate hits S08. Switching to Soul 2.0 took 2 more clicks, and the prompt survived the switch.
States: `Processing` + Cancel → `Generating` (Cancel disappears, no progress or ETA) → image.

**F03 Iterate on a result**
S07 detail → Recreate (same settings) / Reference (use as input) / Copy prompt / Download / Favourite
1–2 clicks. This is the inner loop.

**F04 Image → video ("Turn to video")**
S07 → Turn to video → S09 with the image as start frame → (prompt) → Generate
2 clicks. Problems: the **model silently switches** (Soul → Kling 3.0), the **image's prompt is not carried over**, and the prompt box shows example text ("Analyze this YouTube channel…") that looks like real input.

**F05 Video with a preset**
S09 → Change → S10 grid → pick preset → upload image → Generate
4 clicks + upload. Picking a preset **removes the prompt field** and makes an image required; the cost changed 36 → 28.

**F06 Cinematic camera shot**
S15 → Video → Camera chip → Setup (camera/lens/aperture) and/or Movement (pick moves; they're "added to the prompt, or type `#`… order matters") → Generate (80 credits)
4–5 clicks. This is the most distinctive idea on the site: **camera moves as prompt tokens**.

**F07 Find past work**
Header Assets → S19 (grid, date groups, search by date and prompt, filter by type)
1 click. Each generator also restores its own feed with a "Last viewed" marker (38). The video History tab with no items just shows the onboarding.

**F08 Out of credits → upgrade**
Generate on a gated model or with too few credits → S08 → pick plan → checkout
The wall appears **after** the prompt is written, not when the model is picked.

**F09 Browse community → learn**
S01 → project card → S22 (video, stats: 391 generations, 11,598 credits, folders Characters/Locations/Props/Scene_01…)
Shows how heavy users work: lots of iteration, organised by element and scene.

---

## 4. The core loop

```
prompt (+ optional reference / preset / camera move)
   → Generate (see cost)
   → wait ~25 s image / longer video
   → look at result in feed
   → Recreate / tweak prompt / use as reference / Turn to video
   → repeat
```

Everything else (pricing, community, presets, elements) either feeds this loop or monetises it. A heavy user spends hours in it: one featured project had **391 generations**. So what matters most is:

1. **Time from idea to first result.** Clicks, load time, model choice.
2. **Iteration speed.** Tweaking and regenerating without losing context; comparing takes side by side.
3. **Image → video handoff.** The real workflow is to get a still right, then animate it.
4. **Knowing the cost before you commit.**

---

## 5. What feels slow or confusing

**Slow**
- Image generator loaded **blank for 3–6 s** after navigation (21). Profile showed a skeleton for about 2 s (19). Moodboard modal opened about 1.5 s after the click (it ignored Escape because it wasn't open yet).
- Generation gives no progress, no ETA and no queue position: just "Generating" for about 25 s.
- Cancel disappears once a job moves from "Processing" to "Generating".

**Confusing**
- **22 top-nav items.** Image, Cinema Studio, Effects and Video all generate media, each with its own layout (four generate forms). Cinema Studio even swaps in a different app shell with a sidebar.
- **The hero says "Start creating with Soul Cinema" but the selected model is GPT Image 2** (05).
- **The default model is paywalled**, and you only find out after writing a prompt (23).
- **About 30 models** with marketing names and no "best for…" guidance at the point of choosing; prices differ by about 100×.
- **Turn to video** switches model, drops the prompt, and shows example text that looks like real input (31).
- **Presets change the form's shape** (the prompt disappears). Fine once you know, startling the first time.
- **Video History with no items shows "how it works"** instead of an empty state, so it reads as a broken tab (15).
- Credit cost labels such as `0.125`, `6.5` (with a strikethrough `8.5`), `28`, `36`, `80`, `84` aren't linked to the balance anywhere on the generate screen. The balance only shows on the profile page.
- Pricing explains credits as "≈ 60 Nano Banana Pro generations / ~7 Seedance videos", which only means something if you already know the models.
- Upsell surfaces everywhere: a "30% OFF" badge, banners inside the results feed (26), an Academy toast on every generator.
- Sign-up lands you on the marketing page instead of the generator.

**Worth keeping (good patterns)**
- Cost on the Generate button.
- Prompt is kept when switching models.
- Camera moves as stackable `#` tokens in the prompt.
- Result detail panel: prompt, model, size and created date, plus Recreate / Reference / Turn to video.
- One Assets library across all tools, with search by prompt.
- Visual preset thumbnails instead of words.

---

## 6. Inferred data model (for the build)

```
User          id, email, handle, credits_balance, plan
Generation    id, user_id, kind (image|video), status (queued|running|succeeded|failed|cancelled),
              prompt, model_id, params (json: aspect, quality, duration, camera_moves[], preset_id, seed),
              input_asset_ids[], output_url, cost_credits, created_at, parent_generation_id
              evidence: detail panel (30), Recreate/Reference/Turn to video, status labels (26–27)  confidence: high
Preset        id, kind (motion|style|camera_move), name, thumbnail_url, prompt_fragment, model_ids[]
              evidence: 12, 25, 36 — camera moves literally "add to the prompt"  confidence: med
Model         id, name, kind, cost_per_unit, max_duration, resolutions[], gated_plan
              evidence: 06, 14, pricing table (18)  confidence: high
CreditLedger  id, user_id, delta, reason (signup|purchase|generation|refund), generation_id
              evidence: per-model credit costs, refunds implied by Cancel  confidence: guess
Element       id, user_id, kind (character|location|product), name, ref_asset_ids[]   — cut for 24h
Project       id, user_id, title, folders, public                                     — cut for 24h
```

`parent_generation_id` is what makes iteration, Recreate and Turn to video cheap to build, and it gives a version tree for free.

---

## 7. What to build in 24 h, and what to cut

**Thesis for our version:** one workspace and one composer, where the image → video loop is quick to see and quick to iterate. Higgsfield covers a lot of ground but its core loop is spread across four forms and 22 nav items. We'll do one loop properly.

### Build (in order: thin vertical slice first)
1. **Auth.** Magic link or Google only. Land straight in the workspace, not on a marketing page. Starter credits on signup.
2. **One composer** (shared by image and video): prompt, model (3–4 curated, each labelled "best for…"), aspect ratio, count, **live cost next to the remaining balance**, Generate.
3. **Generation job pipeline.** Queue → running → succeeded/failed, with honest progress (elapsed time / typical time), cancel that works in any state, and automatic credit refund on failure. Use real model APIs (e.g. fal / Replicate) behind one adapter.
4. **Results feed + detail panel.** Prompt, params, Recreate, Use as reference, Download, **Animate** (image → video keeping prompt and lineage, and staying in the same composer).
5. **Camera moves as `#` tokens.** About 8 moves (push in, pull out, pan L/R, tilt, orbit, crane, handheld) with a thumbnail picker that inserts chips into the prompt. Cheap to build, demos well, and it's the differentiator.
6. **Presets.** About 10 style/motion presets as prompt fragments with thumbnails. Choosing one shows what it adds rather than hiding the prompt.
7. **History / library.** A single grid of all generations, filter image/video, search by prompt, plus real empty states.
8. **Credits + pricing.** Balance in the header, ledger, a simple 3-tier pricing page, Stripe test-mode top-up. Show the upgrade gate **when a gated model is picked**, not after Generate.

### Should, if time allows
- Side-by-side compare of 2–4 takes; version tree from `parent_generation_id`.
- Start + end frame for video.
- Public share link for a single generation.

### Cut (and why)
| Cut | Reason |
|---|---|
| ~25 of the ~30 models | Choosing a model is the most confusing step; 3–4 curated ones cover the use cases |
| Cinema Studio's camera body/lens/aperture rig | Gimmicky for a v1; camera *moves* give 80% of the value |
| Community, profiles, likes, comments, contests | It's a network effect and moderation-heavy, and doesn't help a solo user's loop |
| Elements / AI Influencer / Soul ID characters | Needs model fine-tuning or reference pipelines; too big for 24 h |
| Video edit suite (extend, reframe, upscale, HDR, FPS, depth) | Each one is its own model integration |
| Motion Control, Genjutsu, Katana, Effects slot form | Specialised pipelines; the presets cover the idea |
| Audio, Playable, Content Factory, Ads Studio, MCP, API, ChatGPT plugin | Separate products |
| Projects / folders | The flat library + search is enough at this scale |
| Academy, plan quiz, promo banners | Marketing, not product |
| Enterprise / SSO / business plans | No users to sell to |

### Cannot be cloned at all
Higgsfield's own models (Soul 2.0, Soul Cinema, DoP), its preset video library and thumbnails, the community and its content, and partner pricing deals with model vendors. We use public model APIs and make our own preset thumbnails.

### Size
22 screens and 9 flows on the original. Our slice is **about 7 screens** (sign-in, workspace/composer+feed, detail panel, library, pricing, account/credits, empty/error states) and **5 flows** (F01, F02, F03, F04, F08, with F06 folded into F02). Hard parts: async job orchestration with real model latency (30 s – several min for video), refunds that stay correct on failure, and keeping the image → video lineage intact. Fits in 24 h if the model adapter and job queue are built first.

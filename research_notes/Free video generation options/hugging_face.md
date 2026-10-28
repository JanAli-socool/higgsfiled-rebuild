# Free video generation via Hugging Face (as of 2026-10-27)

Method note: Space status, hardware, endpoints and app.py constants below were pulled live on 2026-10-27 from the public HF API (`https://huggingface.co/api/spaces/{id}?expand[]=runtime`), each Space's Gradio schema (`https://{host}/gradio_api/info`) and its public `app.py` (`https://huggingface.co/spaces/{id}/raw/main/app.py`). No account was used and no generation was run, so generation times are derived from code and docs, not measured. The hardware label `zero-a10g` is HF's internal name for ZeroGPU. The docs now say ZeroGPU runs on RTX Pro 6000 Blackwell.

## 1. Which public Spaces currently host image-to-video / text-to-video, and are they running?

### Takeaway
Many Wan 2.2 and LTX-2.x image-to-video Spaces are RUNNING on ZeroGPU. The best-maintained ones are `zerogpu-aoti/wan2-2-fp8da-aoti-faster` (Wan 2.2 14B, up to 5.0 s at 16 fps, 480–832 px), the `r3gm/wan2-2-fp8da-aoti-preview*` Spaces, and the official Lightricks LTX Spaces (`Lightricks/LTX-2-3`, `Lightricks/LTX-2.5`, `Lightricks/ltx-video-distilled`). FramePack, HunyuanVideo and the official Wan-AI Spaces are broken or no longer exist. Every working Space is ZeroGPU, so all of them are limited by the caller's daily quota (section 2).

### Cited Findings
**Live status table (HF API, 2026-10-27).** Columns: likes; last-modified date of the Space.

| Space id | Model | Status | HW | Likes | Last modified |
|---|---|---|---|---|---|
| zerogpu-aoti/wan2-2-fp8da-aoti-faster | Wan 2.2 14B I2V (FP8, AoTI, Lightning) | RUNNING | ZeroGPU | 3774 | 2026-08-25 |
| r3gm/wan2-2-fp8da-aoti-preview | Wan 2.2 14B I2V | RUNNING | ZeroGPU | 3257 | 2026-08-21 |
| r3gm/wan2-2-fp8da-aoti-preview2 | Wan 2.2 14B I2V | RUNNING | ZeroGPU | 2188 | 2026-09-04 |
| multimodalart/wan-2-2-first-last-frame | Wan 2.2 first/last frame | RUNNING | ZeroGPU | 676 | 2026-02-15 |
| multimodalart/wan2-1-fast | Wan 2.1 I2V fast | RUNNING | ZeroGPU | 1623 | 2025-07-07 |
| Lightricks/LTX-2-3 | LTX 2.3 distilled I2V | RUNNING | ZeroGPU | 485 | 2026-05-15 |
| Lightricks/LTX-2.5 | LTX-2.5 distilled two-stage (video with audio) | RUNNING | ZeroGPU | 83 | 2026-10-11 |
| Lightricks/ltx-video-distilled | LTX-Video 0.9.8 13B distilled | RUNNING | ZeroGPU | 1611 | 2026-06-15 |
| alexnasa/ltx-2-TURBO | LTX-2 Turbo (video with audio) | RUNNING | ZeroGPU | 550 | 2026-08-31 |
| zai-org/CogVideoX-5B-Space | CogVideoX-5B (T2V, I2V, V2V) | RUNNING | ZeroGPU | 1053 | 2026-05-22 |
| zai-org/CogVideoX-2B-Space | CogVideoX-2B | RUNNING | ZeroGPU | 460 | 2025-06-27 |
| linoyts/FramePack-F1 | FramePack F1 | RUNNING | ZeroGPU | 330 | 2025-09-17 |
| Lightricks/ltx-2-distilled | LTX-2 | RUNTIME_ERROR | — | 221 | 2026-06-16 |
| Lightricks/ltx-2 | LTX-2 | RUNTIME_ERROR | — | 79 | 2026-01-06 |
| Wan-AI/Wan2.1 | Wan 2.1 official | RUNTIME_ERROR (cpu-basic) | — | 2195 | 2025-03-20 |
| lllyasviel/FramePack, Wan-AI/Wan-2.2-5B, tencent/HunyuanVideo-1.5 | — | API returns "not found / auth" (missing or private) | — | — | — |

Source for every row: [HF Spaces API](https://huggingface.co/api/spaces?search=wan&expand[]=runtime). Example Space pages: [zerogpu-aoti/wan2-2-fp8da-aoti-faster](https://huggingface.co/spaces/zerogpu-aoti/wan2-2-fp8da-aoti-faster), [Lightricks/LTX-2-3](https://huggingface.co/spaces/Lightricks/LTX-2-3), [Lightricks/LTX-2.5](https://huggingface.co/spaces/Lightricks/LTX-2.5).

- Almost every community HunyuanVideo, FramePack, CogVideoX fork and older "image-to-video" Space from 2023–2025 is in RUNTIME_ERROR, BUILD_ERROR or PAUSED, or runs on cpu-basic (so it cannot really generate). — [HF Spaces API search](https://huggingface.co/api/spaces?search=framepack&expand[]=runtime)
- Several of the highest-trending video Spaces right now are community re-uploads aimed at NSFW or "uncensored" output, for example `*/LTX-2.3-10Eros`, `Mnichal/uncensored-image-to-video-alchemist` and `wank3r/*`. They are a poor choice for a production demo for both policy and stability reasons. — [HF Spaces API search](https://huggingface.co/api/spaces?search=i2v&sort=trendingScore&expand[]=runtime)

**Endpoints and output limits (from each Space's `/gradio_api/info` and `app.py`):**
- **zerogpu-aoti/wan2-2-fp8da-aoti-faster** (Gradio 6.1.0). Endpoint `/generate_video(input_image, prompt, steps=6, negative_prompt, duration_seconds=3.5, guidance_scale=1, guidance_scale_2=1, seed=42, randomize_seed=true)` returns `[video, seed]`. FIXED_FPS = 16, MAX_FRAMES_MODEL = 80, so the maximum clip is 5.0 s. MAX_DIM is 832 and MIN_DIM is 480, giving 832x480 or 480x832 output. GPU size is the default `large`. Requested GPU time = `10 + steps * 15 * (frames*w*h / (81*832*624))^1.5`. — [app.py](https://huggingface.co/spaces/zerogpu-aoti/wan2-2-fp8da-aoti-faster/raw/main/app.py)
- **r3gm/wan2-2-fp8da-aoti-preview** (Gradio 5.44.1). Endpoint `/generate_video(input_image, last_image, prompt, steps=6, …, duration_seconds=3.5, …, quality=6, scheduler="UniPCMultistep", flow_shift=3, frame_multiplier=16, video_component=true, safe_mode=true, enable_safety_checker=true)` returns `[video, download, seed]`. It also has `/extract_frame` and supports frame interpolation. It uses `@spaces.GPU(size='xlarge')`, which costs 2x quota. — [app.py](https://huggingface.co/spaces/r3gm/wan2-2-fp8da-aoti-preview/raw/main/app.py)
- **Lightricks/LTX-2-3** (Gradio 6.8.0). Endpoint `/generate_video(input_image, prompt, duration=3, enhance_prompt=false, seed=10, randomize_seed=true, height=1024, width=1536)`. The duration slider runs from 1 to 10 s. The default is "High Resolution" at 1536x1024. It uses a fixed `@spaces.GPU(duration=75)`. — [app.py](https://huggingface.co/spaces/Lightricks/LTX-2-3/raw/main/app.py)
- **Lightricks/LTX-2.5** (Gradio 6.13.0). Endpoint `/run(prompt, image_path, height=1472, width=832, duration_s=2, seed=42, decoder="conv", auto_len=false, randomize_seed=true, do_enhance=true)` returns the result with audio. It runs at 24 fps, the short side of an I2V clip is 832 px, and auto-length can go up to 15 s. It uses `@spaces.GPU(size="xlarge")`, which costs 2x quota. — [app.py](https://huggingface.co/spaces/Lightricks/LTX-2.5/raw/main/app.py)
- **Lightricks/ltx-video-distilled** (LTX 0.9.8 13B distilled). Endpoint `/image_to_video(prompt, negative_prompt, input_image_filepath, input_video_filepath, height_ui=512, width_ui=704, mode="image-to-video", duration_ui=2, …)`. Duration can be 0.3 to 8.5 s at 30 fps, and resolution goes up to 1280. It uses `size="xlarge"` with a dynamic duration. — [app.py](https://huggingface.co/spaces/Lightricks/ltx-video-distilled/raw/main/app.py)
- **alexnasa/ltx-2-TURBO**. Endpoint `/generate_video(first_frame, end_frame, prompt, input_video, generation_mode="Image-to-Video", …, height=512, width=768, camera_lora, audio_path)`. It uses xlarge, and the requested duration is `(60|80|120|180 + extra) * 0.75` s. — [app.py](https://huggingface.co/spaces/alexnasa/ltx-2-TURBO/raw/main/app.py)
- **multimodalart/wan2-1-fast**. Endpoint `/generate_video(input_image, prompt, height=512, width=896, …, duration_seconds=2, steps=4, …)`. It runs at 24 fps with at most 81 frames, so the maximum clip is about 3.4 s. — [app.py](https://huggingface.co/spaces/multimodalart/wan2-1-fast/raw/main/app.py)
- **zai-org/CogVideoX-5B-Space**. Endpoint `/generate(prompt, image_input, video_input, video_strength=0.8, seed_value=-1, scale_status, rife_status)`. Output is 49 frames at 8 fps (about 6 s) at 720x480. This is an older model from 2024. — [Space](https://huggingface.co/spaces/zai-org/CogVideoX-5B-Space)
- **linoyts/FramePack-F1**. Endpoint `/process(input_image, prompt, …, total_second_length=2 [1–5], steps=25, …)`. It uses 640 px buckets at 30 fps. It is a streaming generator endpoint and is slow. — [app.py](https://huggingface.co/spaces/linoyts/FramePack-F1/raw/main/app.py)
- **multimodalart/wan-2-2-first-last-frame**. Endpoint `/generate_video(start_image_pil, end_image_pil, prompt, …, duration_seconds=2.1, steps=8, …)`. It runs at 16 fps with at most 81 frames, about 5 s, at 480–832 px. — [app.py](https://huggingface.co/spaces/multimodalart/wan-2-2-first-last-frame/raw/main/app.py)
- One Space author on Reddit claims Wan 2.2 takes about 10 minutes per video by default and that their Space does it in 4–6 steps with Lightning LoRA and FP8 "completely free on ZeroGPU". This is a self-promotional claim. — [Reddit r/huggingface](https://www.reddit.com/r/huggingface/comments/1svfb93/tired_of_waiting_10_minutes_per_video_on_wan_22/)

### Inferences
- I worked out these figures from the formula in the Wan "Fast" Space's code; they were not measured. A 5 s, 832x480 clip at 6 steps requests about 70 s of GPU time: factor = 0.76, 0.76^1.5 ≈ 0.66, 15 × 0.66 ≈ 9.9 s per step, plus a 10 s base. The 3.5 s default requests about 45 s. Wall-clock time is lower than the requested time, plus queue wait.
- `Lightricks/LTX-2-3` reserves 75 s for every call regardless of clip length. The xlarge Spaces (LTX-2.5, ltx-video-distilled, LTX-2 Turbo, r3gm Wan) are charged at 2x their requested duration.
- The best fit for "image-to-video, about 5 s, decent quality" is `zerogpu-aoti/wan2-2-fp8da-aoti-faster`, with `Lightricks/LTX-2-3` as a fallback. Both are maintained by HF staff or the model vendor, and both were updated in mid-2026.

### Gaps
- I did not run real generation timings or queue measurements, because that would need calls that use up quota. The per-clip numbers above are requested GPU durations taken from code.
- I did not verify the model licenses of LTX-2.x and Wan 2.2 for commercial demo use.

## 2. How do ZeroGPU quotas work: amounts, token vs IP, and one server token shared by all users?

### Takeaway
Current HF docs give these daily ZeroGPU quotas: **unauthenticated 2 min, free account 5 min, PRO 40 min**. A quota resets 24 h after first use. Quota is charged to whoever HF identifies via the `X-IP-Token` header or the HF token. A Node backend that calls a Space with a single HF token therefore makes all users share one free account's 5 minutes a day, which is about 4 Wan clips of 5 s (or 1 if anonymous). The check is made against the *requested* `@spaces.GPU` duration.

### Cited Findings
- Daily quota table: Unauthenticated 2 minutes (low priority); Free account 5 minutes (medium); PRO 40 minutes (extensible, highest); Team 40 min; Enterprise 60 min. "Included daily quota resets exactly 24 hours after your first GPU usage." "Remaining quota directly impacts priority in ZeroGPU queues." — [HF docs: Spaces ZeroGPU](https://huggingface.co/docs/hub/spaces-zerogpu)
- PRO users get "x8 more daily usage quota", the highest queue priority, and can go past their quota with pre-paid credits at "$1 per 10 minutes". Free users cannot buy extra ZeroGPU time. — [HF docs: Spaces ZeroGPU](https://huggingface.co/docs/hub/spaces-zerogpu)
- GPU sizes: `large` is half an RTX Pro 6000 (48 GB) at 1x quota cost; `xlarge` is a full GPU (96 GB) at 2x quota cost ("a 45s effective task duration consumes 90s of quota"). xlarge also "usually means higher queuing probability". The default duration is 60 s. — [HF docs: Spaces ZeroGPU](https://huggingface.co/docs/hub/spaces-zerogpu)
- **These numbers changed during 2026.** A March 2026 forum answer quoted the docs at that time as Free 3.5 min/day and PRO 25 min/day. The current docs say 5 and 40. — [HF Forum, Mar 2026](https://discuss.huggingface.co/t/zerogpu-quota-shows-0s-left-despite-active-pro-subscription/173970); [current HF docs](https://huggingface.co/docs/hub/spaces-zerogpu)
- How identity works: "The limit is controlled by a special token that the Hugging Face Hub infrastructure adds to all incoming requests to Spaces. This token is a request header called `X-IP-Token` and its value changes depending on the user who makes a request." If one Space calls another without forwarding the header, the calls "would be missing the `X-IP-Token` request header and would therefore be treated as unauthenticated". — [Gradio docs: Using ZeroGPU Spaces with the Clients](https://www.gradio.app/docs/python-client/using-zero-gpu-spaces)
- A Gradio maintainer wrote: "zerogpu decides whose quota to charge (and queue priority) from the `X-IP-Token` header". When it was missing, every call "reached the space anonymously and charged the … shared quota". — [gradio-app/gradio#13966](https://github.com/gradio-app/gradio/issues/13966); see also [#13747](https://github.com/gradio-app/gradio/issues/13747) ("fell back to the workflow Space's shared IP quota, which was exhausted almost instantly")
- A community expert on the HF forum (not staff) says that requests without the user identity are "treated as unauthenticated/IP-based". Opening the `*.hf.space` URL directly or in incognito gives "0s left". Programmatic callers should pass `hf_token` / `Authorization: Bearer` so the call counts against their account. — [HF Forum](https://discuss.huggingface.co/t/zerogpu-quota-shows-0s-left-despite-active-pro-subscription/173970)
- The quota check uses the declared duration: users see errors like "You have exceeded your GPU quota (60s requested vs. 0s left)". A forum answer says "declared duration matters for queue admission and quota handling". — [HF Forum](https://discuss.huggingface.co/t/it-seems-use-60-sec-gpu-quota-instead-of-real-time-usage/175130); [HF Forum (free account)](https://discuss.huggingface.co/t/free-account-zerogpu-quota-issue/175180)
- A free-account user (April 2026) reported they could make only "3-4 images … before I get this message: You have exceeded your free GPU quota (60s requested vs. 0s left)". — [HF Forum](https://discuss.huggingface.co/t/free-account-zerogpu-quota-issue/175180)
- A GitHub issue from a third-party project suggests calling `*.hf.space/gradio_api/...` anonymously "through multiple IPs" to get around per-IP quota. This is an evasion pattern, and HF's Content Policy covers "Abuse or interference with Hugging Face services". — [omniroute#5188](https://github.com/diegosouzapw/omniroute/issues/5188); [HF Content Policy](https://huggingface.co/content-policy)

### Inferences
- With one server token on a free account, the 300 s/day pool divided by about 70 s per 5 s Wan clip gives **about 4 clips per day for the whole app**. Anonymous calls (120 s, keyed on the server's IP) give about 1 clip. LTX-2-3 at 75 s per call gives about 4 per day, and xlarge Spaces about half that. A PRO token ($9/mo, so not free) would allow about 30 Wan clips a day.
- Outside HF Spaces, a Node backend has no way to get each end-user's `X-IP-Token`. HF injects that header only for traffic that comes through HF. The only free way to give each user their own quota is for each user to supply their own HF token (OAuth or "Sign in with HF") and for the backend to call the Space with that token. Even then, each user gets just 5 min a day.

### Gaps
- I found no official HF statement on whether the "unauthenticated" quota is keyed on raw client IP or only on the injected token. Forum posts imply it is IP-based.
- I did not find whether HF applies additional per-token request rate limits on the Spaces API beyond GPU quota.

## 3. How do you call a Space from Node.js (@gradio/client), and does it fit serverless limits?

### Takeaway
Use `@gradio/client`: `Client.connect("owner/space", { token })`, then `submit()` or `predict()` with `handle_file(blob)` for the image. Jobs are queued and stream status over SSE, and they need a connection held open for the queue wait plus 30–120 s of generation. That fits Vercel Hobby's 300 s limit only when the queue is short, so a persistent worker or background job is safer.

### Cited Findings
- Install with `npm i @gradio/client` (Node >= 18). Connect with `const app = await Client.connect("abidlabs/en2fr")`. For a token, use `Client.connect("…", { token: "hf_..." })`. Files are sent as `app.predict("/predict", [handle_file(blob)])`, where Node accepts a `Buffer` or `Blob`. — [Gradio JS client guide](https://www.gradio.app/guides/getting-started-with-the-js-client)
- `app.submit()` returns an async iterable of `data` and `status` messages. Status includes `status` ("pending" | "generating" | "complete" | "error"), `position` in queue, `queue_size` and `eta`. `job.cancel()` removes jobs that have not started yet. Once a job has started it keeps running, and the client simply stops listening. — [Gradio JS client guide](https://www.gradio.app/guides/getting-started-with-the-js-client)
- The guide warns: "you may get rate limited by Hugging Face if you make too many requests. For unlimited usage of a Space, simply duplicate the Space". It also says that if the original Space uses GPUs, "your Hugging Face account will get billed based on the price of the GPU". — [Gradio JS client guide](https://www.gradio.app/guides/getting-started-with-the-js-client)
- There is also a raw REST and SSE protocol: `POST https://{space}.hf.space/gradio_api/call/{api_name}` with `{"data":[...]}` (optionally `Authorization: Bearer hf_***`) returns an event id, followed by a GET stream of results. — [omniroute#5188 (third-party write-up)](https://github.com/diegosouzapw/omniroute/issues/5188); [Gradio "Querying with curl" guide](https://www.gradio.app/guides/querying-gradio-apps-with-curl)
- Known JS-client issue: "The `@gradio/client` JS library checks this flag before requesting the `x-ip-token` from the HF iframe". The JS client only attaches `x-ip-token` to queued submits, and several 2026 bugs caused calls to land on a shared anonymous quota. — [gradio#13209](https://github.com/gradio-app/gradio/issues/13209); [gradio#13966](https://github.com/gradio-app/gradio/issues/13966)
- Vercel limits: Hobby has a maximum function duration of "300s (5 minutes)" by default and as the maximum. Pro allows 800 s, or 1800 s in beta. The 60 s figure in the brief is out of date. — [Vercel docs: Functions limitations](https://vercel.com/docs/functions/limitations)

### Inferences
- A cold Space restart, a long ZeroGPU queue, or a 2x xlarge job can push past 300 s. The safer pattern is: an API route enqueues the job in a DB or queue, a long-running worker (Railway, Fly or a VPS) holds the SSE stream, downloads the MP4 from the returned file URL and saves it to the app's own storage, and the frontend polls the DB.
- Returned file URLs point at the Space's temporary file cache, so the MP4 should be copied right away.

### Gaps
- I did not confirm whether a Gradio event's results can be re-fetched after the SSE connection drops, which would allow polling instead of holding the connection. Treat it as not supported until tested.
- The exact `@gradio/client` version that is current in October 2026 was not checked.

## 4. Do HF Inference Providers give free credits for video?

### Takeaway
**No for free accounts.** The pricing page now lists Free users with "Monthly Credits: None". PRO gets $2 a month. Text-to-video and image-to-video run through the router via fal-ai, WaveSpeed, Replicate and Novita, at about $0.04–$0.08 per second of video on fal for Wan 2.2. So this route is not free, though a PRO plan's $2 would cover roughly 5–10 short clips.

### Cited Findings
- Included monthly credits: "Free Users: None … (credits purchase required)". "PRO Users: $2.00". Team and Enterprise get "$2.00 per seat". "Free users can use Inference Providers by purchasing credits, or by upgrading to PRO." HF passes provider prices through "with no markup". — [HF docs: Inference Providers pricing](https://huggingface.co/docs/inference-providers/pricing)
- Video models served through the router (HF API, 2026-10-27):
  - Image-to-video: `Wan-AI/Wan2.2-I2V-A14B` (fal-ai, wavespeed), `Lightricks/LTX-2` (fal-ai, wavespeed), `Wan-AI/Wan2.1-I2V-14B-720P` (fal-ai, wavespeed), `Lightricks/LTX-Video-0.9.8-13B-distilled` (fal-ai), `tencent/HunyuanVideo-I2V` (fal-ai), many MiniMax-H3 LoRAs (wavespeed).
  - Text-to-video: `Wan-AI/Wan2.2-TI2V-5B` and `Wan-AI/Wan2.2-T2V-A14B` (fal-ai, replicate, wavespeed), `Wan-AI/Wan2.1-T2V-14B` (novita staging, fal-ai, wavespeed), `tencent/HunyuanVideo` and `HunyuanVideo-1.5` (fal-ai, wavespeed), `genmo/mochi-1-preview`, `meituan-longcat/LongCat-Video`, `zai-org/CogVideoX-5b` (fal-ai).
  - Source: [HF models API (inference_provider=all)](https://huggingface.co/api/models?pipeline_tag=image-to-video&inference_provider=all&expand[]=inferenceProviderMapping)
- The text-to-video task docs list WaveSpeedAI and Replicate as providers, with `InferenceClient(provider="wavespeed").text_to_video(...)`. The response is raw video bytes. The token needs the "Inference Providers" permission. — [HF docs: Text to Video task](https://huggingface.co/docs/inference-providers/tasks/text-to-video)
- fal pricing for Wan 2.2 A14B image-to-video: "$0.08 per video second for 720p, $0.06 … 580p, $0.04 … 480p. Video seconds are calculated at 16 frames per second." — [fal model page](https://fal.ai/models/fal-ai/wan/v2.2-a14b/image-to-video)

### Inferences
- A 5 s, 480p Wan 2.2 clip on fal costs about $0.20, and a 720p clip about $0.40. A free account has $0 credit, so it cannot make even one video. PRO's $2 a month would buy about 5 clips at 720p or 10 at 480p.
- Older blog posts that cite "$0.10/month free credits" for free accounts are out of date.

### Gaps
- I did not fetch per-video prices for WaveSpeed, Replicate or Novita.
- I did not confirm whether the JS `InferenceClient` exposes an `imageToVideo` helper in its current version.

## 5. Terms: can you build an app on someone else's public Space, and does duplicating need paid hardware?

### Takeaway
Gradio and HF docs openly describe using any public Space as an API, so it is tolerated. There is no specific clause allowing or forbidding it, but it is subject to rate limits and HF's anti-abuse rules. Getting around quotas (rotating IPs or tokens) would likely count as "abuse or interference". Duplicating a ZeroGPU Space is possible on a free account (up to 2 ZeroGPU Spaces, with a verified email and an account older than 30 days), but the copy still draws on callers' quotas, not on free unlimited GPU.

### Cited Findings
- The Gradio client "works with any hosted Gradio app" and is "mostly used with apps hosted on Hugging Face Spaces". It also warns "you may get rate limited by Hugging Face if you make too many requests". — [Gradio JS client guide](https://www.gradio.app/guides/getting-started-with-the-js-client)
- Gradio's ZeroGPU docs: "These kinds of spaces are a great foundation to build new applications on top of with the python gradio client, but you need to take care to avoid ZeroGPU's rate limiting." — [Gradio docs](https://www.gradio.app/docs/python-client/using-zero-gpu-spaces)
- The HF Content Policy (part of the ToS) lists under "Platform Abuse, Security Violations and Spam": "Abuse or interference with Hugging Face services" and "Spam (e.g., … excessive bulk activity…)". — [HF Content Policy](https://huggingface.co/content-policy)
- HF ToS: HF may modify or suspend "the Services (or any part thereof) with or without notice". Content from other users is used at your own risk. — [HF Terms of Service](https://huggingface.co/terms-of-service)
- Hosting: "Free personal accounts: accounts in good standing (verified email, account older than 30 days) can host up to 2 ZeroGPU Spaces for free." PRO can host 10. — [HF docs: Spaces ZeroGPU](https://huggingface.co/docs/hub/spaces-zerogpu)
- `Client.duplicate` on a GPU Space bills your account for the GPU price and sleeps after 5 minutes of inactivity. This applies to dedicated GPU hardware, not to ZeroGPU. — [Gradio JS client guide](https://www.gradio.app/guides/getting-started-with-the-js-client)

### Inferences
- A free-account clone of the Wan Space on ZeroGPU gives the developer control over code and uptime, but calls from the backend still spend the token-holder's 5 min a day. It solves the problem of the upstream Space changing or breaking, not the quota.
- Some of the Space source code has no license field (cardData.license is undefined for the Wan and LTX Spaces). Duplicating is technically supported, but code reuse rights are unclear.

### Gaps
- I could not find any ToS clause that explicitly addresses commercial or production apps that proxy other users' public Spaces.
- I did not verify model licenses: Wan 2.2 is reportedly Apache-2.0, and LTX-2 has its own license.

## 6. Reliability: how often do video Spaces go down or queue?

### Takeaway
There is no uptime data, but the evidence points to fragile service. Official Spaces (Wan-AI/Wan2.1, Lightricks/ltx-2, Lightricks/ltx-2-distilled) sit in RUNTIME_ERROR. Most 2024–2025 video Spaces are dead. Quota errors and "GPU task aborted" errors are a constant topic on the forum. Spaces also change their endpoint signatures often, which breaks hard-coded calls.

### Cited Findings
- On 2026-10-27 the official `Wan-AI/Wan2.1` (2195 likes), `Lightricks/ltx-2-distilled` and `Lightricks/ltx-2` were in RUNTIME_ERROR. Dozens of FramePack and HunyuanVideo Spaces were in error, paused, or running on CPU only. — [HF Spaces API](https://huggingface.co/api/spaces?search=hunyuanvideo&expand[]=runtime)
- Recurring forum threads: "Zero GPU limit reached even through FAILED attempts?", "When i try to use ZeroGPU, it keeps saying 'GPU Task aborted'", and "Getting 'You have exceeded your Pro GPU quota' error even with credits loaded" (18 replies, July 2026). — [HF Forum 177659](https://discuss.huggingface.co/t/zero-gpu-limit-reached-even-through-failed-attempts/177659); [HF Forum 106618](https://discuss.huggingface.co/t/when-i-try-to-use-zerogpu-it-keeps-saying-gpu-task-aborted/106618); [HF Forum 174850](https://discuss.huggingface.co/t/getting-you-have-exceeded-your-pro-gpu-quota-error-even-with-credits-loaded/174850)
- A Reddit thread (r/huggingface) reports that every ZeroGPU Space returned "Quota Exceeded … 60 of 0 seconds" during an incident. This is older and of unclear date. — [Reddit](https://www.reddit.com/r/huggingface/comments/1jnoiuc/zerogpus_are_bugged/)
- Endpoints differ between forks of the same Space. For example, the r3gm Wan Space adds `last_image`, `quality`, `scheduler` and safety flags compared with zerogpu-aoti. Spaces are updated often (last-modified dates range from August to October 2026). — [r3gm app.py](https://huggingface.co/spaces/r3gm/wan2-2-fp8da-aoti-preview/raw/main/app.py); [zerogpu-aoti app.py](https://huggingface.co/spaces/zerogpu-aoti/wan2-2-fp8da-aoti-faster/raw/main/app.py)
- HF docs say xlarge tasks have "higher queuing probability and longer wait times", and that lower remaining quota means lower queue priority. — [HF docs](https://huggingface.co/docs/hub/spaces-zerogpu)

### Inferences
- In production you should call `view_api()` at startup or pin a duplicated Space, and keep 2–3 fallback Spaces (for example Wan Fast, then LTX-2-3, then wan2-1-fast). The app also needs graceful quota-exceeded handling.
- A free, shared-server app with many users is not viable on HF free tiers. There is about 4–5 minutes of GPU a day per token, which is a handful of clips. HF Spaces are suitable only as a low-volume demo, or with each user bringing their own HF login or token.

### Gaps
- No public uptime or latency monitoring exists for individual Spaces. Typical queue waits at peak times could not be measured without running jobs.

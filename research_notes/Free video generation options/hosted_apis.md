# Hosted video-generation APIs with a free tier or free trial credits (as of October 2026)

Scope note: public pages only, no accounts created. Most pages were read through Firecrawl on 2026-10-27 (some came from its cache, dated 2026-10-25 to 2026-10-27). "Free" here means no credit card and no paid balance. The Firecrawl rate limit capped how many pages could be checked, so several providers have gaps (listed at the end).

## 1. Google: Gemini API / AI Studio free tier and Vertex AI trial

### Takeaway
No. There is no free Google video generation through the Gemini API in October 2026. The Veo 3.1 Preview in the Gemini API has been **shut down**. Its replacement, **Gemini Omni Flash** (`gemini-omni-1.1-flash`), is paid tier only ("Not available" on the Free Tier) and costs about $0.10 per second (about $0.50 per 5 s clip). The $300 Google Cloud trial needs a card, and for accounts opened after 2 March 2026 it can't pay for Gemini API/AI Studio usage (it still covers Vertex). Vertex AI "express mode" is the only route with no card. Nothing I found says it includes video models.

### Cited Findings
- The Gemini API pricing page (Oct 2026) has no Veo entry. Its only video generation model is "Gemini Omni Flash, `gemini-omni-1.1-flash` … Our next-generation video generation and editing model, now generally available to developers on the **paid tier** of the Gemini API." Free Tier input/output: "Not available". Paid tier: $1.50/1M input tokens, $17.50/1M video output tokens, "calculated at a rate of 5,792 tokens per second of 720p video … approximately $0.10 per second." — [Gemini API pricing](https://ai.google.dev/gemini-api/docs/pricing)
- The video generation docs page now covers Gemini Omni Flash and says verbatim: "The Veo 3.1 Preview in the Gemini API has been shut down." — [Gemini API video docs](https://ai.google.dev/gemini-api/docs/video)
- Free tier qualification: "Active project or free trial". Tier 1 needs you to "Set up and link an active billing account". — [Gemini API rate limits](https://ai.google.dev/gemini-api/docs/rate-limits)
- The free tier marketing says "Limited access to certain models" and "Content used to improve our products". — [Gemini API pricing](https://ai.google.dev/gemini-api/docs/pricing)
- A third-party summary (11 Sep 2026) lists Veo on the Gemini API free tier as "Not free". It also says "The $300 Google Cloud trial no longer pays for the Gemini API" for accounts opened after 2 March 2026, quoting Google's billing FAQ: "If you opened your account after March 2, 2026, you can't use these credits to pay for Gemini API and AI Studio usage." The $300 trial needs a card and covers Vertex only. — [klymentiev.com, Sept 2026](https://klymentiev.com/blog/gemini-free-credits)
- Vertex AI express mode: "try Agent Platform for free for up to 90 days, within the specified quotas. You don't need to provide billing information". It needs a @gmail.com account, ends if you enable billing, is a preview feature, and its quota table was out of date (it only listed 2.5 text models). The page does not mention Veo or video. — [klymentiev.com](https://klymentiev.com/blog/gemini-free-credits)
- New Google Cloud customers get "$300 in free credits on signup". — [Google Cloud Free](https://cloud.google.com/free)
- Reddit threads warn about unexpected charges on the $300 trial (e.g. "Unexpected $354.66 Charge on Google Cloud while on $300 Free…"). — [r/googlecloud](https://www.reddit.com/r/googlecloud/comments/1satqtz/unexpected_35466_charge_on_google_cloud_while_on/)

### Inferences
- To use Google video in a free app you would need the $300 Vertex trial (card required), then call Omni/Veo on Vertex. At about $0.50 per 5 s clip, $300 would buy roughly 600 clips over 90 days. That fails the "no card" rule.
- Older blog posts saying "Veo on the free tier" or "unlimited free Gemini, all models" (e.g. getaiperks.com) are out of date or wrong for video.

### Gaps
- I could not confirm which models Vertex express mode includes (whether Veo or Omni is there), its daily video limits, or Veo's current status and price on Vertex.
- I could not get Omni Flash's API shape (long-running operation and polling), latency, or watermark (SynthID) from the docs page; the scrape returned only the shutdown sentence. Veo on the Gemini API used to be a long-running operation that you polled, but I could not re-confirm that for Omni.

## 2. Cloudflare Workers AI

### Takeaway
Workers AI has no text-to-video or image-to-video model in its catalog (Oct 2026). Its free allowance is 10,000 Neurons per day, so it doesn't help for video generation.

### Cited Findings
- The catalog task types are Text Generation, Image-to-Text, Text-to-Image, Text-to-Speech, ASR, Text Embeddings, Translation, Text Classification, Image Classification and "Dumb Pipe". No video generation models. — [Workers AI models](https://developers.cloudflare.com/workers-ai/models/)
- Free allocation is 10,000 Neurons per day on both the Workers Free and Paid plans; usage beyond that costs $0.011 per 1,000 Neurons. No video models are listed. — [Workers AI pricing](https://developers.cloudflare.com/workers-ai/platform/pricing/)

### Inferences
- Cloudflare is only useful here for nearby tasks: hosting the app, or generating a starting image with Text-to-Image and then sending it to a video API.

### Gaps
- None material.

## 3. Other providers: free credits, card/phone requirements, models, cost per 5 s, free clips

### Takeaway
The strongest free option is **Alibaba Cloud Model Studio (Singapore/International)**. It gives per-model free quotas for Wan video: 50 s for wan2.7-i2v (image-to-video, 720p), which is about 10 five-second clips per model, valid 90 days. It needs mobile verification, not a card, and a "Free Quota Only" switch prevents charges. Small no-card credits elsewhere buy only a few clips: **WaveSpeed $1** (about 2–5 clips), **SiliconFlow $1** (about 3 Wan2.2-I2V clips), and **Novita $0.50** (unverified). **fal.ai** gives 5 free FLUX 3 Max text-to-video runs a day, but only in its sandbox (not the API) and with a card on file. **Pollinations** has a key-based video endpoint with many models, but I could not confirm the size of its free allowance.

### Cited Findings

**Alibaba Cloud Model Studio (Wan)**
- "When you first activate Alibaba Cloud Model Studio (Singapore region), the platform automatically grants you a free quota". It is "available only in the Singapore region (models with the service deployment scope set to International)", lasts 90 days from activation, model release or application approval (whichever is later), and is shared between the account and its RAM users. — [Model Studio free quota](https://www.alibabacloud.com/help/en/model-studio/new-free-quota)
- You must "complete your account information (such as mobile security verification) before you can activate Model Studio." No card is needed to receive the quota. **After the quota runs out you are auto-billed pay-as-you-go** unless "Free Quota Only" (worry-free mode) is turned on. It is off by default. When on, requests return `AllocationQuota.FreeTierOnly` once the quota is used up. — [Model Studio free quota](https://www.alibabacloud.com/help/en/model-studio/new-free-quota)
- Video quotas and prices (International):
  - wan2.7-i2v and wan2.7-i2v-2026-04-25: 720p with audio, $0.10/s, **50 s free** each ("free quota only in Singapore")
  - wan3.0-video: 480p, $0.05/s (list price, limited-time 30% off), 30 s free
  - wan3.0-video-prime: 480p, $0.068/s, 30 s free
  - t2v models wan2.7-t2v, wan2.6-t2v, wan2.5-t2v-preview ($0.05/s), wan2.2-t2v-plus ($0.02/s) and wan2.1-t2v-plus: 50 s free each
  - r2v and video-edit models: 50 s free each

  — [Model Studio pricing](https://www.alibabacloud.com/help/en/model-studio/model-pricing)
- Failed calls don't use the free quota. — [Wan i2v guide](https://www.alibabacloud.com/help/en/model-studio/wan-image-to-video-guide)

**WaveSpeed AI**
- "Eligible new accounts receive $1 in free credits … no credit card is required to sign up. Some premium models may not be available with trial credits." — [WaveSpeed pricing](https://wavespeed.ai/pricing)
- Prices per 5 s clip: MiniMax H3 $0.20, Wan 3.0 $0.25, Veo 3.1 Fast $0.50, Seedance 2.0 $0.60, Seedance 2.5 $0.90, Kling 3.0 Std $0.42, Kling 4.0 $0.785. — [WaveSpeed pricing](https://wavespeed.ai/pricing)
- A third-party blog says WaveSpeed's free output has no watermark. — [ApiPass blog](https://apipass.dev/blogs/8-best-free-ai-video-generators-2026)

**SiliconFlow**
- Wan2.2-I2V-A14B costs $0.29 per video, as does Wan2.2-T2V-A14B. "You can start with $1 in free credits." — [SiliconFlow pricing](https://www.siliconflow.com/pricing)

**Novita AI**
- A GitHub feature request lists the endpoint `https://api.novita.ai/v3/async/video-generation` and a "Free tier: $0.50 signup credit". — [OmniRoute issue #6658](https://github.com/diegosouzapw/OmniRoute/issues/6658) (secondary source, not Novita's own page)

**fal.ai**
- "Five free FLUX 3 Max videos a day" (rolling 24 h, text-to-video, 720p with sound). These are "free in the fal sandbox (the API is pay-per-use)", and "Activating an account takes a card on file". A 10 s video takes about 12 s. Commercial use of outputs is allowed. Page updated 21 Oct 2026. — [fal FLUX video free](https://fal.ai/flux-video-free)

**Pollinations**
- Video endpoint is `GET /video/{prompt}`. It needs an API key (`Authorization: Bearer` or `?key=`). Image-to-video works by passing an `image` array (first item is the start frame, second is the end frame). `duration` limits vary by model. — [Pollinations API docs](https://gen.pollinations.ai/docs)
- Video models include google/veo-3.1-fast, google/gemini-omni-1.1-flash, bytedance/seedance-2.0, 2.0-fast, 2.0-mini, 2.5 and 1-pro-fast, alibaba/wan-2.2-fast, 2.6, 2.7 and 3.0, kwaivgi/kling-v3.0-std, minimax/minimax-h3 (plus max and max-turbo), x-ai/grok-imagine-video, black-forest-labs/flux-3-max, prunaai/p-video, kandinsky-6.0-lite, and others. "Video prices cannot exceed 0.5 Pollen per generated second." — [Pollinations API docs](https://gen.pollinations.ai/docs)
- Rate limits: secret keys (`sk_`) have none. Raw publishable keys (`pk_` with no app binding) are limited to "1 pollen / IP / hour (legacy)". — [Pollinations API docs](https://gen.pollinations.ai/docs)
- The GitHub README shows `curl 'https://gen.pollinations.ai/video/...?key=YOUR_API_KEY' -o video.mp4` and a CLI flag `--duration 5`. — [pollinations GitHub](https://github.com/pollinations/pollinations)

**Consumer apps (not developer APIs)**
- Runway: 125 one-time credits, 5 s (Gen-4.5), watermark. Kling: a monthly free-credit claim (amount not published), watermark. Pika: 0 free credits (packs only). HeyGen: 3 videos/month, no card. None of these listings mention API access on the free plan. Verified 16–26 Sept 2026. — [Kensa blog](https://www.kensa.cc/blog/ai-video-generator-free-credits)
- Kensa gives 15 credits on Google sign-up (Veo 3.1, Seedance 1.5 Pro and Grok Image Video), valid 72 h, no card. That is a consumer app, not an API. — [Kensa blog](https://www.kensa.cc/blog/ai-video-generator-free-credits)
- A Wan 2.7 fan site lists Replicate as "Limited free tier … Requires Card? No". This is a low-quality secondary source, and Replicate has historically required billing for most paid models. — [wan27.org](https://wan27.org/blog/wan-2-7-free-guide)

### Inferences (free clip counts, 5 s each)
- **Alibaba:** about 10 clips at 720p from wan2.7-i2v (50 s ÷ 5 s). The quota appears to be per model ID, so the dated snapshot `wan2.7-i2v-2026-04-25` may add another 10, and wan3.0-video another 6 (30 s). That could be roughly 20–25 free image-to-video clips in total. The per-model reading comes from how the pricing table is laid out; Alibaba does not state it explicitly.
- **WaveSpeed $1:** about 5 MiniMax H3 clips, 4 Wan 3.0 clips, or 2 Veo 3.1 Fast clips, if those models are allowed on trial credit.
- **SiliconFlow $1:** about 3 Wan2.2-I2V clips.
- **Novita $0.50:** probably 1–3 low-cost clips (unverified).
- **fal:** effectively nothing through the API without paying, and it needs a card anyway.
- None of these is a lasting free tier. They are one-time trial amounts that run out after a few dozen clips at most, which suits a demo, not real traffic.

### Gaps
- **BytePlus ModelArk (Seedance):** a "Free Tokens Only mode" for new users exists, but I could not get the token amount, whether Seedance video is covered, or whether a card or KYC is needed. — [BytePlus free tokens only mode](https://docs.byteplus.com/en/docs/modelark/free-tokens-only-mode)
- **Zhipu (CogVideoX / CogVideoX-Flash):** I found no official current free-tier page. Search returned only the open-weights repo and a reseller price ($0.2088 per request for CogVideoX 3 on TheRouter). — [TheRouter](https://therouter.ai/models/zhipu--cogvideox-3/)
- **Not checked (rate limit):** Replicate (official), Together AI, Runware, Segmind, DeepInfra, MiniMax/Hailuo direct API, Kling official API, Luma API, Runway API.
- **Pollinations:** I could not confirm the free daily or hourly Pollen allowance per tier, or whether free Pollen can be spent on video.

## 4. API shape and latency for the top candidates

### Takeaway
All candidates use asynchronous jobs: you submit a task, get a task ID, then poll for the result (fal also offers a queue client with status callbacks). For 5 s clips, plan on tens of seconds to a few minutes. The only latency figure from a primary source is fal's FLUX 3 Max (about 12 s for a 10 s clip).

### Cited Findings
- **Alibaba Wan i2v:** POST to the video-synthesis endpoint with header `X-DashScope-Async: enable` returns a `task_id`. Then poll `GET /api/v1/tasks/{task_id}`. Result URLs are valid for 24 hours. Durations are 2–15 s at 720p or 1080p. The international base URL is `https://{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com/api/v1`. Examples show `watermark: true`. — [Wan i2v guide](https://www.alibabacloud.com/help/en/model-studio/wan-image-to-video-guide)
- **Novita:** async endpoint `/v3/async/video-generation`. — [OmniRoute issue](https://github.com/diegosouzapw/OmniRoute/issues/6658)
- **fal:** the `fal.subscribe(...)` client has an `onQueueUpdate` callback (queue-based). FLUX 3 Max returns a 10 s video in about 12.45 s on average. — [fal.ai](https://fal.ai/), [fal FLUX video free](https://fal.ai/flux-video-free)
- **Pollinations:** a simple `GET /video/{prompt}` that returns the MP4 directly (synchronous from the client's side). — [Pollinations docs](https://gen.pollinations.ai/docs)

### Inferences
- A web backend should treat every option as a background job: submit, store the task ID, then poll or use a webhook. Because Alibaba URLs expire after 24 h, copy the result to your own storage (e.g. Supabase storage).
- A synchronous GET like Pollinations' needs long HTTP timeouts; serverless functions may hit their time limits.

### Gaps
- No primary-source latency for Wan 2.7 i2v, Omni Flash or Seedance. I did not confirm webhook support for Alibaba or WaveSpeed.

## 5. Terms of service and watermarks for a public demo app

### Takeaway
Little ToS detail could be read within budget. fal says outputs can be used commercially. Alibaba's examples show a `watermark` parameter (shown set to `true`), so presumably you can turn it off. Consumer-app free tiers (Runway, Kling, HeyGen) add watermarks and are not APIs. Google's free tier would use your content to improve its products, but video is not free there anyway.

### Cited Findings
- fal: "Content generated through fal.ai can be used in commercial projects." — [fal FLUX video free](https://fal.ai/flux-video-free)
- Alibaba Wan request examples include `watermark: true`, and the parameter can be set. — [Wan i2v guide](https://www.alibabacloud.com/help/en/model-studio/wan-image-to-video-guide)
- WaveSpeed free output has no watermark, per a third-party blog. — [ApiPass blog](https://apipass.dev/blogs/8-best-free-ai-video-generators-2026)
- Runway, Kling and HeyGen free outputs are watermarked. Magic Hour's free use is "for personal, non-commercial work only". — [Kensa blog](https://www.kensa.cc/blog/ai-video-generator-free-credits); [Wireflow blog](https://www.wireflow.ai/blog/best-free-ai-video-generator-onlines-in-2026)
- On the Gemini API free tier, content is "used to improve our products". — [Gemini API pricing](https://ai.google.dev/gemini-api/docs/pricing)

### Inferences
- With trial credits on an API platform (Alibaba, WaveSpeed, SiliconFlow), serving a public demo is technically just ordinary API use. The real risk is cost. On Alibaba, turn on "Free Quota Only" so public traffic can't run up charges once the quota is gone.

### Gaps
- I did not read any provider's ToS clause specifically about whether trial credits may power a multi-user public app. I did not confirm Alibaba's default watermark value or SynthID on Omni.

## 6. Regional availability

### Takeaway
Alibaba's free quota applies only to the International/Singapore deployment, with the endpoint `ap-southeast-1`; Mainland China models are not eligible. Google's free tier applies in "available regions" (and Gemini's paid tier is needed for video anyway). I did not verify regional limits for the other providers.

### Cited Findings
- Alibaba: "The free quota is available only in the Singapore region (models with the service deployment scope set to International)". Models in other regions or deployment scopes are not eligible. — [Model Studio free quota](https://www.alibabacloud.com/help/en/model-studio/new-free-quota)
- Google: "Google AI Studio usage is free of charge in all available regions." — [Gemini API pricing](https://ai.google.dev/gemini-api/docs/pricing)
- Vertex express mode needs a @gmail.com account and must be a new Google Cloud user. — [klymentiev.com](https://klymentiev.com/blog/gemini-free-credits)

### Inferences
- A developer outside the US/China should sign up on the Alibaba Cloud international site (alibabacloud.com), not aliyun.com, and use Singapore-region keys.

### Gaps
- Country restrictions for WaveSpeed, SiliconFlow (international vs. .cn), BytePlus, Novita and Pollinations were not checked. I also did not check whether the mobile number used for Alibaba verification must come from a particular country.

# Self-hosting open video generation models on free compute (as of Oct 2026)

Research budget note: about 16 search/fetch calls. Primary sources fetched live: Colab FAQ, Lightning AI pricing, Modal pricing, HF ZeroGPU docs, Wan2.2-TI2V-5B model card (excerpt), LTX-2.5 model card (excerpt), HunyuanVideo-1.5 LICENSE (excerpt). Everything else is secondary (blogs, Reddit) and marked as such.

## Q1. Leading open video models: repos, licenses, VRAM, speed, quality

### Takeaway
For a free 16 GB T4, the realistic candidates are **Wan 2.2 TI2V-5B** (best quality per GPU-second among small models; text + image to video, 720p/24fps) and **LTX-Video distilled / LTX-2.x distilled via GGUF** (fastest, weaker quality). The 13B–14B+ models (Wan 2.2 A14B, HunyuanVideo, LTX-2.3 22B) need 24–80 GB, or heavy quantization plus CPU offload that makes a T4 painfully slow. Licenses differ: HunyuanVideo excludes the EU/UK/South Korea, LTX-2 needs a paid license above $10M revenue, CogVideoX-5B has its own registration-gated license.

### Cited Findings
**Wan 2.2 TI2V-5B (Wan-AI, github.com/Wan-Video/Wan2.2)**
- Supports text-to-video and image-to-video at 720P/24fps and "can run on single consumer-grade GPU such as the 4090"; "Without specific optimization, TI2V-5B can generate a 5-second 720P video in under 9 minutes on a single consumer-grade GPU". Official command uses `--offload_model True --convert_model_dtype --t5_cpu`. — [HF model card](https://huggingface.co/Wan-AI/Wan2.2-TI2V-5B)
- Supported TI2V-5B sizes are only `704*1280` / `1280*704` in the official repo (no native 480p preset for 5B). — [ComputingForGeeks, quoting repo code](https://computingforgeeks.com/run-wan-video-generation-locally/)
- Same guide lists TI2V-5B download size 34.2 GB and a "stated VRAM floor" of 24 GB. — [ComputingForGeeks](https://computingforgeeks.com/run-wan-video-generation-locally/)
- Secondary: TI2V-5B FP8 "fits entirely on GPU" on 16 GB cards; "FP8 + T5 offload at 720p generates in 2–4 minutes per clip" (16 GB RTX 40-series, not T4). On 24 GB 4090: "60–120 seconds per 4-second clip at 50 steps, 720p". — [willitrunai.com](https://willitrunai.com/blog/wan-2-2-vram-requirements)
- Secondary: Diffusers variant needs "roughly 11 GB of VRAM" at FP16 (calculator estimate, likely weights only). — [Spheron GPU recommender](https://www.spheron.network/tools/gpu-recommender/Wan-AI/Wan2.2-TI2V-5B-Diffusers/)
- Community: Wan 2.2 (14B) with GGUF Q4 workflows reported at ~5 min for 81 frames on 12 GB cards with 4-step LoRAs. — [Reddit r/comfyui](https://www.reddit.com/r/comfyui/comments/1mlcv9w/fast_5minuteish_video_generation_workflow_for_us/)
- Wan 2.2 is trained on ~5-second clips; LTX-2.3's real advantages over it are audio and length. — [Reddit r/comfyui, Wan2.2 vs LTX2.3](https://www.reddit.com/r/comfyui/comments/1thhqdl/wan22_vs_ltx23_which_video_generation_model_do/)
- Wan 2.2 (14B-class) on a 4090: 4 min 20 s; on a 3090: 7 min 10 s (settings per article). Rated "Best Open Quality". — [LocalAIMaster 2026](https://localaimaster.com/blog/local-ai-video-generation)

**Wan 2.1/2.2 14B and HunyuanVideo on datacenter GPUs (unoptimized)**
- Spheron (Mar 2026): Wan 2.1/2.2 720p needs 65–80 GB, ~10–12 min per 5 s 720p clip on H100; Wan 2.1 5 s 480p ~4 min on H100 at ~40–48 GB; HunyuanVideo 720p 60–80 GB, ~12–20 min on H100/H200; LTX-2.3 720p fp8 24–32 GB, ~5–8 min on RTX 5090; CogVideoX-1.5-5B 720p 8-bit 24 GB, ~8–12 min on 4090, "Moderate" quality. — [Spheron blog](https://www.spheron.network/blog/ai-video-generation-gpu-guide/)
  - Note: these figures are for 14B-class / unoptimized pipelines and conflict sharply with community figures for the same model family on 24 GB cards (4–7 min on 4090/3090 per LocalAIMaster). Treat as a vendor's conservative upper bound.
- Reddit: one user reports 45 min for a 10 s Wan 2.2 video on an A100 (unoptimized ComfyUI workflow) — shows how much settings matter. — [Reddit r/comfyui](https://www.reddit.com/r/comfyui/comments/1tp4kh8/takes_45_min_for_10_sec_video_wan_22_workflow/)

**LTX-Video / LTX-2 / LTX-2.3 / LTX-2.5 (Lightricks, github.com/Lightricks/LTX-Video and github.com/Lightricks/LTX-2)**
- Legacy LTX-Video repo lists ltxv-2b-0.9.6 as "Good quality, lower VRAM requirement than ltxv-13b"; ComfyUI i2v workflow provided. — [GitHub Lightricks/LTX-Video](https://github.com/Lightricks/ltx-video)
- LTX-Video 0.9.8 13B distilled has a Diffusers image-to-video pipeline (two-stage: low-res generation then latent upsampler). — [HF LTX-Video-0.9.8-13B-distilled](https://huggingface.co/Lightricks/LTX-Video-0.9.8-13B-distilled)
- LTX-Video 0.9.6 distilled: "Still real time on H100 with the distilled model"; ~40 s for an image-to-video on an RTX 4090 (Reddit, April 2025, possibly outdated). — [Reddit r/StableDiffusion](https://www.reddit.com/r/StableDiffusion/comments/1k1o4x8/the_new_ltxvideo_096_distilled_model_is_actually/)
- Community speed comparison: "LTX is unbelievable fast. It might often be not as good as WAN, but when you can do 10 generations in the same time..." (March 2025, possibly outdated). — [Reddit r/StableDiffusion](https://www.reddit.com/r/StableDiffusion/comments/1j5k9k5/ltxv_vs_wan21_vs_hunyuan_insane_speed_differences/)
- LTX-2.5 (current, 2026) ships Diffusers `LTX2ImageToVideoPipeline` with `enable_model_cpu_offload()`, VAE tiling, distilled sigma schedule, 544x960 stage 1 then 2x latent upsample, 121 frames @ 24 fps, joint audio. — [HF Lightricks/LTX-2.5](https://huggingface.co/Lightricks/LTX-2.5)
- LTX-2: Lightricks lists 32 GB+ VRAM; FP8 checkpoint 27.1 GB, FP4 20 GB on disk, so 24 GB is the practical floor. — [LocalAIMaster LTX-2 guide](https://localaimaster.com/blog/ltx-2-local-setup-guide)
- Community: LTX-2 distilled runs on 8 GB VRAM + 32 GB system RAM (with offload). — [Reddit r/StableDiffusion](https://www.reddit.com/r/StableDiffusion/comments/1q7pcah/ltx2_on_8gb_vram_and_32_gb_ram/); [GitHub nalexand/LTX-2-OPTIMIZED (8 GB edition + web UI)](https://github.com/nalexand/LTX-2-OPTIMIZED)
- LTX-2.3 (22B) was run on free Colab (~15 GB VRAM T4) only via Wan2GP with "Distilled GGUF Q4_K_M Light", "Profile 3 — LowRAM / HighVRAM", starting at 512p; the author needed three days of OOMs, crashes during model download, and a disconnect "after 45 minutes of waiting"; had to store the ~20 GB model on Google Drive because Colab wipes it each session; served via a Gradio public link. No generation time reported. — [Medium, Mar 2026](https://medium.com/@ammanakhtar8/how-i-finally-ran-ltx-2-3-22b-on-a-free-google-colab-gpu-770993db442c)
- License: LTX-2 requires a paid license for entities with at least $10M annual revenue. — [Turing Post 2026](https://www.turingpost.com/p/6-opensource-video-generation-models); [Threads, Turing Post (LTX-2.5 $10M cap)](https://www.threads.com/@ksenia_turingpost/post/Ddym0Qdm_Oi/open-source-video-generation-models-to-know-in-wan-wan-hunyuan-video-ltx-ltx/)

**HunyuanVideo / HunyuanVideo-I2V / HunyuanVideo 1.5 (Tencent-Hunyuan)**
- License text: "THIS LICENSE AGREEMENT DOES NOT APPLY IN THE EUROPEAN UNION, UNITED KINGDOM AND SOUTH KOREA". — [GitHub HunyuanVideo-1.5 LICENSE](https://github.com/Tencent-Hunyuan/HunyuanVideo-1.5/blob/main/LICENSE)
- License audit: HunyuanVideo (2024-12-03) and 1.5 (2025-11-21) both exclude EU/UK/Korea, have a 100M MAU scale gate, output restrictions and a distillation ban. — [ThakiCloud license audit](https://thakicloud.com/tech-blog/en/llmops/open-video-model-license-territory-audit/)
- Commercial use is otherwise allowed under the Tencent Hunyuan Community license. — [canirun.ai](https://canirun.ai/license/tencent-hunyuan-community/)
- HunyuanVideo 1.5 described as "lightweight yet powerful" SOTA open model (technical report). — [arXiv 2511.18870](https://arxiv.org/html/2511.18870v1)
- HunyuanVideo 14B-class: ~5 min 50 s on a 4090 per LocalAIMaster; "Highest" quality tier but 60–80 GB unoptimized per Spheron. — [LocalAIMaster](https://localaimaster.com/blog/local-ai-video-generation); [Spheron](https://www.spheron.network/blog/ai-video-generation-gpu-guide/)

**CogVideoX-5B (-I2V) (THUDM / zai-org)**
- License: academic free, commercial use requires registration, with a 1M monthly visits cap. — [ThakiCloud audit, citing HF CogVideoX-5b LICENSE](https://thakicloud.com/tech-blog/en/llmops/open-video-model-license-territory-audit/)
- "CogVideoX licensing varies by checkpoint". — [Turing Post](https://www.turingpost.com/p/6-opensource-video-generation-models)

**FramePack (lllyasviel, github.com/lllyasviel/FramePack)**
- "Personal RTX 4090 generates at speed 2.5 seconds/frame (unoptimized) or 1.5 seconds/frame (teacache)"; NeurIPS 2025 paper. — [FramePack project page](https://lllyasviel.github.io/frame_pack_gitpage/)
- Has `--low-vram` mode for 6 GB GPUs. — [Clore.ai guide](https://docs.clore.ai/guides/video-generation/framepack)

### Inferences
- **Best quality per GPU-second on free hardware: Wan 2.2 TI2V-5B** (720p native, Apache-style permissive license per my prior knowledge — not verified in this session). Runner-up for raw speed: LTX distilled (2B 0.9.x for T4 bf16-free setups, or LTX-2.x distilled GGUF with offload), at a quality cost.
- FramePack at 2.5 s/frame on a 4090 means a 5 s/30fps clip (~150 frames) is ~4–6 min on a 4090; a T4 is several times slower than a 4090, so likely 15–30+ min. Not a good fit for a demo API.
- On a T4 specifically, expect Wan 2.2 TI2V-5B 720p 5 s clips to take on the order of 10–30 minutes (extrapolation from "under 9 min on a 4090" plus T4's much lower throughput and lack of native bf16/FP8 — T4 hardware facts are from prior knowledge). Dropping to fewer steps (distill LoRAs), fewer frames, or smaller resolution is required to get into the low-minutes range.
- Wan 2.2 A14B, HunyuanVideo (any version), LTX-2.3 22B are not realistic on a T4 for an interactive demo.

### Gaps
- No primary-source benchmark of any of these models on a **T4** was found; all T4 times above are extrapolations.
- Did not verify Wan 2.1/2.2 license text in this session (believed Apache 2.0) — check github.com/Wan-Video/Wan2.2 LICENSE.
- Did not research Mochi 1 (Genmo), SkyReels (V1/V2), Open-Sora (2.0) or HunyuanVideo-I2V specifics (VRAM, times, licenses) within budget.
- CogVideoX-5B-I2V VRAM/time on T4 not found (Diffusers docs historically claimed it could run with CPU offload on low VRAM; not verified).

## Q2. Free GPU options and their limits

### Takeaway
Truly free (no card) GPU options in Oct 2026: **Kaggle** (T4 x2 or P100, ~30 h/week, 12 h sessions, internet allowed after phone verification), **Colab free** (T4 when available, up to 12 h, but free tier forbids web-UI-centric use and remote proxies), **Lightning AI** (5 free credits without a card; the headline "80 GPU hours" needs 30 credits, 25 of which require adding a card), **Modal Starter** ($30/month compute; secondary sources say no card required, but one contradicts itself), and **Hugging Face ZeroGPU** (free accounts older than 30 days can now host up to 2 ZeroGPU Spaces on half an RTX Pro 6000 Blackwell, 48 GB, but with only 5 min/day of GPU quota for a free account).

### Cited Findings
**Google Colab (free)**
- "In the version of Colab that is free of charge notebooks can run for at most 12 hours, depending on availability and your usage patterns." "Runtimes will time out if you are idle." — [Colab FAQ](https://research.google.com/colaboratory/faq.html)
- Disallowed on ALL managed runtimes includes: "file hosting, media serving, or other web service offerings not related to interactive compute with Colab", "connecting to remote proxies", "using multiple accounts to work around access or resource usage restrictions", "creating deepfakes". — [Colab FAQ](https://research.google.com/colaboratory/faq.html)
- Disallowed on FREE runtimes (no compute-unit balance), "may be terminated at any time without warning": "remote control such as SSH shells, remote desktops", "bypassing the notebook UI to interact primarily via a web UI", "running distributed computing workers". FAQ adds: "Users in our free of charge tier commonly experience runtime terminations when attempting to bypass the notebook UI and using a web UI on a Colab managed runtime for content generation." — [Colab FAQ](https://research.google.com/colaboratory/faq.html)
- Accounts can be blocked: "This account has been blocked from accessing Colab runtimes due to suspected abusive activity." — [GitHub googlecolab/colabtools #6136](https://github.com/googlecolab/colabtools/issues/6136)
- Paid: $9.99 for 100 compute units, $49.99 for 500. — [Colab signup/pricing](https://colab.research.google.com/signup)

**Kaggle Notebooks**
- "12 hours execution time for CPU and GPU notebook sessions and 9 hours for TPU notebook sessions". — [Kaggle Notebooks docs](https://www.kaggle.com/docs/notebooks)
- GPU option "GPU T4 x2" gives 2 T4 GPUs (previously only P100). — [Kaggle product feedback announcement](https://www.kaggle.com/discussions/product-feedback/361104)
- Weekly quota ~30 hours, "guaranteed at 30 hours and floating higher when capacity allows" (checked Aug 2026, secondary). — [Clusy Colab vs Kaggle 2026](https://www.clusy.io/compare/colab-vs-kaggle); [Reddit r/LocalLLaMA (T4, 29 GB RAM, 30 h/week)](https://www.reddit.com/r/LocalLLaMA/comments/17bhwtj/kaggle_upgraded_their_free_tier_to_t4_with_29gb/)
- Tunnels: an older guide says "Kaggle consistently banned every tunnel that isn't Ngrok. Cloudflare does not work with Kaggle" (2023, possibly outdated); a 2026 repo shows a working Kaggle → cloudflared Quick Tunnel → Ollama setup; a public Kaggle notebook runs FastAPI + ngrok. — [Reddit r/KoboldAI](https://www.reddit.com/r/KoboldAI/comments/13gf5iw/guide_to_run_koboldai_on_kaggle_instead_of_google/); [GitHub kumaresankp/kaggle_32gpu_free](https://github.com/kumaresankp/kaggle_32gpu_free); [Kaggle notebook (FastAPI + ngrok)](https://www.kaggle.com/code/aghasonemmanuel/notebook7a49145bf7)
- A Kaggle community feedback post complains a "tutorial wave is converting Kaggle Notebooks into free public LLM servers - GPU availability is degrading" and asks Kaggle to block Cloudflare Tunnel/ngrok/localtunnel egress from GPU sessions — i.e., the practice is happening and is viewed as abuse by part of the community. — [Kaggle discussion 743898](https://www.kaggle.com/discussions/product-feedback/743898)

**Lightning AI**
- Free tier: "Start on the free tier with 80* free GPU hours." "Run 1 Studio free 24/7**. No credit card." "**Free Studios run 24/7 but require restart every 4 hours." — [Lightning pricing](https://lightning.ai/pricing)
- But: "You get 5 free Lightning credits upon registration. Add a card for 25 more. If you don't use them, they expire in 12 months." "Up to 30 free credits gets you ~80 GPU hours on interruptible machines." Phone number required "To prevent abuse". — [Lightning pricing](https://lightning.ai/pricing)
- T4 16 GB $0.55/h ($0.61–0.73 interruptible), L4 24 GB $0.79/h, A100 40 GB $2.19/h; free hours to start: T4 75, L4 31, A100 10 (all assume the full 30 credits). Free tier: up to 2 concurrent GPUs; A100/H100/H200 session limit 4 hours; "Share public app links", "Deploy ... model endpoints" listed as features. — [Lightning pricing](https://lightning.ai/pricing)
- Conflict: a secondary site says the free tier is "15 monthly Lightning credits (about 22 GPU hours/month on an NVIDIA T4)" and a pricing tracker says Lightning repriced on 2026-09-21; other blogs say "80 free GPU hours per month". The live pricing page (fetched today) shows the one-time "up to 30 credits" model. — [aicreditmart](https://aicreditmart.com/ai-credits-providers/lightning-ai-free-plan-22-gpu-hours-month-guide-2026/); [UsagePricing](https://www.usagepricing.com/blueprint/activity/lightning-ai-2026-09-21-gpu-rate-card-reprice); [GMI Cloud blog](https://www.gmicloud.ai/ja/blog/best-free-gpu-cloud-options-for-ai-startups-and-researchers)

**Modal**
- Starter: "$0 + compute / month", "$30 / month free credits", "3 workspace seats included", "100 containers + 10 GPU concurrency". — [Modal pricing](https://modal.com/pricing)
- Card requirement: UsagePricing says "No credit card required to deploy first function"; aicreditmart says "No credit card is required on Starter" in its body but answers "Yes" in its own FAQ (self-contradictory). Could not confirm from modal.com itself. — [UsagePricing Modal](https://www.usagepricing.com/blueprint/modal); [aicreditmart Modal](https://aicreditmart.com/ai-credits-providers/modal-free-tier-how-to-get-30-month-in-compute-credits-2026/)
- A100 ~ $2.50/h on Modal (secondary). — [Thunder Compute](https://www.thundercompute.com/blog/free-cloud-gpu-credits)

**Hugging Face ZeroGPU**
- "Free personal accounts: accounts in good standing (verified email, account older than 30 days) can host up to 2 ZeroGPU Spaces for free." PRO can host up to 10. — [HF ZeroGPU docs](https://huggingface.co/docs/hub/en/spaces-zerogpu)
- Hardware: "large (default) | Half NVIDIA RTX Pro 6000 Blackwell | 48GB | 1×" and "xlarge | Full NVIDIA RTX Pro 6000 Blackwell | 96GB | 2×" quota cost. — [HF ZeroGPU docs](https://huggingface.co/docs/hub/en/spaces-zerogpu)
- Daily quota: Unauthenticated 2 min, Free account 5 min, PRO 40 min (extensible), Enterprise 60 min; resets 24 h after first use; beyond quota billed to credits. — [HF ZeroGPU docs](https://huggingface.co/docs/hub/en/spaces-zerogpu)
- Conflict/outdated: older HF blog says "Upgrade to Pro ... to create your own ZeroGPU Spaces (and get 25 minutes of H200 usage every day)". The current docs supersede this. — [HF blog zerogpu-aoti](https://huggingface.co/blog/zerogpu-aoti)

### Inferences
- Of these, only Kaggle and Colab offer multi-hour free GPU time without a card; Kaggle has a clearer quota and fewer ToS landmines for this use.
- Lightning without a card = 5 credits ≈ ~9 T4-hours at $0.55/h (my arithmetic) — enough for a 24 h demo window if the Studio is only up during review, but the 4-hour restart requirement breaks an always-on endpoint.
- Modal $30/month ≈ 12 A100-hours at ~$2.50/h — the cleanest "real API" option (serverless web endpoint, scale-to-zero), if no card is truly required.
- ZeroGPU free hosting is the most interesting new development: a 48 GB Blackwell slice can run Wan 2.2 TI2V-5B (or even 14B with fp8) fast, and Spaces are callable by API (gradio_client) — but 5 min/day of GPU for the developer's own free account means maybe a few clips/day if the Next.js server calls with the developer's token; anonymous callers get 2 min each.

### Gaps
- Did not fetch Kaggle's Terms of Use text for explicit rules on serving/tunnels; Kaggle phone verification requirement for GPU/internet is from prior knowledge, not verified this session.
- Paperspace/Gradient free tier and AWS SageMaker Studio Lab current limits not researched (budget). Both may be outdated/discontinued — verify.
- Modal card requirement not confirmed from a primary source.
- Whether ZeroGPU quota for a Space call is charged to the caller (with token) or the Space owner — docs imply caller; confirm.

## Q3. Practical architecture: tunnel from Colab/Kaggle to a Next.js app

### Takeaway
Technically yes: run FastAPI/Gradio in the notebook and expose it via ngrok or a cloudflared Quick Tunnel; people do this on Kaggle routinely. But on **Colab free** it violates the FAQ (no "remote proxies"; "web service offerings" disallowed on all runtimes; web-UI-centric use gets terminated), so it is a ban risk. Sessions max out at 12 h on both, idle timeouts apply, and models must be re-downloaded each session (~20–35 GB).

### Cited Findings
- Colab: "connecting to remote proxies" and "web service offerings not related to interactive compute" disallowed on all managed runtimes; web-UI use on free tier "may be terminated at any time without warning". — [Colab FAQ](https://research.google.com/colaboratory/faq.html)
- Notebook-as-server pattern via ngrok or Cloudflare Tunnel is documented for both Colab and Kaggle ("Cloudflare Tunnel → stable and professional and faster"). — [Medium, Turn Colab and Kaggle into a Live Server](https://medium.com/@mohamedem2m/how-to-turn-google-colab-and-kaggle-into-a-live-server-89a62f14deb9)
- Working Kaggle + cloudflared Quick Tunnel example (trycloudflare.com URL) and Kaggle FastAPI + ngrok example. — [GitHub kumaresankp/kaggle_32gpu_free](https://github.com/kumaresankp/kaggle_32gpu_free); [Kaggle notebook](https://www.kaggle.com/code/aghasonemmanuel/notebook7a49145bf7)
- Kaggle community pressure to block tunnels from GPU sessions. — [Kaggle discussion 743898](https://www.kaggle.com/discussions/product-feedback/743898)
- Practical pain on Colab free: OOMs, crashes during multi-GB model download, disconnects after 45 minutes; model had to be cached on Google Drive. — [Medium LTX 2.3 on Colab](https://medium.com/@ammanakhtar8/how-i-finally-ran-ltx-2-3-22b-on-a-free-google-colab-gpu-770993db442c)
- Kaggle: 12 h max session. — [Kaggle docs](https://www.kaggle.com/docs/notebooks)
- Facebook group claim that Kaggle "disconnects every hour" (unverified, secondary; probably idle-related). — [Facebook post](https://www.facebook.com/groups/stablediffusion/posts/1249680665697406/)

### Inferences
- Tunnel URL changes each session (ngrok free / trycloudflare quick tunnels), so the Next.js app should read the backend URL from an env var or a small registry the notebook updates on start.
- Because clips take minutes, the API must be async (submit job -> poll status -> fetch MP4), not a single long HTTP request; tunnels and serverless hosts (e.g., Vercel function timeouts) will drop long requests.
- Single T4 = one job at a time; add a queue and show position/ETA.

### Gaps
- No primary source found on Kaggle's official stance (ToS clause) on tunnels; reliability (uptime %) of tunnels over a 24 h window not quantified.

## Q4. Realistic combination for a 24-hour take-home demo, and honest quality/latency

### Takeaway
Most realistic zero-budget path: **Wan 2.2 TI2V-5B (or LTX distilled for speed) on Kaggle T4 behind a cloudflared/ngrok tunnel, with an async job API and a hosted fallback**, or — if the developer already has a >30-day-old HF account — **a free ZeroGPU Space** called via gradio_client (much faster hardware, tiny daily quota). Modal's $30/month is the most production-like option if no card is required. Expect multi-minute latency per 5 s clip on a T4 and quality noticeably below commercial APIs (Kling/Veo/Runway).

### Cited Findings
- Wan 2.2 TI2V-5B: under 9 min for 5 s 720p on a 4090 without optimization; 2–4 min on 16 GB 40-series with FP8 + T5 offload. — [HF model card](https://huggingface.co/Wan-AI/Wan2.2-TI2V-5B); [willitrunai](https://willitrunai.com/blog/wan-2-2-vram-requirements)
- LTX distilled is far faster than Wan/Hunyuan but "often not as good as WAN". — [Reddit r/StableDiffusion](https://www.reddit.com/r/StableDiffusion/comments/1j5k9k5/ltxv_vs_wan21_vs_hunyuan_insane_speed_differences/)
- ZeroGPU free account: host 2 Spaces, 48 GB Blackwell slice, 5 min/day quota. — [HF ZeroGPU docs](https://huggingface.co/docs/hub/en/spaces-zerogpu)
- Modal: $30/month free credits, 10 GPU concurrency. — [Modal pricing](https://modal.com/pricing)
- Colab free: tunnel/web-UI serving disallowed. — [Colab FAQ](https://research.google.com/colaboratory/faq.html)

### Inferences
- Honest latency on a free T4: roughly 5–30 min per 5 s clip depending on model/resolution/steps (LTX distilled at 480–512p toward the low end; Wan 5B 720p toward the high end), plus 5–15 min cold start per session for downloading 20–35 GB of weights. Not demo-friendly for live reviewers.
- Quality: Wan 2.2 5B gives coherent but soft 720p motion with occasional artifacts; LTX distilled is faster but more warping/blur. Both clearly below closed APIs. (Qualitative, based on community comparisons cited above.)
- Recommended demo design: precompute a few showcase clips, keep the live path behind an async queue with clear "this takes ~X minutes" UI, and keep a mock/hosted-API fallback so the demo works when the notebook is down.
- Do not use Colab free as the backend for a public web demo given the explicit FAQ prohibitions.

### Gaps
- No first-hand T4 benchmarks; no measured end-to-end latency for any tunnelled setup.
- Did not verify whether a fresh HF account can use ZeroGPU hosting (30-day account age requirement means a newly created account cannot within 24 h).

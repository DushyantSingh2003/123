# WhatsApp Reseller: Meta Reels Ad (9:16)

A ~40-second portrait ad that sells the **home-based clothes-reselling business**: join the WhatsApp group, share our photos and videos, buy a single piece at wholesale rate when an order comes in, and we deliver pan-India. It also offers a website, Meta ads and sourcing setup for anyone who wants their own brand. All visuals are built from the 5 product/model photos in `assets/`.

The full creative is in **[AD_SCRIPT.md](AD_SCRIPT.md)**: hook choice, Hinglish voiceover, scene breakdown, ad copy and pre-launch checks.

## Files

| Path | What it is |
|------|-----------|
| `output/reseller_ad_preview_no_voice_9x16.mp4` | v2 visual edit with music, sound effects and on-screen text, timed to the voiceover (voice not mixed in yet) |
| `ad.html` | The motion-graphics composition (every scene, animation and caption) |
| `voice_plan.json` | Edit list that splices the 3 HeyGen clips (same voice) into the v2 voiceover |
| `voice.py` | `plan` writes `timeline.json` from the edit list; `build` splices the real clips and measures exact timing |
| `timeline.json` | Planned timing of each voiceover line; every scene is keyed to it |
| `render.cjs` | Renders `ad.html` frame by frame (headless Chromium → ffmpeg) |
| `audio/make_audio.py` | Generates the original background music and sound effects (royalty-free) |
| `audio/heygen_vo_*_timestamps.json` | HeyGen word timings plus the download link (`audio_url`) for each voice clip |
| `make_final.py` | Splices the voice, re-renders on the exact timing, mixes and exports the final MP4 |
| `assets/` | Your 5 photos, upscaled for 1080×1920 |

## Finishing the voiced version

The 3 voice clips are already generated in HeyGen, but this cloud environment's network policy blocks their download host (`resource2.heygen.ai`). Either:

1. **Allow the host:** in the environment settings, add `resource2.heygen.ai` under Network access → Allowed domains. Then ask Claude to "finish the voiced ad".
2. **Upload the files:** open each `audio_url` in a browser and save the 3 files with these names. Then upload them to this branch's `reseller-ad/audio/` folder on GitHub (Add file → Upload files).

   | File name | Download link from |
   |-----------|--------------------|
   | `vo_v1.wav` | `heygen_vo_v1_timestamps.json` |
   | `vo_v2a_hook_price.wav` | `heygen_vo_v2a_hook_price_timestamps.json` |
   | `vo_v2b_share_cta.wav` | `heygen_vo_v2b_share_cta_timestamps.json` |

Then:

```bash
python3 make_final.py          # -> output/reseller_ad_final_9x16.mp4 (+ output/vo_alignment.png sync check)
```

## Re-rendering after edits

```bash
python3 voice.py plan                     # timeline.json from voice_plan.json
node render.cjs                           # visuals -> output/video_silent.mp4 (+ sfx cue list)
node render.cjs --stills 0,10,20          # quick PNG previews of chosen seconds
python3 audio/make_audio.py               # music + sfx matching the current timeline
```

Requirements: Node with Playwright/Chromium, ffmpeg, and Python 3 with numpy, scipy and Pillow.

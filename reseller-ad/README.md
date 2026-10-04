# WhatsApp Reseller: Meta Reels Ad (9:16)

A ~38-second portrait ad that sells the **home-based clothes-reselling business**: join the WhatsApp group, share our photos and videos, buy a single piece at wholesale rate when an order comes in, and we deliver pan-India. It also offers a website, Meta ads and sourcing setup for anyone who wants their own brand. All visuals are built from the 5 product/model photos in `assets/`.

The full creative is in **[AD_SCRIPT.md](AD_SCRIPT.md)**: hook choice, Hinglish voiceover, scene breakdown, ad copy and pre-launch checks.

## Files

| Path | What it is |
|------|-----------|
| `output/reseller_ad_preview_no_voice_9x16.mp4` | Finished visual edit with music, sound effects and burned-in text (no voiceover yet) |
| `ad.html` | The motion-graphics composition (every scene, animation and caption) |
| `timeline.json` | Planned timing of each voiceover line; every scene is keyed to it |
| `render.cjs` | Renders `ad.html` frame by frame (headless Chromium → ffmpeg) |
| `audio/make_audio.py` | Generates the original background music and sound effects (royalty-free) |
| `audio/heygen_vo_word_timestamps.json` | Word-level timings of the HeyGen voiceover |
| `make_final.py` | Adds the real voiceover: tightens its pauses, re-syncs every scene to the spoken words, re-renders, mixes, exports |
| `assets/` | Your 5 photos, upscaled for 1080×1920 |

## Finishing the voiced version

The Hindi voiceover is already generated in HeyGen (voice "Riya Mehta"). Its download host, `resource2.heygen.ai`, was blocked by this cloud environment's network policy. Either of these works:

1. **Allow the host:** in the environment settings, add `resource2.heygen.ai` under Network access → Allowed domains. Then ask Claude to "finish the voiced ad".
2. **Upload the file:** open the `audio_url` from `audio/heygen_vo_word_timestamps.json` in a browser, save the `.wav` as `audio/vo_raw.wav`, and commit it to this branch.

Then:

```bash
python3 make_final.py audio/vo_raw.wav     # -> output/reseller_ad_final_9x16.mp4
```

## Re-rendering after edits

```bash
node render.cjs                           # visuals -> output/video_silent.mp4 (+ sfx cue list)
node render.cjs --stills 0,10,20          # quick PNG previews of chosen seconds
python3 audio/make_audio.py               # music + sfx matching the current timeline
```

Requirements: Node with Playwright/Chromium, ffmpeg, and Python 3 with numpy, scipy and Pillow.

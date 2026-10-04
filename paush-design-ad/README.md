# Paush Design: client-focused Meta Reels ad (9:16)

A ~32 s portrait ad for **Paush Design (Priya Tinwal, Interior Designer, Jaipur)**. Every interior in it is an original real-time 3D render built for this ad with Three.js: an empty "before" room, one living room in 5 styles, a bedroom, an office and a café.

The full creative is in **[AD_SCRIPT.md](AD_SCRIPT.md)**: Priya's voiceover lines, the scene plan, Meta ad copy and audience suggestions.

## Files

| Path | What it is |
|------|-----------|
| `output/paush_design_ad_preview_9x16.mp4` | Finished visual edit with music, sound effects and on-screen text (voiceover not yet recorded) |
| `ad.html` | The ad: 3D canvas plus text overlays, with every scene keyed to `timeline.json` |
| `src/rooms.js` | 3D rooms and furniture (5 living-room styles, empty room, bedroom, office, café) |
| `src/textures.js` | Procedural textures: wood, marble, brick, concrete, rugs, artwork |
| `src/engine.js` | Renderer, lighting environment, split-screen wipes |
| `render.cjs` | Renders the ad frame by frame (headless Chromium + WebGL → ffmpeg) |
| `audio/make_audio.py` | Original lounge music and sound effects (royalty-free) |
| `make_final.py` | Takes Priya's recording, finds the 8 lines, re-times every scene to her voice, mixes the final MP4 |

## Build

```bash
npm install                                   # three.js
node render.cjs                               # -> output/video_silent.mp4 (+ output/sfx_cues.json)
node render.cjs --stills 0,5,12               # quick PNG previews
python3 audio/make_audio.py                   # -> output/music.wav, output/sfx.wav
python3 make_final.py audio/vo_paush.m4a      # final voiced ad -> output/paush_design_ad_final_9x16.mp4
```

Requirements: Node 18+ with Playwright/Chromium, ffmpeg, and Python 3 with numpy, scipy and Pillow.

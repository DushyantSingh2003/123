"""Builds the final voiced ad from the HeyGen voiceover.

    python3 make_final.py audio/vo_raw.wav

1. tightens long pauses in the voiceover and speeds it up slightly (pitch preserved)
2. maps the HeyGen word timestamps onto the processed audio -> timeline_final.json
   (every scene, caption and sound effect re-syncs to the real voice)
3. re-renders the visuals, regenerates music/SFX for the new timing
4. mixes voice + ducked music + SFX and muxes -> output/reseller_ad_final_9x16.mp4
"""
import json
import os
import re
import subprocess
import sys

import numpy as np
from scipy.io import wavfile

ROOT = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(ROOT, 'output')
SR = 44100
MAX_PAUSE = 0.20       # longest silence kept inside the voiceover (s)
TARGET_SPEECH = 37.0   # aim for the voice to end around here (s)
MAX_TEMPO = 1.10       # never speed the voice up more than this (clarity first)
CTA_HOLD = 1.6         # end-card hold after the last word (s)

# word counts per phrase, in script order (must add up to the 116 words in the timestamps file)
PHRASES = [('hook1', 6), ('hook2', 5), ('curious', 9), ('nostock', 5), ('home', 3), ('kaise', 1), ('join', 6),
           ('designs', 8), ('share', 7), ('order', 7), ('products', 7), ('single', 7), ('margin', 5),
           ('delivery', 6), ('brand', 7), ('brandsetup', 11), ('festive', 8), ('cta', 8)]
# sound/animation cues pinned to specific spoken words: cue -> (phrase, word index inside phrase)
WORD_CUES = {'bStrike1': ('nostock', 1), 'bStrike2': ('nostock', 4), 'tap1': ('share', 2), 'tap2': ('share', 3),
             'tap3': ('share', 4), 'o3': ('order', 4), 'd3': ('products', 3), 'd4': ('products', 5),
             'd5': ('products', 6), 'eTag': ('single', 4), 'eq2': ('margin', 1), 'eq3': ('margin', 4),
             'g1': ('brandsetup', 0), 'g2': ('brandsetup', 1), 'g3': ('brandsetup', 3), 'gBanner': ('brandsetup', 4),
             'hGo': ('festive', 5), 'ctaTap': ('cta', 2)}


def run(cmd):
    print('$', ' '.join(cmd) if isinstance(cmd, list) else cmd)
    subprocess.run(cmd, check=True, shell=isinstance(cmd, str))


def silences(path, noise='-40dB', d=0.12):
    r = subprocess.run(['ffmpeg', '-hide_banner', '-i', path, '-af', f'silencedetect=noise={noise}:d={d}', '-f', 'null', '-'],
                       capture_output=True, text=True)
    st = [float(x) for x in re.findall(r'silence_start: ([\d.]+)', r.stderr)]
    en = [float(x) for x in re.findall(r'silence_end: ([\d.]+)', r.stderr)]
    return list(zip(st, en))


def alignment_png(wav, phrases, out_png):
    """waveform of the processed voice with each script line's span drawn on top (for a visual sync check)"""
    from PIL import Image, ImageDraw
    sr, a = wavfile.read(wav)
    a = a.astype(np.float32)
    if a.ndim > 1:
        a = a.mean(axis=1)
    dur = len(a) / sr
    w, h = 2400, 360
    img = Image.new('RGB', (w, h), 'white')
    d = ImageDraw.Draw(img)
    hop = max(1, len(a) // w)
    env = np.abs(a[: hop * w]).reshape(w, hop).max(axis=1)
    env = env / (env.max() + 1e-9)
    for x in range(w):
        d.line([(x, 180 - env[x] * 140), (x, 180 + env[x] * 140)], fill=(60, 60, 60))
    for k, (name, p) in enumerate(phrases.items()):
        x0, x1 = p['s'] / dur * w, p['e'] / dur * w
        col = (37, 211, 102) if k % 2 else (194, 24, 91)
        d.rectangle([x0, 330 - (k % 2) * 300, x1, 345 - (k % 2) * 300], fill=col)
        d.text((x0 + 2, 312 - (k % 2) * 300 + (k % 2) * 34), name, fill=col)
    img.save(out_png)


def main(vo_path):
    ts = json.load(open(os.path.join(ROOT, 'audio', 'heygen_vo_word_timestamps.json')))['words']
    assert sum(n for _, n in PHRASES) == len(ts), 'phrase word counts do not match timestamps'

    # ---- 1. tighten pauses -------------------------------------------------------------
    run(['ffmpeg', '-y', '-loglevel', 'error', '-i', vo_path, '-ac', '1', '-ar', str(SR), os.path.join(OUT, 'vo_mono.wav')])
    sr, x = wavfile.read(os.path.join(OUT, 'vo_mono.wav'))
    x = x.astype(np.float32)
    dur = len(x) / sr
    cuts = []  # (raw_start, raw_end) removed spans
    for a, b in silences(os.path.join(OUT, 'vo_mono.wav')):
        if a <= 0.01:      # leading silence: keep 0.05 s
            if b > 0.05:
                cuts.append((0.0, b - 0.05))
            continue
        if b >= dur - 0.01:  # trailing
            cuts.append((a + 0.15, dur))
            continue
        if b - a > MAX_PAUSE:
            keep_l = MAX_PAUSE * 0.5
            cuts.append((a + keep_l, b - (MAX_PAUSE - keep_l)))
    keep, pos = [], 0.0
    for a, b in cuts:
        if a > pos:
            keep.append((pos, a))
        pos = max(pos, b)
    if pos < dur:
        keep.append((pos, dur))
    fade = int(0.006 * sr)
    parts = []
    for a, b in keep:
        seg = x[int(a * sr):int(b * sr)].copy()
        if len(seg) > 2 * fade:
            seg[:fade] *= np.linspace(0, 1, fade)
            seg[-fade:] *= np.linspace(1, 0, fade)
        parts.append(seg)
    y = np.concatenate(parts)
    wavfile.write(os.path.join(OUT, 'vo_tight.wav'), sr, y.astype(np.int16))
    tight_dur = len(y) / sr
    tempo = float(np.clip(tight_dur / TARGET_SPEECH, 1.0, MAX_TEMPO))
    run(['ffmpeg', '-y', '-loglevel', 'error', '-i', os.path.join(OUT, 'vo_tight.wav'), '-af',
         f'atempo={tempo:.4f},highpass=f=80,acompressor=threshold=-20dB:ratio=3:attack=5:release=80,loudnorm=I=-15:TP=-1.5:LRA=7',
         '-ar', '48000', os.path.join(OUT, 'vo_final.wav')])
    print(f'voice: raw {dur:.2f}s -> tightened {tight_dur:.2f}s -> tempo x{tempo:.3f} = {tight_dur / tempo:.2f}s')

    def tmap(t):
        """raw voiceover time -> final timeline time"""
        removed = sum(max(0.0, min(t, b) - a) for a, b in cuts if a < t)
        return (t - removed) / tempo

    # ---- 2. phrase timings + word cues ----------------------------------------------------
    phrases, i = {}, 0
    tl_old = json.load(open(os.path.join(ROOT, 'timeline.json')))
    for name, n in PHRASES:
        words = ts[i:i + n]
        i += n
        phrases[name] = {'s': round(tmap(words[0]['s']), 3), 'e': round(tmap(words[-1]['e']), 3),
                         'vo': tl_old['phrases'][name]['vo'], '_words': [round(tmap(w['s']), 3) for w in words]}
    # HeyGen's aligner returns zero-length words in a couple of places; give those phrases a minimum span
    names = [p for p, _ in PHRASES]
    for k, name in enumerate(names):
        p = phrases[name]
        nxt = phrases[names[k + 1]]['s'] if k + 1 < len(names) else p['e'] + 1
        p['e'] = round(min(max(p['e'], p['s'] + 0.45), nxt - 0.05), 3)
    cues = {}
    for cue, (ph, wi) in WORD_CUES.items():
        p = phrases[ph]
        ws = p['_words']
        if len(set(ws)) == len(ws):  # only trust word times when the aligner gave distinct ones
            cues[cue] = ws[wi]
    for name, n in PHRASES:  # flag lines where the HeyGen aligner returned collapsed word times
        p = phrases[name]
        if n > 1 and (p['e'] - p['s']) / n < 0.12:
            print(f'WARNING: word timings for "{name}" look collapsed ({p["e"] - p["s"]:.2f}s for {n} words) - check output/vo_alignment.png')
    for p in phrases.values():
        p.pop('_words')
    end = round(phrases['cta']['e'] + CTA_HOLD, 2)
    tl = {'_note': 'generated by make_final.py from the real voiceover', 'end': end, 'phrases': phrases, 'cues': cues}
    json.dump(tl, open(os.path.join(ROOT, 'timeline_final.json'), 'w'), ensure_ascii=False, indent=1)
    alignment_png(os.path.join(OUT, 'vo_final.wav'), phrases, os.path.join(OUT, 'vo_alignment.png'))

    # ---- 3. visuals + music/sfx for the final timing ----------------------------------------
    run(['node', os.path.join(ROOT, 'render.cjs'), '--timeline', 'timeline_final.json', '--out', 'output/video_final_silent.mp4'])
    run([sys.executable, os.path.join(ROOT, 'audio', 'make_audio.py')])

    # ---- 4. mix: voice on top, music ducked under the voice, SFX -----------------------------
    final = os.path.join(OUT, 'reseller_ad_final_9x16.mp4')
    run(['ffmpeg', '-y', '-loglevel', 'error',
         '-i', os.path.join(OUT, 'video_final_silent.mp4'), '-i', os.path.join(OUT, 'vo_final.wav'),
         '-i', os.path.join(OUT, 'music.wav'), '-i', os.path.join(OUT, 'sfx.wav'),
         '-filter_complex',
         '[1:a]aformat=sample_rates=48000:channel_layouts=stereo,adelay=0|0,asplit=2[vo][key];'
         '[2:a]aformat=sample_rates=48000:channel_layouts=stereo,volume=0.32[mus];'
         '[mus][key]sidechaincompress=threshold=0.03:ratio=6:attack=15:release=350[duck];'
         '[3:a]aformat=sample_rates=48000:channel_layouts=stereo,volume=0.55[sfx];'
         '[vo][duck][sfx]amix=inputs=3:normalize=0:duration=longest,'
         f'atrim=0:{end},loudnorm=I=-14:TP=-1.0:LRA=9[a]',
         '-map', '0:v', '-map', '[a]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000',
         '-shortest', '-movflags', '+faststart', final])
    print('wrote', final)


if __name__ == '__main__':
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    main(os.path.abspath(sys.argv[1]))

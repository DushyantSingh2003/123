"""Builds the final voiced ad (v2).

    python3 make_final.py

Needs the 3 HeyGen voice clips saved as listed in voice_plan.json (audio/vo_v1.wav,
audio/vo_v2a_hook_price.wav, audio/vo_v2b_share_cta.wav - download links are in the
audio/heygen_vo_*_timestamps.json files). Steps:
1. voice.py build  -> splices the clips into output/vo_v2.wav + timeline_final.json (+ output/vo_alignment.png)
2. renders the visuals on that exact timing
3. regenerates music/SFX for that timing
4. mixes voice + music (ducked under the voice) + SFX -> output/reseller_ad_final_9x16.mp4
"""
import json
import os
import subprocess
import sys

ROOT = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(ROOT, 'output')


def run(cmd):
    print('$', ' '.join(cmd))
    subprocess.run(cmd, check=True, cwd=ROOT)


def main():
    run([sys.executable, 'voice.py', 'build'])
    end = json.load(open(os.path.join(ROOT, 'timeline_final.json')))['end']
    run(['node', 'render.cjs', '--timeline', 'timeline_final.json', '--out', 'output/video_final_silent.mp4'])
    run([sys.executable, os.path.join('audio', 'make_audio.py')])
    final = os.path.join(OUT, 'reseller_ad_final_9x16.mp4')
    run(['ffmpeg', '-y', '-loglevel', 'error',
         '-i', 'output/video_final_silent.mp4', '-i', 'output/vo_v2.wav', '-i', 'output/music.wav', '-i', 'output/sfx.wav',
         '-filter_complex',
         '[1:a]aformat=sample_rates=48000:channel_layouts=stereo,asplit=2[vo][key];'
         '[2:a]aformat=sample_rates=48000:channel_layouts=stereo,volume=0.32[mus];'
         '[mus][key]sidechaincompress=threshold=0.03:ratio=6:attack=15:release=350[duck];'
         '[3:a]aformat=sample_rates=48000:channel_layouts=stereo,volume=0.55[sfx];'
         '[vo][duck][sfx]amix=inputs=3:normalize=0:duration=longest,'
         f'atrim=0:{end},loudnorm=I=-14:TP=-1.0:LRA=9[a]',
         '-map', '0:v', '-map', '[a]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000',
         '-shortest', '-movflags', '+faststart', final])
    print('wrote', final)


if __name__ == '__main__':
    main()

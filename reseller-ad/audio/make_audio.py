"""Synthesises original (royalty-free) background music + sound effects for the ad.

    python3 audio/make_audio.py            # reads output/sfx_cues.json
writes output/music.wav and output/sfx.wav (44.1 kHz stereo).

Music: ~104 BPM Indo-pop groove in D (tanpura drone, bass, kick/clap, tabla-style
hits, Karplus-Strong plucked melody). Drums drop out for the "Kaise?" beat and the
track lands on a final hit under the CTA.
"""
import json
import os
import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, sosfilt, fftconvolve

SR = 44100
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
rng = np.random.default_rng(7)


def t_arr(d):
    return np.arange(int(d * SR)) / SR


def lp(x, f, order=2):
    return sosfilt(butter(order, f, 'low', fs=SR, output='sos'), x)


def hp(x, f, order=2):
    return sosfilt(butter(order, f, 'high', fs=SR, output='sos'), x)


def bp(x, lo, hi, order=2):
    return sosfilt(butter(order, [lo, hi], 'band', fs=SR, output='sos'), x)


def env_ad(n, a, d):
    """attack (s) then exponential decay with time-constant d (s)"""
    t = np.arange(n) / SR
    e = np.minimum(1, t / max(a, 1e-4)) * np.exp(-np.maximum(0, t - a) / d)
    return e


def add(buf, sig, at, gain=1.0, pan=0.0):
    i = int(at * SR)
    if i >= buf.shape[0] or i + len(sig) <= 0:
        return
    j = min(buf.shape[0], i + len(sig))
    s = sig[: j - i] * gain
    l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    buf[i:j, 0] += s * l * 1.414
    buf[i:j, 1] += s * r * 1.414


def note(n):  # midi -> Hz
    return 440.0 * 2 ** ((n - 69) / 12)


# ---------------------------------------------------------------- instruments
def kick():
    t = t_arr(0.35)
    f = 48 + 90 * np.exp(-t * 30)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * env_ad(len(t), 0.002, 0.12)
    return s + 0.3 * np.tanh(3 * s)


def clap():
    t = t_arr(0.25)
    n = bp(rng.standard_normal(len(t)), 900, 5000)
    e = env_ad(len(t), 0.001, 0.06)
    for k in (0.012, 0.024):  # flam
        e += 0.6 * np.roll(env_ad(len(t), 0.001, 0.01), int(k * SR))
    return n * e * 0.5


def shaker():
    t = t_arr(0.09)
    return hp(rng.standard_normal(len(t)), 6000) * env_ad(len(t), 0.01, 0.025) * 0.35


def tabla_na(f0=660):
    t = t_arr(0.4)
    s = sum(a * np.sin(2 * np.pi * f0 * m * t) for m, a in ((1, 1), (2.02, .45), (2.98, .25), (4.1, .12)))
    s = s * env_ad(len(t), 0.001, 0.09)
    s += bp(rng.standard_normal(len(t)), 2000, 7000) * env_ad(len(t), 0.0005, 0.006) * 0.6
    return s * 0.45


def tabla_ge():
    t = t_arr(0.6)
    f = 85 + 70 * (1 - np.exp(-t * 9))  # bayan pitch bend upwards
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * env_ad(len(t), 0.003, 0.22) * 0.8


def pluck(freq, dur=0.9):
    """Karplus-Strong plucked string (block form) with a little jawari-like buzz"""
    n = int(dur * SR)
    p = max(2, int(SR / freq))
    buf = rng.uniform(-1, 1, p)
    out = np.empty(n + p)
    for k in range(0, n, p):
        out[k:k + p] = buf
        buf = 0.996 * 0.5 * (buf + np.roll(buf, -1))
    out = out[:n]
    out += 0.12 * np.tanh(6 * out)
    return out * env_ad(n, 0.002, dur * 0.45)


def bass(freq, dur):
    t = t_arr(dur)
    s = np.sin(2 * np.pi * freq * t) + 0.35 * np.sin(2 * np.pi * 2 * freq * t) + 0.15 * np.sign(np.sin(2 * np.pi * freq * t))
    return lp(s, 600) * env_ad(len(t), 0.005, dur * 0.7) * 0.55


def pad(freqs, dur):
    t = t_arr(dur)
    s = np.zeros(len(t))
    for f in freqs:
        for det in (-0.25, 0.25):
            ph = 2 * np.pi * (f + det) * t
            s += (2 * ((ph / (2 * np.pi)) % 1) - 1)  # saw
    s = lp(s, 1400) / (len(freqs) * 2)
    a = np.minimum(1, t / 0.25) * np.minimum(1, (dur - t) / 0.25)
    return s * a * 0.22


def drone(dur):
    t = t_arr(dur)
    s = np.zeros(len(t))
    for f, a in ((note(38), 1), (note(45), .7), (note(50), .6), (note(57), .25)):
        for h in range(1, 7):
            s += a / h ** 1.2 * np.sin(2 * np.pi * f * h * t + h) * (0.75 + 0.25 * np.sin(2 * np.pi * (0.3 + 0.07 * h) * t))
    return lp(s, 2500) / 9.0


# ---------------------------------------------------------------- music
def make_music(end, cues):
    dur = end + 1.5
    out = np.zeros((int(dur * SR), 2))
    bpm = 104
    beat = 60 / bpm
    bar = 4 * beat
    kaise = next((c['t'] for c in cues if c['type'] == 'drop'), None)  # drum break on the "Kaise?" beat
    stop_lo, stop_hi = (kaise - 0.55, kaise + 0.45) if kaise else (-1, -1)
    final_hit = end - 1.6

    # I – V – vi – IV in D
    prog = [(50, [62, 66, 69]), (45, [61, 64, 69]), (47, [62, 66, 71]), (43, [62, 67, 71])]
    melody = [74, 76, 78, 81, 78, 76, 74, 71, 74, 76, 78, 76, 74, 71, 69, 71]  # D-major pentatonic hook

    add(out, drone(dur), 0, 0.10)
    nbars = int(dur / bar) + 1
    for b in range(nbars):
        t0 = b * bar
        if t0 > final_hit + 0.1:
            break
        root, chord = prog[b % 4]
        add(out, pad([note(n) for n in chord], bar), t0, 0.55)
        for k in range(4):
            bt = t0 + k * beat
            if bt > final_hit:
                break
            drums = not (stop_lo <= bt < stop_hi)
            if drums:
                if k in (0, 2):
                    add(out, kick(), bt, 0.85)
                if k in (1, 3):
                    add(out, clap(), bt, 0.42, pan=0.1)
                for e in range(2):
                    add(out, shaker(), bt + e * beat / 2, 0.8 if e else 0.5, pan=0.35)
                add(out, tabla_na(660 if k % 2 else 700), bt + beat * 0.5, 0.5, pan=-0.3)
                if k == 3:
                    add(out, tabla_ge(), bt + beat * 0.75, 0.55, pan=-0.2)
                if k == 1:
                    add(out, tabla_na(880), bt + beat * 0.75, 0.25, pan=-0.35)
            add(out, bass(note(root - 12), beat * 0.9), bt, 0.6 if drums else 0.25)
        # plucked melody: 8th notes on alternating bars
        if b % 2 == 1:
            for i in range(8):
                nt = t0 + i * beat / 2
                if nt > final_hit:
                    break
                m = melody[(b // 2 * 8 + i) % len(melody)]
                add(out, pluck(note(m), 0.7), nt, 0.18, pan=0.25 * np.sin(i))

    # final hit + tail
    add(out, kick(), final_hit, 1.0)
    add(out, clap(), final_hit, 0.5)
    add(out, pad([note(n) for n in (62, 66, 69, 74)], 2.0), final_hit, 0.9)
    add(out, pluck(note(74), 1.6), final_hit, 0.3)
    add(out, pluck(note(81), 1.6), final_hit + 0.05, 0.2)

    # light reverb
    ir_t = t_arr(1.4)
    ir = rng.standard_normal(len(ir_t)) * np.exp(-ir_t / 0.35)
    ir = lp(ir, 5000)
    ir /= np.sqrt(np.sum(ir ** 2))
    for ch in range(2):
        wet = fftconvolve(out[:, ch], ir)[: out.shape[0]]
        out[:, ch] = out[:, ch] + 0.18 * wet
    # fade tail
    fade_n = int(1.2 * SR)
    out[-fade_n:] *= np.linspace(1, 0, fade_n)[:, None]
    return out[: int((end + 0.3) * SR)]


# ---------------------------------------------------------------- sfx
def s_notify():
    t = t_arr(0.5)
    s = np.zeros(len(t))
    for f, at_ in ((1318.5, 0), (1975.5, 0.085)):
        i = int(at_ * SR)
        tt = t[: len(t) - i]
        s[i:] += (np.sin(2 * np.pi * f * tt) + 0.3 * np.sin(2 * np.pi * 2 * f * tt)) * env_ad(len(tt), 0.002, 0.09)
    return s * 0.45


def s_whoosh(lo=250, hi=3500, d=0.38):
    n = int(d * SR)
    x = rng.standard_normal(n)
    out = np.zeros(n)
    seg = 512
    for i in range(0, n, seg):
        f = lo * (hi / lo) ** (i / n)
        out[i:i + seg] = bp(x[i:i + seg], f * 0.7, min(f * 1.4, SR / 2 - 100), 1)
    e = np.sin(np.pi * np.linspace(0, 1, n)) ** 1.5
    return out * e * 0.5


def s_pop():
    t = t_arr(0.09)
    f = 520 + 700 * (t / 0.09)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * env_ad(len(t), 0.002, 0.025) * 0.55


def s_tap():
    t = t_arr(0.05)
    return (hp(rng.standard_normal(len(t)), 2500) * 0.5 + np.sin(2 * np.pi * 2200 * t)) * env_ad(len(t), 0.0005, 0.008) * 0.5


def s_thump():
    t = t_arr(0.35)
    f = 40 + 90 * np.exp(-t * 25)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * env_ad(len(t), 0.001, 0.09)
    s += bp(rng.standard_normal(len(t)), 1500, 6000) * env_ad(len(t), 0.0005, 0.01) * 0.4
    return s * 0.85


def s_chime():
    out = np.zeros(int(0.9 * SR))
    for i, m in enumerate((84, 88, 91, 96)):
        t = t_arr(0.9 - i * 0.06)
        f = note(m)
        s = (np.sin(2 * np.pi * f * t) + 0.25 * np.sin(2 * np.pi * 2.76 * f * t)) * env_ad(len(t), 0.002, 0.2)
        out[int(i * 0.06 * SR):int(i * 0.06 * SR) + len(s)] += s
    return out * 0.28


def s_send():
    t = t_arr(0.14)
    f = 380 + 1300 * (t / 0.14) ** 1.5
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * env_ad(len(t), 0.003, 0.05) * 0.5


def s_shutter():
    t = t_arr(0.12)
    s = hp(rng.standard_normal(len(t)), 3000) * (env_ad(len(t), 0.0005, 0.008) + 0.7 * np.roll(env_ad(len(t), 0.0005, 0.012), int(0.05 * SR)))
    return s * 0.35


def s_sparkle():
    out = np.zeros(int(1.2 * SR))
    for i in range(10):
        f = note(88 + (i * 5) % 14)
        t = t_arr(0.5)
        s = np.sin(2 * np.pi * f * t) * env_ad(len(t), 0.002, 0.12)
        k = int(i * 0.07 * SR)
        out[k:k + len(s)] += s * (0.6 + 0.4 * rng.random())
    return out * 0.16


def s_ticks():
    out = np.zeros(int(1.2 * SR))
    for i in range(12):
        t = t_arr(0.06)
        f = 900 + 60 * i
        s = np.sin(2 * np.pi * f * t) * env_ad(len(t), 0.001, 0.012)
        k = int(i * 0.07 * SR)
        out[k:k + len(s)] += s
    return out * 0.3


SFX = {
    'notify': (s_notify, 0.55), 'whoosh': (s_whoosh, 0.35), 'swipe': (lambda: s_whoosh(900, 6000, 0.2), 0.35),
    'pop': (s_pop, 0.5), 'tap': (s_tap, 0.6), 'thump': (s_thump, 0.65), 'chime': (s_chime, 0.6),
    'send': (s_send, 0.5), 'shutter': (s_shutter, 0.45), 'sparkle': (s_sparkle, 0.6),
    'truck': (lambda: s_whoosh(120, 900, 0.9), 0.4), 'tick': (s_ticks, 0.5),
    'drop': (lambda: np.zeros(1), 0.0),
}


def make_sfx(end, cues):
    out = np.zeros((int((end + 0.3) * SR), 2))
    for c in cues:
        fn, g = SFX[c['type']]
        add(out, fn(), c['t'], g, pan=float(rng.uniform(-0.25, 0.25)))
    return out


def save(path, x, peak_db=-1.0):
    x = x / (np.max(np.abs(x)) + 1e-9) * 10 ** (peak_db / 20)
    wavfile.write(path, SR, (x * 32767).astype(np.int16))


if __name__ == '__main__':
    data = json.load(open(os.path.join(ROOT, 'output', 'sfx_cues.json')))
    end, cues = data['end'], data['cues']
    save(os.path.join(ROOT, 'output', 'music.wav'), make_music(end, cues))
    save(os.path.join(ROOT, 'output', 'sfx.wav'), make_sfx(end, cues), peak_db=-3.0)
    print('wrote output/music.wav, output/sfx.wav')

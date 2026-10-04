// Procedural canvas textures (deterministic) for the interior scenes.
import * as THREE from 'three';

export function rng(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function canvas(w, h) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  return [c, c.getContext('2d')];
}

function tex(c, rx = 1, ry = 1, srgb = true) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(rx, ry);
  t.anisotropy = 8;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const hsl = (h, s, l, a = 1) => `hsla(${h},${s}%,${l}%,${a})`;

export function noiseOverlay(ctx, w, h, r, amt = 0.06, size = 2) {
  for (let i = 0; i < (w * h) / (size * size * 6); i++) {
    const v = r() < 0.5 ? 0 : 255;
    ctx.fillStyle = `rgba(${v},${v},${v},${r() * amt})`;
    ctx.fillRect(r() * w, r() * h, size, size);
  }
}

// wood planks running along V; base = [h,s,l]
export function woodPlanks(base, { planks = 6, seed = 1, rx = 1, ry = 1, gap = 3 } = {}) {
  const [c, x] = canvas(1024, 1024); const r = rng(seed);
  const pw = 1024 / planks;
  for (let p = 0; p < planks; p++) {
    let y = -r() * 600;
    while (y < 1024) {
      const len = 500 + r() * 600;
      const dl = (r() - 0.5) * 8, dh = (r() - 0.5) * 6;
      x.fillStyle = hsl(base[0] + dh, base[1], base[2] + dl);
      x.fillRect(p * pw, y, pw, len);
      // grain
      for (let g = 0; g < 26; g++) {
        x.strokeStyle = hsl(base[0] + dh, base[1] + 5, base[2] + dl - 6 - r() * 8, 0.25 + r() * 0.25);
        x.lineWidth = 0.6 + r() * 1.6;
        x.beginPath();
        const gx = p * pw + r() * pw;
        x.moveTo(gx, y);
        for (let k = 0; k <= 10; k++) x.lineTo(gx + Math.sin(k * 0.9 + g) * (2 + r() * 4), y + (len * k) / 10);
        x.stroke();
      }
      // knot
      if (r() < 0.25) { x.fillStyle = hsl(base[0], base[1] + 8, base[2] - 18, 0.35); x.beginPath(); x.ellipse(p * pw + pw * r(), y + len * r(), 6, 14, 0, 0, 7); x.fill(); }
      x.fillStyle = hsl(base[0], base[1], base[2] - 25, 0.8);
      x.fillRect(p * pw, y + len - gap / 2, pw, gap);
      y += len;
    }
    x.fillStyle = hsl(base[0], base[1], base[2] - 28, 0.85);
    x.fillRect(p * pw, 0, gap, 1024);
  }
  noiseOverlay(x, 1024, 1024, r, 0.05);
  return tex(c, rx, ry);
}

export function concrete(l = 62, { seed = 2, rx = 1, ry = 1, h = 30, s = 4 } = {}) {
  const [c, x] = canvas(1024, 1024); const r = rng(seed);
  x.fillStyle = hsl(h, s, l); x.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 900; i++) {
    const rad = 10 + r() * 90;
    const g = x.createRadialGradient(0, 0, 0, 0, 0, rad);
    const d = (r() - 0.5) * 14;
    g.addColorStop(0, hsl(h, s, l + d, 0.18)); g.addColorStop(1, hsl(h, s, l + d, 0));
    x.save(); x.translate(r() * 1024, r() * 1024); x.fillStyle = g; x.fillRect(-rad, -rad, rad * 2, rad * 2); x.restore();
  }
  noiseOverlay(x, 1024, 1024, r, 0.12, 2);
  return tex(c, rx, ry);
}

export function plaster(color = '#efe9e1', { seed = 3, rx = 1, ry = 1 } = {}) {
  const [c, x] = canvas(512, 512); const r = rng(seed);
  x.fillStyle = color; x.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 400; i++) {
    const rad = 20 + r() * 60, a = r() * 0.05;
    const g = x.createRadialGradient(0, 0, 0, 0, 0, rad);
    const v = r() < 0.5 ? 0 : 255;
    g.addColorStop(0, `rgba(${v},${v},${v},${a})`); g.addColorStop(1, `rgba(${v},${v},${v},0)`);
    x.save(); x.translate(r() * 512, r() * 512); x.fillStyle = g; x.fillRect(-rad, -rad, rad * 2, rad * 2); x.restore();
  }
  noiseOverlay(x, 512, 512, r, 0.03, 1);
  return tex(c, rx, ry);
}

export function brick({ seed = 4, rx = 1, ry = 1 } = {}) {
  const [c, x] = canvas(1024, 1024); const r = rng(seed);
  x.fillStyle = '#b9aea2'; x.fillRect(0, 0, 1024, 1024);
  const bw = 128, bh = 48, m = 7;
  for (let row = 0; row * bh < 1024; row++) {
    const off = row % 2 ? bw / 2 : 0;
    for (let col = -1; col * bw < 1024 + bw; col++) {
      const bx = col * bw + off, by = row * bh;
      const hue = 10 + r() * 14, light = 30 + r() * 16, sat = 38 + r() * 20;
      x.fillStyle = hsl(hue, sat, light);
      x.fillRect(bx + m / 2, by + m / 2, bw - m, bh - m);
      for (let k = 0; k < 40; k++) { x.fillStyle = hsl(hue, sat, light + (r() - 0.5) * 18, 0.35); x.fillRect(bx + m / 2 + r() * (bw - m - 6), by + m / 2 + r() * (bh - m - 4), 2 + r() * 8, 2 + r() * 5); }
      if (r() < 0.3) { x.fillStyle = 'rgba(240,235,230,0.18)'; x.fillRect(bx + m / 2, by + m / 2, bw - m, bh - m); }
    }
  }
  noiseOverlay(x, 1024, 1024, r, 0.1, 2);
  return tex(c, rx, ry);
}

export function marble({ seed = 5, rx = 1, ry = 1, base = '#f4f2ef', vein = '120,120,125' } = {}) {
  const [c, x] = canvas(1024, 1024); const r = rng(seed);
  x.fillStyle = base; x.fillRect(0, 0, 1024, 1024);
  for (let v = 0; v < 22; v++) {
    let px = r() * 1024, py = r() * 1024, ang = r() * Math.PI * 2;
    x.strokeStyle = `rgba(${vein},${0.08 + r() * 0.3})`; x.lineWidth = 0.6 + r() * 2.5;
    x.beginPath(); x.moveTo(px, py);
    for (let s = 0; s < 160; s++) { ang += (r() - 0.5) * 0.5; px += Math.cos(ang) * 8; py += Math.sin(ang) * 8; x.lineTo(px, py); }
    x.stroke();
  }
  noiseOverlay(x, 1024, 1024, r, 0.03, 1);
  return tex(c, rx, ry);
}

export function fabric(color, { seed = 6, rx = 4, ry = 4, amt = 0.08 } = {}) {
  const [c, x] = canvas(256, 256); const r = rng(seed);
  x.fillStyle = color; x.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 256; i += 2) { x.fillStyle = `rgba(255,255,255,${r() * amt})`; x.fillRect(0, i, 256, 1); x.fillStyle = `rgba(0,0,0,${r() * amt})`; x.fillRect(i, 0, 1, 256); }
  noiseOverlay(x, 256, 256, r, amt, 1);
  return tex(c, rx, ry);
}

export function rattan({ rx = 3, ry = 3 } = {}) {
  const [c, x] = canvas(256, 256);
  x.fillStyle = '#c9a26b'; x.fillRect(0, 0, 256, 256);
  x.strokeStyle = '#8a6838'; x.lineWidth = 3;
  for (let i = -256; i < 512; i += 18) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i + 256, 256); x.stroke(); x.beginPath(); x.moveTo(i, 256); x.lineTo(i + 256, 0); x.stroke(); }
  return tex(c, rx, ry);
}

// ---------------- rugs ----------------
export function rugPersian({ seed = 7 } = {}) {
  const [c, x] = canvas(1024, 1536); const r = rng(seed);
  const W = 1024, H = 1536;
  x.fillStyle = '#7a1d24'; x.fillRect(0, 0, W, H);
  const bands = [['#1f2a44', 70], ['#d9b26a', 16], ['#7a1d24', 8], ['#1f2a44', 50], ['#d9b26a', 10]];
  let o = 0;
  for (const [col, w] of bands) { x.strokeStyle = col; x.lineWidth = w; x.strokeRect(o + w / 2, o + w / 2, W - 2 * o - w, H - 2 * o - w); o += w; }
  // border motifs
  for (let i = 0; i < 30; i++) { x.fillStyle = '#d9b26a'; const y = 40 + i * (H - 80) / 30; x.beginPath(); x.arc(35, y, 9, 0, 7); x.arc(W - 35, y, 9, 0, 7); x.fill(); }
  // medallion
  x.save(); x.translate(W / 2, H / 2);
  for (let k = 6; k > 0; k--) {
    x.fillStyle = ['#d9b26a', '#1f2a44', '#b8323a', '#e8d5a8', '#1f2a44', '#d9b26a'][k - 1];
    x.beginPath();
    for (let a = 0; a <= 64; a++) { const t = (a / 64) * Math.PI * 2; const rad = k * 52 * (1 + 0.18 * Math.cos(8 * t)); x.lineTo(Math.cos(t) * rad * 0.9, Math.sin(t) * rad * 1.25); }
    x.fill();
  }
  x.restore();
  // field motifs
  for (let i = 0; i < 160; i++) {
    const px = 170 + r() * (W - 340), py = 170 + r() * (H - 340);
    if (Math.hypot((px - W / 2) / 0.9, (py - H / 2) / 1.25) < 330) continue;
    x.fillStyle = ['#d9b26a', '#e8d5a8', '#1f2a44', '#b8323a'][Math.floor(r() * 4)];
    x.save(); x.translate(px, py); x.rotate(r() * 6); x.beginPath(); x.ellipse(0, 0, 6 + r() * 10, 3 + r() * 5, 0, 0, 7); x.fill(); x.restore();
  }
  noiseOverlay(x, W, H, r, 0.1, 2);
  return tex(c);
}

export function rugBoho({ seed = 8 } = {}) {
  const [c, x] = canvas(1024, 1536); const r = rng(seed);
  const W = 1024, H = 1536;
  x.fillStyle = '#f1e4cf'; x.fillRect(0, 0, W, H);
  const cols = ['#c2552c', '#e1a23a', '#2f6f6a', '#8b3a5c', '#d77a54'];
  for (let row = 0; row < 12; row++) {
    const y = row * H / 12, col = cols[row % cols.length];
    x.fillStyle = col;
    if (row % 3 === 0) x.fillRect(60, y + 10, W - 120, 20);
    else {
      for (let k = 0; k < 9; k++) {
        const cx = 90 + k * (W - 180) / 8, cy = y + H / 24;
        x.beginPath(); x.moveTo(cx, cy - 46); x.lineTo(cx + 40, cy); x.lineTo(cx, cy + 46); x.lineTo(cx - 40, cy); x.closePath(); x.fill();
        x.fillStyle = '#f1e4cf'; x.beginPath(); x.moveTo(cx, cy - 18); x.lineTo(cx + 16, cy); x.lineTo(cx, cy + 18); x.lineTo(cx - 16, cy); x.fill(); x.fillStyle = col;
      }
    }
  }
  x.strokeStyle = '#2b2b2b'; x.lineWidth = 10; x.strokeRect(40, 0, W - 80, H);
  noiseOverlay(x, W, H, r, 0.12, 2);
  return tex(c);
}

export function rugScandi({ seed = 9 } = {}) {
  const [c, x] = canvas(1024, 1024); const r = rng(seed);
  x.fillStyle = '#ece8e1'; x.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 1024; i += 4) { x.fillStyle = `rgba(120,110,100,${0.04 + r() * 0.05})`; x.fillRect(0, i, 1024, 2); }
  x.strokeStyle = '#9a9187'; x.lineWidth = 6;
  for (let i = 1; i < 6; i++) { x.beginPath(); x.moveTo(0, i * 170); x.lineTo(1024, i * 170 + 40); x.stroke(); }
  noiseOverlay(x, 1024, 1024, r, 0.08, 2);
  return tex(c);
}

export function rugModern({ seed = 10, base = '#8a8580', border = '#3a3836' } = {}) {
  const [c, x] = canvas(1024, 1024); const r = rng(seed);
  x.fillStyle = base; x.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 3000; i++) { x.fillStyle = `rgba(255,255,255,${r() * 0.07})`; x.fillRect(r() * 1024, r() * 1024, 3, 1); }
  x.strokeStyle = border; x.lineWidth = 34; x.strokeRect(50, 50, 924, 924);
  noiseOverlay(x, 1024, 1024, r, 0.08, 2);
  return tex(c);
}

// ---------------- art ----------------
export function artAbstract({ seed = 11 } = {}) {
  const [c, x] = canvas(768, 1024); const r = rng(seed);
  x.fillStyle = '#efe8dd'; x.fillRect(0, 0, 768, 1024);
  x.fillStyle = '#c8a27a'; x.beginPath(); x.arc(300, 420, 230, 0, 7); x.fill();
  x.fillStyle = '#2e2c2a'; x.fillRect(420, 120, 210, 520);
  x.fillStyle = '#b5583a'; x.beginPath(); x.arc(520, 760, 140, Math.PI, 0); x.fill();
  x.strokeStyle = '#2e2c2a'; x.lineWidth = 6; x.beginPath(); x.moveTo(80, 860); x.bezierCurveTo(250, 700, 420, 980, 690, 820); x.stroke();
  noiseOverlay(x, 768, 1024, r, 0.05, 2);
  return tex(c);
}

export function artLine({ seed = 12 } = {}) {
  const [c, x] = canvas(768, 1024); const r = rng(seed);
  x.fillStyle = '#f6f3ee'; x.fillRect(0, 0, 768, 1024);
  x.strokeStyle = '#4c5a4b'; x.lineWidth = 7; x.lineCap = 'round';
  x.beginPath(); x.moveTo(384, 900); x.bezierCurveTo(380, 600, 400, 400, 384, 160); x.stroke();
  for (let i = 0; i < 7; i++) {
    const y = 260 + i * 90, s = i % 2 ? 1 : -1;
    x.beginPath(); x.moveTo(386, y); x.quadraticCurveTo(386 + s * 150, y - 70, 386 + s * 210, y - 10); x.quadraticCurveTo(386 + s * 120, y + 20, 386, y); x.stroke();
  }
  noiseOverlay(x, 768, 1024, r, 0.03, 2);
  return tex(c);
}

export function artBoho({ seed = 13 } = {}) {
  const [c, x] = canvas(768, 1024); const r = rng(seed);
  x.fillStyle = '#f3e3cc'; x.fillRect(0, 0, 768, 1024);
  const arcs = ['#c2552c', '#e1a23a', '#2f6f6a', '#d77a54'];
  arcs.forEach((col, i) => { x.strokeStyle = col; x.lineWidth = 44; x.beginPath(); x.arc(384, 760, 300 - i * 62, Math.PI, 0); x.stroke(); });
  x.fillStyle = '#e1a23a'; x.beginPath(); x.arc(384, 300, 90, 0, 7); x.fill();
  noiseOverlay(x, 768, 1024, r, 0.06, 2);
  return tex(c);
}

export function artMiniature({ seed = 14 } = {}) {
  // Rajasthani-inspired ornamental panel (not a copy of any artwork)
  const [c, x] = canvas(768, 1024); const r = rng(seed);
  x.fillStyle = '#1f3b3a'; x.fillRect(0, 0, 768, 1024);
  x.strokeStyle = '#d9b26a'; x.lineWidth = 16; x.strokeRect(30, 30, 708, 964);
  x.lineWidth = 4; x.strokeRect(60, 60, 648, 904);
  x.fillStyle = '#7a1d24';
  x.beginPath(); x.moveTo(140, 900); x.lineTo(140, 420); x.quadraticCurveTo(140, 180, 384, 140); x.quadraticCurveTo(628, 180, 628, 420); x.lineTo(628, 900); x.closePath(); x.fill();
  x.strokeStyle = '#d9b26a'; x.lineWidth = 6; x.stroke();
  x.save(); x.translate(384, 520);
  for (let k = 0; k < 16; k++) { x.rotate(Math.PI / 8); x.fillStyle = k % 2 ? '#d9b26a' : '#e8d5a8'; x.beginPath(); x.ellipse(0, -120, 22, 80, 0, 0, 7); x.fill(); }
  x.fillStyle = '#1f3b3a'; x.beginPath(); x.arc(0, 0, 60, 0, 7); x.fill();
  x.fillStyle = '#d9b26a'; x.beginPath(); x.arc(0, 0, 30, 0, 7); x.fill();
  x.restore();
  noiseOverlay(x, 768, 1024, r, 0.08, 2);
  return tex(c);
}

export function artIndustrial({ seed = 15 } = {}) {
  const [c, x] = canvas(768, 1024); const r = rng(seed);
  x.fillStyle = '#e9e6e1'; x.fillRect(0, 0, 768, 1024);
  x.fillStyle = '#1d1d1d';
  let px = 40;
  while (px < 728) { const w = 40 + r() * 90, h = 200 + r() * 520; x.fillRect(px, 900 - h, w, h); for (let k = 0; k < h / 30; k++) for (let j = 0; j < w / 22; j++) if (r() < 0.4) { x.fillStyle = '#e9e6e1'; x.fillRect(px + 6 + j * 22, 910 - h + k * 30, 9, 12); x.fillStyle = '#1d1d1d'; } px += w + 6; }
  x.fillRect(40, 900, 688, 8);
  noiseOverlay(x, 768, 1024, r, 0.06, 2);
  return tex(c);
}

export function screenTex({ seed = 16, col = '#2a6df4' } = {}) {
  const [c, x] = canvas(512, 320); const r = rng(seed);
  x.fillStyle = '#10141c'; x.fillRect(0, 0, 512, 320);
  x.fillStyle = col; x.fillRect(20, 20, 140, 280);
  for (let i = 0; i < 9; i++) { x.fillStyle = `rgba(255,255,255,${0.2 + r() * 0.5})`; x.fillRect(190, 30 + i * 30, 120 + r() * 180, 10); }
  return tex(c);
}

export function shelfProducts({ seed = 17 } = {}) {
  const [c, x] = canvas(1024, 512); const r = rng(seed);
  x.fillStyle = '#e8dccb'; x.fillRect(0, 0, 1024, 512);
  for (let row = 0; row < 3; row++) {
    let px = 20;
    while (px < 1000) {
      const w = 30 + r() * 60, h = 60 + r() * 80;
      x.fillStyle = ['#c2552c', '#2f6f6a', '#e1a23a', '#f6f3ee', '#3b3b3b', '#8b3a5c'][Math.floor(r() * 6)];
      x.fillRect(px, (row + 1) * 170 - 10 - h, w, h);
      px += w + 8 + r() * 14;
    }
    x.fillStyle = '#6b4a2e'; x.fillRect(0, (row + 1) * 170 - 10, 1024, 10);
  }
  return tex(c);
}

export function logoWall(text = 'PAUSH') {
  const [c, x] = canvas(1024, 256);
  x.fillStyle = '#20252b'; x.fillRect(0, 0, 1024, 256);
  x.fillStyle = '#d9b26a'; x.font = '700 120px "Playfair Display"'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText(text, 512, 135);
  return tex(c);
}

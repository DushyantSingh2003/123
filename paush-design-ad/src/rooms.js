// Procedural interior scenes: living room in 5 styles, empty "before" room, bedroom, office, cafe.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import * as T from './textures.js';

export const ROOM = { x0: -3.2, x1: 3.2, z0: -3.0, z1: 3.6, h: 3.0 };
const WIN = { z0: -2.1, z1: 0.3, y0: 0.55, y1: 2.65 };   // window opening on the left wall

// ------------------------------------------------------------------ helpers
const std = (o) => new THREE.MeshStandardMaterial(o);
function place(m, p = {}) {
  m.position.set(p.x || 0, p.y || 0, p.z || 0);
  m.rotation.set(p.rx || 0, p.ry || 0, p.rz || 0);
  if (p.s) m.scale.setScalar(p.s);
  m.castShadow = p.cast !== false; m.receiveShadow = p.recv !== false;
  return m;
}
const box = (w, h, d, mat, p) => place(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat), p);
const rbox = (w, h, d, r, mat, p) => place(new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 4, Math.min(r, w / 2, h / 2, d / 2) * 0.999), mat), p);
const cyl = (rt, rb, h, mat, p, seg = 28) => place(new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat), p);
const sph = (r, mat, p, ws = 24, hs = 16) => place(new THREE.Mesh(new THREE.SphereGeometry(r, ws, hs), mat), p);
function group(...kids) { const g = new THREE.Group(); kids.flat().forEach((k) => k && g.add(k)); return g; }
function at(g, x, y, z, ry = 0) { g.position.set(x, y, z); g.rotation.y = ry; return g; }
function item(g, name) { g.userData.item = name; return g; }   // droppable furniture (used by the 2D->3D build)

// ------------------------------------------------------------------ shell
function shell(cfg) {
  const g = new THREE.Group();
  const { x0, x1, z0, z1, h } = ROOM;
  const W = x1 - x0, D = z1 - z0;
  const floor = place(new THREE.Mesh(new THREE.PlaneGeometry(W, D), cfg.floor), { x: (x0 + x1) / 2, z: (z0 + z1) / 2, rx: -Math.PI / 2, cast: false });
  g.add(floor);
  g.add(place(new THREE.Mesh(new THREE.PlaneGeometry(W, h), cfg.back || cfg.wall), { x: (x0 + x1) / 2, y: h / 2, z: z0, cast: true }));
  g.add(place(new THREE.Mesh(new THREE.PlaneGeometry(D, h), cfg.right || cfg.wall), { x: x1, y: h / 2, z: (z0 + z1) / 2, ry: -Math.PI / 2 }));
  const ceil = place(new THREE.Mesh(new THREE.PlaneGeometry(W, D), cfg.ceiling || std({ color: '#f4f1ec', roughness: 0.95 })), { x: (x0 + x1) / 2, y: h, z: (z0 + z1) / 2, rx: Math.PI / 2, cast: false });
  g.add(ceil);
  // left wall with a window opening (4 pieces), thick so it casts a proper sun patch
  const lw = cfg.left || cfg.wall, t = 0.25, lx = x0 - t / 2;
  const seg = (za, zb, ya, yb) => box(t, yb - ya, zb - za, lw, { x: lx, y: (ya + yb) / 2, z: (za + zb) / 2 });
  g.add(seg(z0, WIN.z0, 0, h), seg(WIN.z1, z1, 0, h), seg(WIN.z0, WIN.z1, 0, WIN.y0), seg(WIN.z0, WIN.z1, WIN.y1, h));
  // inner face plane so the wall texture shows nicely
  // window frame + mullions
  const fm = cfg.frame || std({ color: '#222', roughness: 0.4, metalness: 0.3 });
  const fz = (WIN.z0 + WIN.z1) / 2, fl = WIN.z1 - WIN.z0, fh = WIN.y1 - WIN.y0;
  g.add(box(0.08, 0.06, fl + 0.06, fm, { x: x0 + 0.01, y: WIN.y0, z: fz }), box(0.08, 0.06, fl + 0.06, fm, { x: x0 + 0.01, y: WIN.y1, z: fz }));
  g.add(box(0.08, fh, 0.06, fm, { x: x0 + 0.01, y: (WIN.y0 + WIN.y1) / 2, z: WIN.z0 }), box(0.08, fh, 0.06, fm, { x: x0 + 0.01, y: (WIN.y0 + WIN.y1) / 2, z: WIN.z1 }));
  g.add(box(0.06, fh, 0.04, fm, { x: x0 + 0.01, y: (WIN.y0 + WIN.y1) / 2, z: fz }));
  // bright sky outside
  const sky = place(new THREE.Mesh(new THREE.PlaneGeometry(8, 6), new THREE.MeshBasicMaterial({ color: cfg.sky || '#fff3df' })), { x: x0 - 2.5, y: 1.8, z: fz, ry: Math.PI / 2, cast: false, recv: false });
  g.add(sky);
  // baseboard
  if (cfg.baseboard !== false) {
    const bm = cfg.baseboardMat || std({ color: '#f2efe9', roughness: 0.6 });
    g.add(box(W, 0.1, 0.02, bm, { x: (x0 + x1) / 2, y: 0.05, z: z0 + 0.01 }), box(0.02, 0.1, D, bm, { x: x1 - 0.01, y: 0.05, z: (z0 + z1) / 2 }));
  }
  return g;
}

function lights(scene, cfg) {
  const sun = new THREE.DirectionalLight(cfg.sunColor || '#ffe7c9', cfg.sun ?? 3.2);
  sun.position.set(-8, 5.2, 0.4); sun.target.position.set(0.2, 0, -1.4);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  const s = sun.shadow.camera; s.left = -6; s.right = 6; s.top = 6; s.bottom = -6; s.near = 1; s.far = 20;
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.02; sun.shadow.radius = 4;
  scene.add(sun, sun.target);
  scene.add(new THREE.HemisphereLight(cfg.hemiSky || '#fff6ec', cfg.hemiGround || '#b9a894', cfg.hemi ?? 0.32));
  // soft fill from the camera side
  const fill = new THREE.PointLight('#fff1e0', cfg.fill ?? 7, 14, 2); fill.position.set(1.5, 2.6, 3.4); scene.add(fill);
}
function warmLight(x, y, z, intensity = 4, color = '#ffc98a', dist = 6) {
  const l = new THREE.PointLight(color, intensity, dist, 2); l.position.set(x, y, z); return l;
}
const glow = (color = '#fff1d6', i = 2.2) => std({ color, emissive: color, emissiveIntensity: i, roughness: 0.4 });

// ------------------------------------------------------------------ furniture
function sofa(o) {
  const { w = 2.4, d = 0.95, legH = 0.1, seatH = 0.44, backH = 0.86, armW = 0.2, armH = 0.62, n = 3, fab, legMat, pillows = [], rolled = false, legType = 'block' } = o;
  const g = new THREE.Group();
  const baseTop = legH + 0.22;
  g.add(rbox(w, 0.22, d, 0.04, fab, { y: legH + 0.11 }));
  const sw = (w - 2 * armW) / n;
  for (let i = 0; i < n; i++) g.add(rbox(sw - 0.02, seatH - baseTop + 0.04, d - 0.26, 0.06, fab, { x: -w / 2 + armW + sw * (i + 0.5), y: baseTop + (seatH - baseTop) / 2, z: 0.1 }));
  g.add(rbox(w, backH - legH, 0.22, 0.05, fab, { y: legH + (backH - legH) / 2, z: -d / 2 + 0.11 }));
  for (let i = 0; i < n; i++) g.add(rbox(sw - 0.04, 0.4, 0.2, 0.08, fab, { x: -w / 2 + armW + sw * (i + 0.5), y: seatH + 0.2, z: -d / 2 + 0.3, rx: -0.12 }));
  for (const s of [-1, 1]) {
    g.add(rbox(armW, armH - legH, d, 0.06, fab, { x: s * (w / 2 - armW / 2), y: legH + (armH - legH) / 2 }));
    if (rolled) g.add(place(new THREE.Mesh(new THREE.CylinderGeometry(armW * 0.62, armW * 0.62, d, 24), fab), { x: s * (w / 2 - armW / 2), y: armH, rx: Math.PI / 2 }));
  }
  for (const [lx, lz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const px = lx * (w / 2 - 0.08), pz = lz * (d / 2 - 0.08);
    if (legType === 'turned') g.add(cyl(0.035, 0.025, legH, legMat, { x: px, y: legH / 2, z: pz }), sph(0.045, legMat, { x: px, y: legH * 0.75, z: pz }));
    else if (legType === 'thin') g.add(cyl(0.015, 0.012, legH, legMat, { x: px, y: legH / 2, z: pz }));
    else g.add(box(0.06, legH, 0.06, legMat, { x: px, y: legH / 2, z: pz }));
  }
  pillows.forEach((p, i) => {
    const side = i % 2 ? 1 : -1, k = Math.floor(i / 2);
    g.add(rbox(0.44, 0.44, 0.14, 0.06, p, { x: side * (w / 2 - armW - 0.3 - k * 0.32), y: seatH + 0.25, z: -d / 2 + 0.42, rx: -0.2, rz: side * (0.12 + k * 0.1), ry: side * -0.15 }));
  });
  return g;
}

function armchair(kind, m) {
  const g = new THREE.Group();
  if (kind === 'club') {
    g.add(rbox(0.86, 0.36, 0.82, 0.12, m.fab, { y: 0.2 }));
    g.add(rbox(0.6, 0.14, 0.62, 0.06, m.fab, { y: 0.44, z: 0.06 }));
    g.add(rbox(0.86, 0.42, 0.2, 0.09, m.fab, { y: 0.6, z: -0.31 }));
    for (const s of [-1, 1]) g.add(rbox(0.16, 0.3, 0.8, 0.07, m.fab, { x: s * 0.35, y: 0.52 }));
    if (m.leg) for (const [lx, lz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) g.add(cyl(0.018, 0.014, 0.08, m.leg, { x: lx * 0.36, y: 0.02, z: lz * 0.34 }));
  } else if (kind === 'wingback') {
    for (const [lx, lz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) g.add(cyl(0.03, 0.022, 0.18, m.leg, { x: lx * 0.32, y: 0.09, z: lz * 0.3 }));
    g.add(rbox(0.78, 0.2, 0.74, 0.05, m.fab, { y: 0.28 }));
    g.add(rbox(0.6, 0.1, 0.6, 0.04, m.fab, { y: 0.43, z: 0.05 }));
    g.add(rbox(0.78, 0.95, 0.16, 0.06, m.fab, { y: 0.75, z: -0.3 }));
    for (const s of [-1, 1]) {
      g.add(rbox(0.12, 0.28, 0.66, 0.05, m.fab, { x: s * 0.33, y: 0.5 }));
      g.add(rbox(0.1, 0.55, 0.3, 0.05, m.fab, { x: s * 0.35, y: 0.9, z: -0.18, ry: s * 0.35 }));
      g.add(place(new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.66, 20), m.fab), { x: s * 0.33, y: 0.64, rx: Math.PI / 2 }));
    }
  } else if (kind === 'lounge') {
    const w = m.wood;
    for (const s of [-1, 1]) {
      g.add(box(0.05, 0.5, 0.05, w, { x: s * 0.36, y: 0.25, z: 0.3 }), box(0.05, 0.5, 0.05, w, { x: s * 0.36, y: 0.25, z: -0.25, rx: -0.15 }));
      g.add(box(0.06, 0.04, 0.72, w, { x: s * 0.36, y: 0.52, z: 0.02 }));
    }
    g.add(rbox(0.66, 0.12, 0.62, 0.05, m.fab, { y: 0.34, z: 0.04 }));
    g.add(rbox(0.66, 0.58, 0.12, 0.05, m.fab, { y: 0.66, z: -0.3, rx: -0.22 }));
    g.add(box(0.7, 0.04, 0.04, w, { y: 0.28, z: 0.33 }));
  } else if (kind === 'peacock') {
    g.add(cyl(0.22, 0.32, 0.36, m.rattan, { y: 0.18 }));
    g.add(cyl(0.38, 0.38, 0.12, m.fab, { y: 0.42 }));
    g.add(place(new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.05, 40, 1, false, -Math.PI * 0.45, Math.PI * 0.9), m.rattan), { y: 1.0, z: -0.28, rx: Math.PI / 2 - 0.25 }));
    g.add(rbox(0.42, 0.42, 0.13, 0.06, m.pillow, { y: 0.66, z: -0.2, rx: -0.25 }));
  }
  return g;
}

function plant(h = 1.6, pot, leaf, seed = 1, kind = 'leafy') {
  const r = T.rng(seed), g = new THREE.Group();
  const pr = 0.16 + h * 0.06;
  g.add(cyl(pr, pr * 0.78, pr * 1.6, pot, { y: pr * 0.8 }));
  g.add(cyl(pr * 0.95, pr * 0.95, 0.02, std({ color: '#3b2a1e', roughness: 1 }), { y: pr * 1.6 }));
  const leafMats = [leaf, std({ color: '#3f7d45', roughness: 0.7 }), std({ color: '#2b5f33', roughness: 0.7 })];
  if (kind === 'snake') {
    for (let i = 0; i < 9; i++) {
      const lh = h * (0.5 + r() * 0.5);
      g.add(place(new THREE.Mesh(new THREE.ConeGeometry(0.05, lh, 4), leafMats[i % 3]), { x: (r() - 0.5) * pr, y: pr * 1.6 + lh / 2, z: (r() - 0.5) * pr, rx: (r() - 0.5) * 0.3, rz: (r() - 0.5) * 0.3, ry: r() * 3 }));
    }
    return g;
  }
  g.add(cyl(0.015, 0.02, h * 0.75, std({ color: '#5b4632' }), { y: pr * 1.6 + h * 0.37 }));
  const n = Math.round(14 + h * 10);
  for (let i = 0; i < n; i++) {
    const a = r() * Math.PI * 2, y = pr * 1.6 + h * (0.25 + 0.75 * Math.pow(r(), 0.7)), rad = 0.08 + r() * h * 0.22;
    const L = place(new THREE.Mesh(new THREE.SphereGeometry(0.11 + r() * 0.08, 12, 8), leafMats[Math.floor(r() * 3)]), { x: Math.cos(a) * rad, y, z: Math.sin(a) * rad, ry: -a, rz: 0.5 + r() * 0.6 });
    L.scale.set(1.4, 0.12, 0.75);
    g.add(L);
  }
  return g;
}

function hangingPlant(pot, leaf, seed = 3) {
  const r = T.rng(seed), g = new THREE.Group();
  g.add(cyl(0.004, 0.004, 0.9, std({ color: '#c9b79a' }), { y: 0.45 }));
  g.add(sph(0.16, pot, { y: -0.05 }));
  for (let v = 0; v < 7; v++) {
    const a = (v / 7) * Math.PI * 2, len = 0.4 + r() * 0.7;
    for (let k = 0; k < 9; k++) {
      const L = sph(0.05, leaf, { x: Math.cos(a) * (0.15 + k * 0.01), y: -0.05 - (k / 9) * len, z: Math.sin(a) * (0.15 + k * 0.01) });
      L.scale.set(1, 0.4, 0.8); g.add(L);
    }
  }
  return g;
}

function frameArt(texture, w, h, frameMat, depth = 0.04, border = 0.04) {
  const g = new THREE.Group();
  g.add(box(w + border * 2, h + border * 2, depth, frameMat, {}));
  g.add(place(new THREE.Mesh(new THREE.PlaneGeometry(w, h), std({ map: texture, roughness: 0.85 })), { z: depth / 2 + 0.002, cast: false }));
  return g;
}

function curtain(w, h, mat, folds = 9, seed = 1) {
  const geo = new THREE.PlaneGeometry(w, h, 60, 4);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i); p.setZ(i, Math.sin((x / w) * Math.PI * 2 * folds) * 0.045); }
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, mat); m.castShadow = true; m.receiveShadow = true;
  return m;
}

function rug(texture, w, d, rough = 0.95) {
  return place(new THREE.Mesh(new THREE.BoxGeometry(w, 0.012, d), std({ map: texture, roughness: rough })), { y: 0.006, cast: false });
}

function books(seed, n = 5) {
  const r = T.rng(seed), g = new THREE.Group(); let y = 0;
  for (let i = 0; i < n; i++) {
    const h = 0.03 + r() * 0.03;
    g.add(box(0.26 + r() * 0.08, h, 0.18 + r() * 0.05, std({ color: ['#c2552c', '#2f6f6a', '#e8e2d6', '#3b3b3b', '#b89a6a'][Math.floor(r() * 5)], roughness: 0.8 }), { y: y + h / 2, ry: (r() - 0.5) * 0.3 }));
    y += h;
  }
  return g;
}

function vase(color, h = 0.3) {
  return group(cyl(0.06, 0.09, h, std({ color, roughness: 0.4 }), { y: h / 2 }), sph(0.09, std({ color, roughness: 0.4 }), { y: h * 0.3 }));
}

// ------------------------------------------------------------------ living room styles
const STYLE = {
  modern: () => {
    const wall = std({ map: T.plaster('#ebe6df', { seed: 21 }), roughness: 0.92 });
    return {
      wall, floor: std({ map: T.woodPlanks([33, 22, 70], { planks: 5, seed: 22, rx: 6, ry: 3 }), roughness: 0.45 }),
      frame: std({ color: '#1d1d1d', roughness: 0.4, metalness: 0.4 }),
      sky: '#fff4e2', sun: 3.4,
    };
  },
  traditional: () => ({
    wall: std({ map: T.plaster('#264744', { seed: 31 }), roughness: 0.9 }),
    floor: std({ map: T.marble({ seed: 32, base: '#e9dcc6', vein: '150,120,90', rx: 3, ry: 3 }), roughness: 0.18, metalness: 0.0 }),
    frame: std({ color: '#5a3a22', roughness: 0.5 }), sky: '#ffe9c8', sun: 3.0, baseboardMat: std({ color: '#e9dfcc', roughness: 0.5 }),
  }),
  scandinavian: () => ({
    wall: std({ map: T.plaster('#ebe7e0', { seed: 41 }), roughness: 0.95 }),
    floor: std({ map: T.woodPlanks([36, 20, 79], { planks: 6, seed: 42, rx: 6, ry: 3 }), roughness: 0.55 }),
    frame: std({ color: '#f4f2ee', roughness: 0.6 }), sky: '#f6fbff', sun: 3.6,
  }),
  industrial: () => ({
    wall: std({ map: T.concrete(66, { seed: 51, rx: 2, ry: 1 }), roughness: 0.95 }),
    back: std({ map: T.brick({ seed: 52, rx: 2.4, ry: 1.2 }), roughness: 0.95 }),
    floor: std({ map: T.concrete(46, { seed: 53, rx: 2, ry: 2, h: 25, s: 6 }), roughness: 0.35 }),
    ceiling: std({ map: T.concrete(58, { seed: 54, rx: 2, ry: 2 }), roughness: 0.95 }),
    frame: std({ color: '#151515', roughness: 0.4, metalness: 0.5 }), sky: '#fff0dc', sun: 3.2, baseboard: false,
  }),
  bohemian: () => ({
    wall: std({ map: T.plaster('#e9cdb0', { seed: 61 }), roughness: 0.95 }),
    floor: std({ map: T.woodPlanks([27, 38, 52], { planks: 6, seed: 62, rx: 6, ry: 3 }), roughness: 0.55 }),
    frame: std({ color: '#6b4a2e', roughness: 0.6 }), sky: '#fff1d8', sun: 3.4,
  }),
};

export function buildLiving(style) {
  const scene = new THREE.Scene();
  const cfg = STYLE[style]();
  scene.add(shell(cfg));
  const items = [];
  const add = (g, name) => { item(g, name); scene.add(g); items.push(g); return g; };
  const wood = (hsl, rough = 0.5) => std({ color: new THREE.Color().setHSL(hsl[0] / 360, hsl[1] / 100, hsl[2] / 100), roughness: rough });
  const black = std({ color: '#1b1b1b', roughness: 0.35, metalness: 0.6 });
  const brass = std({ color: '#c9a050', roughness: 0.28, metalness: 0.9 });
  const greenLeaf = std({ color: '#4a8a4f', roughness: 0.7 });
  const SZ = -2.42, SX = -0.25;   // sofa position

  if (style === 'modern') {
    const fab = std({ map: T.fabric('#d4cdc4', { seed: 101 }), roughness: 0.95 });
    // fluted walnut feature panel behind the sofa
    const panel = new THREE.Group(); const walnut = wood([28, 38, 30], 0.6);
    for (let i = 0; i < 30; i++) panel.add(rbox(0.085, 2.7, 0.06, 0.02, walnut, { x: -1.45 + i * 0.1, y: 1.35, z: ROOM.z0 + 0.04 }));
    panel.add(box(3.2, 0.03, 0.12, glow('#ffd9a0', 1.6), { y: 2.72, z: ROOM.z0 + 0.06 }));
    panel.position.x = SX; scene.add(panel);
    add(at(sofa({ w: 2.5, fab, legMat: black, legType: 'thin', legH: 0.12, pillows: [std({ color: '#2f2d2b', roughness: 0.9 }), std({ color: '#b5583a', roughness: 0.9 }), std({ color: '#efe9df', roughness: 0.95 })] }), SX, 0, SZ), 'sofa');
    add(at(rug(T.rugModern({ seed: 102 }), 3.1, 2.2), SX, 0, -1.45), 'rug');
    const ct = group(box(1.25, 0.04, 0.65, std({ map: T.marble({ seed: 103 }), roughness: 0.15 }), { y: 0.38 }),
      box(0.04, 0.36, 0.55, black, { x: -0.5, y: 0.18 }), box(0.04, 0.36, 0.55, black, { x: 0.5, y: 0.18 }),
      at(books(104, 3), -0.25, 0.4, 0), at(vase('#b5583a', 0.22), 0.3, 0.4, 0.05));
    add(at(ct, SX, 0, -1.25), 'table');
    add(at(armchair('club', { fab: std({ map: T.fabric('#f1ece3', { seed: 105, amt: 0.15 }), roughness: 1 }) }), 1.55, 0, -0.85, -0.75), 'chair');
    // arc floor lamp
    const lamp = group(cyl(0.18, 0.2, 0.05, std({ map: T.marble({ seed: 106 }), roughness: 0.2 }), { y: 0.025 }), cyl(0.015, 0.015, 1.7, black, { y: 0.87 }),
      place(new THREE.Mesh(new THREE.TorusGeometry(0.75, 0.015, 8, 40, Math.PI / 2), black), { x: 0.75, y: 1.72, cast: true }),
      place(new THREE.Mesh(new THREE.SphereGeometry(0.2, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), black), { x: 1.5, y: 1.62 }),
      sph(0.06, glow('#ffe3b5', 3), { x: 1.5, y: 1.56 }), warmLight(1.5, 1.45, 0, 3.5));
    add(at(lamp, -1.95, 0, -2.3), 'lamp');
    add(at(plant(1.7, std({ color: '#2d2b29', roughness: 0.6 }), greenLeaf, 107), 2.35, 0, -2.4), 'plant');
    add(at(group(cyl(0.22, 0.22, 0.03, black, { y: 0.55 }), cyl(0.015, 0.015, 0.55, black, { y: 0.27 }), cyl(0.16, 0.16, 0.02, black, { y: 0.01 }), at(vase('#efe9df', 0.18), 0, 0.57, 0)), 1.35, 0, -2.45), 'side');
    scene.add(at(frameArt(T.artAbstract({ seed: 108 }), 0.95, 1.25, black, 0.03, 0.025), SX, 1.78, ROOM.z0 + 0.12));
    // big opal globe pendant
    scene.add(group(cyl(0.006, 0.006, 0.55, black, { y: ROOM.h - 0.27 }), sph(0.24, glow('#fff3e0', 1.4), { y: ROOM.h - 0.75 }), warmLight(0, ROOM.h - 1.0, 0, 5)).translateX(SX).translateZ(-0.9));
    // sheer curtains
    const sheer = std({ color: '#f7f3ec', roughness: 1, transparent: true, opacity: 0.8, side: THREE.DoubleSide });
    scene.add(place(curtain(0.9, 2.85, sheer, 9), { x: ROOM.x0 + 0.12, y: 1.45, z: WIN.z0 - 0.15, ry: Math.PI / 2 }));
    scene.add(place(curtain(0.9, 2.85, sheer, 9), { x: ROOM.x0 + 0.12, y: 1.45, z: WIN.z1 + 0.25, ry: Math.PI / 2 }));
    // cove light
    scene.add(box(ROOM.x1 - ROOM.x0, 0.04, 0.05, glow('#ffe1b0', 1.2), { x: 0, y: ROOM.h - 0.08, z: ROOM.z0 + 0.03, cast: false }));
  }

  if (style === 'traditional') {
    const velvet = std({ map: T.fabric('#6d1f2a', { seed: 201, amt: 0.12 }), roughness: 0.7 });
    const darkwood = wood([22, 45, 18], 0.4);
    // wainscoting: cream lower panel with moulding frames + gold picture rail
    const cream = std({ color: '#ece2cf', roughness: 0.6 });
    scene.add(box(ROOM.x1 - ROOM.x0, 1.05, 0.03, cream, { x: 0, y: 0.525, z: ROOM.z0 + 0.015 }));
    for (let i = 0; i < 6; i++) {
      const px = ROOM.x0 + 0.55 + i * 1.07;
      for (const [w, h, dy] of [[0.86, 0.035, 0.24], [0.86, 0.035, 0.86]]) scene.add(box(w, h, 0.02, cream, { x: px, y: dy, z: ROOM.z0 + 0.04 }));
      for (const dx of [-0.41, 0.41]) scene.add(box(0.035, 0.62, 0.02, cream, { x: px + dx, y: 0.55, z: ROOM.z0 + 0.04 }));
    }
    scene.add(box(ROOM.x1 - ROOM.x0, 0.05, 0.05, brass, { x: 0, y: 1.08, z: ROOM.z0 + 0.03 }));
    scene.add(box(ROOM.x1 - ROOM.x0, 0.12, 0.1, cream, { x: 0, y: ROOM.h - 0.06, z: ROOM.z0 + 0.05 }));
    add(at(sofa({ w: 2.45, fab: velvet, legMat: darkwood, legType: 'turned', legH: 0.14, rolled: true, armH: 0.6, pillows: [std({ color: '#d9b26a', roughness: 0.6, metalness: 0.2 }), std({ color: '#d9b26a', roughness: 0.6, metalness: 0.2 }), std({ color: '#1f3b3a', roughness: 0.8 }), std({ color: '#1f3b3a', roughness: 0.8 })] }), SX, 0, SZ), 'sofa');
    add(at(rug(T.rugPersian({ seed: 202 }), 2.8, 2.3, 0.9), SX, 0, -1.4, Math.PI / 2), 'rug');
    const legs = []; for (const [lx, lz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) legs.push(cyl(0.035, 0.03, 0.38, darkwood, { x: lx * 0.5, y: 0.19, z: lz * 0.28 }), sph(0.05, darkwood, { x: lx * 0.5, y: 0.12, z: lz * 0.28 }));
    add(at(group(rbox(1.15, 0.06, 0.68, 0.01, darkwood, { y: 0.43 }), box(1.05, 0.08, 0.58, darkwood, { y: 0.36 }), legs,
      cyl(0.2, 0.2, 0.02, brass, { y: 0.47 }), at(vase('#e8d5a8', 0.16), 0.05, 0.48, 0)), SX, 0, -1.25), 'table');
    add(at(armchair('wingback', { fab: std({ map: T.fabric('#c9962e', { seed: 203, amt: 0.1 }), roughness: 0.6 }), leg: darkwood }), 1.6, 0, -0.95, -0.7), 'chair');
    // jharokha-style arched mirror above the sofa
    const arch = new THREE.Shape(); const aw = 0.55, ah = 0.75;
    arch.moveTo(-aw, -ah); arch.lineTo(-aw, ah * 0.25); arch.quadraticCurveTo(-aw, ah, 0, ah * 1.25); arch.quadraticCurveTo(aw, ah, aw, ah * 0.25); arch.lineTo(aw, -ah); arch.lineTo(-aw, -ah);
    const inner = new THREE.Path(); const k = 0.82;
    inner.moveTo(-aw * k, -ah * 0.9); inner.lineTo(-aw * k, ah * 0.22); inner.quadraticCurveTo(-aw * k, ah * 0.92, 0, ah * 1.12); inner.quadraticCurveTo(aw * k, ah * 0.92, aw * k, ah * 0.22); inner.lineTo(aw * k, -ah * 0.9); inner.lineTo(-aw * k, -ah * 0.9);
    arch.holes.push(inner);
    const frameG = place(new THREE.Mesh(new THREE.ExtrudeGeometry(arch, { depth: 0.06, bevelEnabled: true, bevelSize: 0.015, bevelThickness: 0.015, bevelSegments: 2 }), brass), {});
    const mirShape = new THREE.Shape(inner.getPoints());
    const mir = place(new THREE.Mesh(new THREE.ShapeGeometry(mirShape), std({ color: '#dfe3df', roughness: 0.12, metalness: 0.35, emissive: '#3a3f3d', emissiveIntensity: 0.6 })), { z: 0.02, cast: false });
    scene.add(at(group(frameG, mir), SX, 1.95, ROOM.z0 + 0.06));
    for (const dx of [-1.25, 0.75]) scene.add(at(frameArt(T.artMiniature({ seed: 204 + dx }), 0.42, 0.58, brass, 0.03, 0.03), SX + dx + 0.25, 1.85, ROOM.z0 + 0.06));
    // brass chandelier
    const ch = new THREE.Group();
    ch.add(cyl(0.01, 0.01, 0.35, brass, { y: ROOM.h - 0.17 }), cyl(0.05, 0.08, 0.35, brass, { y: ROOM.h - 0.5 }));
    for (const [rr, yy, nn] of [[0.45, ROOM.h - 0.68, 8], [0.28, ROOM.h - 0.52, 6]]) {
      ch.add(place(new THREE.Mesh(new THREE.TorusGeometry(rr, 0.015, 8, 48), brass), { y: yy, rx: Math.PI / 2 }));
      for (let i = 0; i < nn; i++) { const a = (i / nn) * Math.PI * 2; ch.add(cyl(0.018, 0.018, 0.1, std({ color: '#f3ead8' }), { x: Math.cos(a) * rr, y: yy + 0.06, z: Math.sin(a) * rr }), sph(0.03, glow('#ffd59a', 3), { x: Math.cos(a) * rr, y: yy + 0.14, z: Math.sin(a) * rr })); }
    }
    ch.add(warmLight(0, ROOM.h - 0.8, 0, 7, '#ffcf8f'));
    scene.add(at(ch, SX, 0, -0.9));
    // brass floor lamp with pleated shade
    add(at(group(cyl(0.16, 0.18, 0.04, brass, { y: 0.02 }), cyl(0.014, 0.014, 1.45, brass, { y: 0.74 }), cyl(0.17, 0.27, 0.34, std({ color: '#f1e3c4', emissive: '#ffcf8f', emissiveIntensity: 0.6, roughness: 0.9, side: THREE.DoubleSide }), { y: 1.55 }, 16), warmLight(0, 1.5, 0, 3.5)), -1.95, 0, -2.45), 'lamp');
    add(at(plant(1.2, brass, greenLeaf, 205), 2.3, 0, -2.45), 'plant');
    const heavy = std({ map: T.fabric('#7a1d24', { seed: 206, amt: 0.15 }), roughness: 0.75, side: THREE.DoubleSide });
    scene.add(place(curtain(0.8, 2.85, heavy, 7), { x: ROOM.x0 + 0.12, y: 1.45, z: WIN.z0 - 0.15, ry: Math.PI / 2 }));
    scene.add(place(curtain(0.8, 2.85, heavy, 7), { x: ROOM.x0 + 0.12, y: 1.45, z: WIN.z1 + 0.25, ry: Math.PI / 2 }));
    scene.add(box(0.06, 0.06, 3.4, brass, { x: ROOM.x0 + 0.14, y: 2.9, z: (WIN.z0 + WIN.z1) / 2 }));
  }

  if (style === 'scandinavian') {
    const fab = std({ map: T.fabric('#d9d7d2', { seed: 301 }), roughness: 0.95 });
    const oak = wood([35, 35, 68], 0.55);
    add(at(sofa({ w: 2.4, fab, legMat: oak, legType: 'thin', legH: 0.16, pillows: [std({ color: '#8fa58a', roughness: 0.95 }), std({ color: '#e1b85a', roughness: 0.95 }), std({ color: '#f4f1ec', roughness: 1 })] }), SX, 0, SZ), 'sofa');
    // throw blanket over the arm
    scene.add(rbox(0.5, 0.04, 0.95, 0.02, std({ map: T.fabric('#e3c58c', { seed: 302, amt: 0.15 }), roughness: 1 }), { x: SX + 1.02, y: 0.66, z: SZ, rz: 0.15 }));
    add(at(rug(T.rugScandi({ seed: 303 }), 3.0, 2.2), SX, 0, -1.45), 'rug');
    const tl = []; for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI * 2 + 0.3; tl.push(cyl(0.02, 0.014, 0.42, oak, { x: Math.cos(a) * 0.3, y: 0.2, z: Math.sin(a) * 0.3, rx: Math.sin(a) * 0.12, rz: -Math.cos(a) * 0.12 })); }
    add(at(group(cyl(0.48, 0.48, 0.035, oak, { y: 0.42 }, 48), tl, at(books(304, 2), -0.1, 0.44, 0.05), at(plant(0.25, std({ color: '#f4f1ec' }), greenLeaf, 305), 0.22, 0.44, -0.1)), SX, 0, -1.25), 'table');
    add(at(armchair('lounge', { fab: std({ map: T.fabric('#9a9a96', { seed: 306 }), roughness: 0.95 }), wood: oak }), 1.55, 0, -0.9, -0.75), 'chair');
    // tripod floor lamp
    const tri = []; for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI * 2; tri.push(cyl(0.015, 0.012, 1.35, oak, { x: Math.cos(a) * 0.16, y: 0.66, z: Math.sin(a) * 0.16, rx: Math.sin(a) * 0.14, rz: -Math.cos(a) * 0.14 })); }
    add(at(group(tri, cyl(0.2, 0.24, 0.3, std({ color: '#fbf8f2', emissive: '#ffe2b8', emissiveIntensity: 0.5, roughness: 1, side: THREE.DoubleSide }), { y: 1.42 }), warmLight(0, 1.35, 0, 3)), -1.95, 0, -2.4), 'lamp');
    add(at(plant(1.8, std({ color: '#f4f1ec', roughness: 0.7 }), greenLeaf, 307), 2.35, 0, -2.45), 'plant');
    add(at(plant(0.9, std({ color: '#d8cbb8', roughness: 0.8 }), greenLeaf, 308, 'snake'), -2.6, 0, -0.6), 'plant2');
    for (const [dx, dy, s] of [[-0.45, 1.85, 1], [0.35, 1.75, 0.75]]) scene.add(at(frameArt(T.artLine({ seed: 309 + dx }), 0.6 * s, 0.8 * s, oak, 0.03, 0.03), SX + dx, dy, ROOM.z0 + 0.06));
    // white dome pendant
    scene.add(at(group(cyl(0.005, 0.005, 0.6, black, { y: ROOM.h - 0.3 }), place(new THREE.Mesh(new THREE.SphereGeometry(0.3, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2.2), std({ color: '#f6f4f0', roughness: 0.6, side: THREE.DoubleSide })), { y: ROOM.h - 0.8 }), sph(0.06, glow('#fff0d0', 3), { y: ROOM.h - 0.82 }), warmLight(0, ROOM.h - 1.0, 0, 5)), SX, 0, -0.9));
    const linen = std({ color: '#fbfaf7', roughness: 1, transparent: true, opacity: 0.75, side: THREE.DoubleSide });
    scene.add(place(curtain(0.8, 2.85, linen, 8), { x: ROOM.x0 + 0.12, y: 1.45, z: WIN.z0 - 0.15, ry: Math.PI / 2 }));
    scene.add(place(curtain(0.8, 2.85, linen, 8), { x: ROOM.x0 + 0.12, y: 1.45, z: WIN.z1 + 0.25, ry: Math.PI / 2 }));
    // wall shelf
    scene.add(box(1.1, 0.04, 0.22, oak, { x: 1.5, y: 1.55, z: ROOM.z0 + 0.11 }), at(books(310, 4), 1.25, 1.57, ROOM.z0 + 0.12), at(vase('#8fa58a', 0.18), 1.75, 1.57, ROOM.z0 + 0.12));
  }

  if (style === 'industrial') {
    const leather = std({ map: T.fabric('#7c4320', { seed: 401, amt: 0.1 }), roughness: 0.45 });
    const rough = wood([25, 30, 30], 0.75);
    add(at(sofa({ w: 2.45, fab: leather, legMat: black, legType: 'block', legH: 0.1, rolled: true, armH: 0.66, n: 2, pillows: [std({ color: '#5d6b62', roughness: 0.95 }), std({ color: '#c9b79a', roughness: 0.95 })] }), SX, 0, SZ), 'sofa');
    add(at(rug(T.rugModern({ seed: 402, base: '#6b5a4a', border: '#2a2420' }), 3.0, 2.2), SX, 0, -1.45), 'rug');
    add(at(group(box(1.25, 0.06, 0.65, std({ map: T.woodPlanks([25, 30, 32], { planks: 4, seed: 403 }), roughness: 0.7 }), { y: 0.42 }),
      box(1.2, 0.04, 0.04, black, { y: 0.37, z: 0.3 }), box(1.2, 0.04, 0.04, black, { y: 0.37, z: -0.3 }), box(1.2, 0.04, 0.04, black, { y: 0.06, z: 0.3 }), box(1.2, 0.04, 0.04, black, { y: 0.06, z: -0.3 }),
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b]) => box(0.04, 0.4, 0.04, black, { x: a * 0.58, y: 0.2, z: b * 0.3 })), at(books(404, 3), 0.2, 0.45, 0)), SX, 0, -1.25), 'table');
    add(at(armchair('club', { fab: std({ map: T.fabric('#3a2a20', { seed: 405, amt: 0.1 }), roughness: 0.45 }), leg: black }), 1.55, 0, -0.9, -0.75), 'chair');
    // open metal shelving
    const sh = new THREE.Group();
    for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) sh.add(box(0.035, 2.2, 0.035, black, { x: a * 0.55, y: 1.1, z: b * 0.17 }));
    for (let i = 0; i < 4; i++) { sh.add(box(1.15, 0.04, 0.38, rough, { y: 0.3 + i * 0.6 })); sh.add(at(books(406 + i, 2 + i % 3), -0.2, 0.32 + i * 0.6, 0)); }
    sh.add(at(plant(0.3, std({ color: '#3a3a3a' }), greenLeaf, 410), 0.3, 1.52, 0));
    add(at(sh, 2.35, 0, -2.6), 'shelf');
    // Edison bulb pendants
    const ed = new THREE.Group();
    [[-0.45, 0.75], [0, 0.6], [0.45, 0.85]].forEach(([dx, drop]) => {
      ed.add(cyl(0.004, 0.004, drop, black, { x: dx, y: ROOM.h - drop / 2 }), cyl(0.03, 0.03, 0.06, black, { x: dx, y: ROOM.h - drop }));
      ed.add(sph(0.06, glow('#ffb35c', 3.5), { x: dx, y: ROOM.h - drop - 0.08 }), warmLight(dx, ROOM.h - drop - 0.15, 0, 2.2, '#ffb35c'));
    });
    scene.add(at(ed, SX, 0, -0.9));
    // tripod spotlight
    const tri = []; for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI * 2; tri.push(cyl(0.015, 0.012, 1.3, black, { x: Math.cos(a) * 0.2, y: 0.62, z: Math.sin(a) * 0.2, rx: Math.sin(a) * 0.2, rz: -Math.cos(a) * 0.2 })); }
    add(at(group(tri, cyl(0.13, 0.11, 0.3, black, { y: 1.35, rx: 0.9 }), warmLight(0, 1.3, 0.2, 2.5)), -1.95, 0, -2.4), 'lamp');
    scene.add(at(frameArt(T.artIndustrial({ seed: 411 }), 1.05, 0.75, black, 0.03, 0.03), SX, 1.85, ROOM.z0 + 0.06));
    // exposed duct along the ceiling
    scene.add(place(new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 6.4, 24), std({ color: '#9a9ea3', roughness: 0.35, metalness: 0.8 })), { x: 0, y: ROOM.h - 0.3, z: -2.4, rz: Math.PI / 2 }));
    add(at(plant(1.4, std({ color: '#5a5a5a', roughness: 0.8 }), greenLeaf, 412), -2.55, 0, -0.5), 'plant');
  }

  if (style === 'bohemian') {
    const ochre = std({ map: T.fabric('#c48a2a', { seed: 501, amt: 0.12 }), roughness: 0.7 });
    const rat = std({ map: T.rattan(), roughness: 0.8 });
    const pill = ['#c2552c', '#2f6f6a', '#e1a23a', '#8b3a5c', '#f1e4cf', '#d77a54'].map((c) => std({ color: c, roughness: 0.95 }));
    add(at(sofa({ w: 2.4, fab: ochre, legMat: wood([28, 40, 30]), legType: 'turned', legH: 0.1, pillows: pill.slice(0, 5) }), SX, 0, SZ), 'sofa');
    add(at(rug(T.rugBoho({ seed: 502 }), 2.9, 2.3), SX, 0, -1.4, Math.PI / 2), 'rug');
    add(at(group(cyl(0.5, 0.5, 0.05, wood([26, 45, 32]), { y: 0.33 }, 40), cyl(0.38, 0.32, 0.3, rat, { y: 0.15 }), at(vase('#2f6f6a', 0.2), 0.1, 0.36, 0), at(books(503, 2), -0.22, 0.36, 0.05)), SX, 0, -1.2), 'table');
    add(at(armchair('peacock', { rattan: rat, fab: std({ color: '#f1e4cf', roughness: 1 }), pillow: pill[0] }), 1.6, 0, -0.95, -0.7), 'chair');
    add(at(group(cyl(0.3, 0.3, 0.32, std({ map: T.rugBoho({ seed: 504 }), roughness: 0.95 }), { y: 0.16 })), 0.75, 0, -0.35), 'pouf');
    // macrame + boho art
    const mac = new THREE.Group(); const cord = std({ color: '#efe3cf', roughness: 1 });
    mac.add(cyl(0.02, 0.02, 0.9, wood([28, 40, 40]), { rz: Math.PI / 2 }));
    for (let i = 0; i < 14; i++) { const len = 0.5 + Math.sin(i / 13 * Math.PI) * 0.5; mac.add(cyl(0.008, 0.008, len, cord, { x: -0.4 + i * 0.062, y: -len / 2 })); }
    scene.add(at(mac, SX + 0.75, 2.3, ROOM.z0 + 0.06));
    scene.add(at(frameArt(T.artBoho({ seed: 505 }), 0.7, 0.92, wood([28, 40, 40]), 0.03, 0.03), SX - 0.55, 1.85, ROOM.z0 + 0.06));
    // rattan sphere pendant
    scene.add(at(group(cyl(0.005, 0.005, 0.5, std({ color: '#6b4a2e' }), { y: ROOM.h - 0.25 }), sph(0.32, std({ map: T.rattan({ rx: 6, ry: 3 }), roughness: 0.8, emissive: '#ffb86b', emissiveIntensity: 0.25 }), { y: ROOM.h - 0.8 }), warmLight(0, ROOM.h - 0.9, 0, 5, '#ffbf7a')), SX, 0, -0.9));
    add(at(plant(1.9, std({ color: '#c2552c', roughness: 0.7 }), greenLeaf, 506), 2.35, 0, -2.45), 'plant');
    add(at(plant(1.0, std({ color: '#e1a23a', roughness: 0.7 }), greenLeaf, 507, 'snake'), -2.55, 0, -0.5), 'plant2');
    scene.add(at(hangingPlant(std({ color: '#f1e4cf', roughness: 0.8 }), greenLeaf, 508), -2.45, 2.1, -2.5));
    scene.add(at(hangingPlant(std({ color: '#c2552c', roughness: 0.8 }), greenLeaf, 509), 1.3, 2.15, -2.6));
    add(at(group(cyl(0.012, 0.012, 1.5, wood([28, 40, 30]), { y: 0.75 }), cyl(0.12, 0.3, 0.45, std({ map: T.rattan({ rx: 4, ry: 2 }), roughness: 0.8, emissive: '#ffb86b', emissiveIntensity: 0.3, side: THREE.DoubleSide }), { y: 1.5 }), warmLight(0, 1.45, 0, 3, '#ffbf7a')), -1.95, 0, -2.4), 'lamp');
    const lin = std({ color: '#f3e7d3', roughness: 1, transparent: true, opacity: 0.85, side: THREE.DoubleSide });
    scene.add(place(curtain(0.8, 2.85, lin, 8), { x: ROOM.x0 + 0.12, y: 1.45, z: WIN.z0 - 0.15, ry: Math.PI / 2 }));
    scene.add(place(curtain(0.8, 2.85, lin, 8), { x: ROOM.x0 + 0.12, y: 1.45, z: WIN.z1 + 0.25, ry: Math.PI / 2 }));
  }

  lights(scene, { sun: cfg.sun, ...(style === 'traditional' ? { hemi: 0.45, fill: 12 } : {}) });
  scene.userData.items = items;
  return scene;
}

// ------------------------------------------------------------------ empty "before" room
export function buildEmpty() {
  const scene = new THREE.Scene();
  scene.add(shell({
    wall: std({ map: T.concrete(74, { seed: 601, rx: 1, ry: 1, h: 30, s: 3 }), roughness: 1 }),
    floor: std({ map: T.concrete(55, { seed: 602, rx: 2, ry: 2 }), roughness: 0.9 }),
    ceiling: std({ color: '#d9d6d0', roughness: 1 }), frame: std({ color: '#7a7a7a', roughness: 0.6 }), sky: '#e9eef2', baseboard: false,
  }));
  const ply = std({ color: '#c6a678', roughness: 0.85 });
  // stacked boxes, ladder, paint buckets, bare bulb
  scene.add(box(0.6, 0.45, 0.5, std({ color: '#b08a5a', roughness: 0.95 }), { x: 0.9, y: 0.225, z: -2.4, ry: 0.2 }), box(0.5, 0.35, 0.45, std({ color: '#a77f50', roughness: 0.95 }), { x: 0.85, y: 0.62, z: -2.4, ry: -0.1 }), box(0.55, 0.4, 0.5, std({ color: '#b8925f', roughness: 0.95 }), { x: 1.5, y: 0.2, z: -2.2, ry: -0.3 }));
  const lad = new THREE.Group();
  for (const s of [-1, 1]) lad.add(box(0.05, 2.0, 0.07, ply, { x: s * 0.25, y: 1.0, z: 0.25, rx: -0.15 }), box(0.05, 2.0, 0.07, ply, { x: s * 0.25, y: 1.0, z: -0.25, rx: 0.15 }));
  for (let i = 0; i < 5; i++) lad.add(box(0.5, 0.03, 0.12, ply, { y: 0.35 + i * 0.35, z: 0.25 - i * 0.05 }));
  scene.add(at(lad, -0.6, 0, -2.2, 0.4));
  for (const [x, z, c] of [[-1.6, -1.6, '#e8e4dc'], [-1.35, -1.75, '#d0d5d8']]) scene.add(cyl(0.15, 0.13, 0.32, std({ color: c, roughness: 0.5 }), { x, y: 0.16, z }));
  scene.add(cyl(0.004, 0.004, 0.6, std({ color: '#222' }), { x: -0.2, y: ROOM.h - 0.3, z: -1.2 }), sph(0.05, glow('#fff6e6', 2.5), { x: -0.2, y: ROOM.h - 0.65, z: -1.2 }));
  lights(scene, { sun: 2.0, sunColor: '#f2f4f8', hemi: 0.6, hemiSky: '#eef2f6', fill: 10 });
  return scene;
}

// ------------------------------------------------------------------ bedroom (residential)
export function buildBedroom() {
  const scene = new THREE.Scene();
  scene.add(shell({ wall: std({ map: T.plaster('#e9e2d8', { seed: 701 }), roughness: 0.95 }), floor: std({ map: T.woodPlanks([30, 30, 58], { planks: 6, seed: 702, rx: 6, ry: 3 }), roughness: 0.5 }), sky: '#fff1dc', frame: std({ color: '#2b2b2b' }) }));
  const walnut = std({ color: '#5a3b26', roughness: 0.5 });
  const pan = new THREE.Group();
  for (let i = 0; i < 5; i++) pan.add(rbox(0.5, 1.25, 0.1, 0.04, std({ map: T.fabric('#bfae98', { seed: 703 + i }), roughness: 0.95 }), { x: -1.04 + i * 0.52, y: 1.05, z: ROOM.z0 + 0.08 }));
  pan.add(box(3.6, 2.95, 0.04, walnut, { y: 1.475, z: ROOM.z0 + 0.02 }));
  pan.add(box(3.6, 0.03, 0.08, glow('#ffd9a0', 1.4), { y: 1.72, z: ROOM.z0 + 0.06 }));
  scene.add(at(pan, -0.25, 0, 0));
  const bed = new THREE.Group();
  bed.add(rbox(2.0, 0.3, 2.15, 0.03, walnut, { y: 0.15 }), rbox(1.9, 0.24, 2.05, 0.08, std({ color: '#f6f3ee', roughness: 1 }), { y: 0.42 }));
  bed.add(rbox(1.98, 0.12, 1.45, 0.06, std({ map: T.fabric('#d8c9b5', { seed: 704 }), roughness: 1 }), { y: 0.56, z: 0.32 }));
  bed.add(rbox(2.02, 0.06, 0.5, 0.03, std({ map: T.fabric('#8a6a52', { seed: 705 }), roughness: 1 }), { y: 0.6, z: 0.7 }));
  for (const [x, c] of [[-0.5, '#f8f6f2'], [0.5, '#f8f6f2'], [-0.32, '#b8a58c'], [0.32, '#b8a58c']]) bed.add(rbox(0.6, 0.38, 0.14, 0.07, std({ color: c, roughness: 1 }), { x, y: 0.72, z: -0.82 + (c === '#b8a58c' ? 0.14 : 0), rx: -0.25 }));
  scene.add(at(item(bed, 'bed'), -0.25, 0, -1.92));
  for (const s of [-1, 1]) {
    const nt = group(rbox(0.5, 0.45, 0.42, 0.02, walnut, { y: 0.32 }), box(0.46, 0.02, 0.4, std({ color: '#c9a050', metalness: 0.9, roughness: 0.3 }), { y: 0.1 }), cyl(0.09, 0.11, 0.3, std({ color: '#efe9df', emissive: '#ffd9a0', emissiveIntensity: 0.5 }), { y: 0.72 }), warmLight(0, 0.75, 0.2, 2));
    scene.add(at(nt, -0.25 + s * 1.33, 0, -2.6));
  }
  scene.add(at(rug(T.rugModern({ seed: 706, base: '#cbbfae', border: '#a89782' }), 3.0, 2.0), -0.25, 0, -1.2));
  scene.add(at(plant(1.5, std({ color: '#efe9df' }), std({ color: '#4a8a4f', roughness: 0.7 }), 707), 2.3, 0, -2.3));
  const sheer = std({ color: '#f7f3ec', roughness: 1, transparent: true, opacity: 0.8, side: THREE.DoubleSide });
  scene.add(place(curtain(0.9, 2.85, sheer, 9), { x: ROOM.x0 + 0.12, y: 1.45, z: WIN.z0 - 0.15, ry: Math.PI / 2 }));
  scene.add(box(ROOM.x1 - ROOM.x0, 0.04, 0.05, glow('#ffe1b0', 1.2), { x: 0, y: ROOM.h - 0.08, z: ROOM.z0 + 0.05, cast: false }));
  lights(scene, { sun: 3.0 });
  return scene;
}

// ------------------------------------------------------------------ office (commercial)
export function buildOffice() {
  const scene = new THREE.Scene();
  scene.add(shell({ wall: std({ map: T.plaster('#e6e8e8', { seed: 801 }), roughness: 0.95 }), back: std({ color: '#33473f', roughness: 0.9 }), floor: std({ map: T.concrete(62, { seed: 802, rx: 2, ry: 2, h: 210, s: 4 }), roughness: 0.6 }), sky: '#f4f8ff', frame: std({ color: '#222' }) }));
  const oak = std({ color: '#c49a6c', roughness: 0.5 });
  const white = std({ color: '#f3f3f1', roughness: 0.4 });
  const black = std({ color: '#1e1e1e', roughness: 0.4, metalness: 0.5 });
  // acoustic slat wall + logo
  for (let i = 0; i < 26; i++) scene.add(box(0.07, 2.2, 0.06, oak, { x: -2.6 + i * 0.12, y: 1.4, z: ROOM.z0 + 0.04 }));
  scene.add(at(place(new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.35), std({ map: T.logoWall('STUDIO'), roughness: 0.6 })), {}), 1.6, 1.9, ROOM.z0 + 0.03));
  // long desk with 4 workstations
  const desk = new THREE.Group();
  desk.add(box(3.4, 0.04, 1.4, white, { y: 0.74 }));
  for (const x of [-1.6, 1.6]) desk.add(box(0.05, 0.72, 1.3, black, { x, y: 0.36 }));
  desk.add(box(3.3, 0.35, 0.03, std({ color: '#5f7a6e', roughness: 0.95 }), { y: 0.93 }));
  [[-0.8, -0.35, 0], [0.8, -0.35, 0], [-0.8, 0.35, Math.PI], [0.8, 0.35, Math.PI]].forEach(([x, z, ry], i) => {
    const mon = group(box(0.62, 0.38, 0.03, black, { y: 1.1 }), place(new THREE.Mesh(new THREE.PlaneGeometry(0.58, 0.34), std({ map: T.screenTex({ seed: 810 + i }), emissive: '#ffffff', emissiveMap: T.screenTex({ seed: 810 + i }), emissiveIntensity: 1.6 })), { y: 1.1, z: 0.017, cast: false }), box(0.04, 0.2, 0.04, black, { y: 0.86 }));
    desk.add(at(mon, x, 0, z * 0.6, ry));
    const ch = group(rbox(0.5, 0.08, 0.48, 0.03, std({ color: '#2b2b2b', roughness: 0.8 }), { y: 0.47 }), rbox(0.48, 0.55, 0.06, 0.03, std({ color: '#2b2b2b', roughness: 0.8 }), { y: 0.8, z: -0.24 }), cyl(0.025, 0.025, 0.4, black, { y: 0.25 }),
      [0, 1, 2, 3, 4].map((k) => box(0.3, 0.03, 0.04, black, { x: Math.cos(k * 1.256) * 0.15, y: 0.04, z: Math.sin(k * 1.256) * 0.15, ry: -k * 1.256 })));
    desk.add(at(ch, x, 0, z * 2.2, ry + Math.PI));
  });
  scene.add(at(item(desk, 'desk'), -0.1, 0, -1.4));
  // linear pendants
  for (const z of [-1.7, -1.1]) scene.add(box(2.6, 0.05, 0.08, glow('#fff4e6', 1.6), { x: -0.1, y: ROOM.h - 0.6, z }), cyl(0.004, 0.004, 0.6, black, { x: -1.2, y: ROOM.h - 0.3, z }), cyl(0.004, 0.004, 0.6, black, { x: 1.0, y: ROOM.h - 0.3, z }));
  scene.add(warmLight(-0.1, 2.2, -1.4, 6, '#fff1dc', 8));
  scene.add(at(plant(1.6, white, std({ color: '#4a8a4f', roughness: 0.7 }), 820), 2.4, 0, -2.4), at(plant(1.2, black, std({ color: '#3f7d45', roughness: 0.7 }), 821, 'snake'), -2.6, 0, -2.5));
  lights(scene, { sun: 3.2 });
  return scene;
}

// ------------------------------------------------------------------ cafe (commercial)
export function buildCafe() {
  const scene = new THREE.Scene();
  scene.add(shell({ wall: std({ map: T.plaster('#ece3d6', { seed: 901 }), roughness: 0.95 }), back: std({ color: '#2f4a40', roughness: 0.9 }), floor: std({ map: T.woodPlanks([28, 35, 42], { planks: 7, seed: 902, rx: 6, ry: 3 }), roughness: 0.5 }), sky: '#fff0d8', frame: std({ color: '#222' }) }));
  const oak = std({ color: '#b98a5a', roughness: 0.55 });
  const brass = std({ color: '#c9a050', roughness: 0.3, metalness: 0.9 });
  const stone = std({ map: T.marble({ seed: 903 }), roughness: 0.2 });
  // back shelving with products + menu board
  scene.add(place(new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.3), std({ map: T.shelfProducts({ seed: 904 }), roughness: 0.8 })), { x: -0.6, y: 1.6, z: ROOM.z0 + 0.02, cast: false }));
  for (let i = 0; i < 4; i++) scene.add(box(2.7, 0.04, 0.3, oak, { x: -0.6, y: 0.98 + i * 0.43, z: ROOM.z0 + 0.15 }));
  scene.add(at(frameArt(T.artIndustrial({ seed: 905 }), 0.9, 0.6, brass, 0.03, 0.03), 1.75, 1.8, ROOM.z0 + 0.04));
  // counter with fluted front
  const counter = new THREE.Group();
  for (let i = 0; i < 28; i++) counter.add(rbox(0.09, 1.0, 0.06, 0.02, oak, { x: -1.35 + i * 0.1, y: 0.5, z: 0.32 }));
  counter.add(box(2.85, 1.0, 0.6, std({ color: '#2a2a2a', roughness: 0.8 }), { y: 0.5 }), box(2.95, 0.05, 0.75, stone, { y: 1.02, z: 0.05 }));
  counter.add(at(group(box(0.4, 0.45, 0.4, std({ color: '#c0c3c6', metalness: 0.8, roughness: 0.3 }), { y: 1.27 })), 0.8, 0, -0.05));
  scene.add(at(item(counter, 'counter'), -0.6, 0, -1.9));
  for (let i = 0; i < 4; i++) scene.add(at(group(cyl(0.17, 0.17, 0.05, std({ color: '#3a2a20', roughness: 0.5 }), { y: 0.75 }), cyl(0.015, 0.015, 0.73, brass, { y: 0.37 }), cyl(0.15, 0.15, 0.02, brass, { y: 0.01 })), -1.6 + i * 0.68, 0, -1.05));
  for (let i = 0; i < 3; i++) scene.add(at(group(cyl(0.004, 0.004, 1.1, std({ color: '#111' }), { y: ROOM.h - 0.55 }), place(new THREE.Mesh(new THREE.SphereGeometry(0.17, 24, 10, 0, Math.PI * 2, 0, Math.PI / 2), brass), { y: ROOM.h - 1.15 }), sph(0.05, glow('#ffd59a', 3), { y: ROOM.h - 1.2 }), warmLight(0, ROOM.h - 1.3, 0, 2.5)), -1.5 + i * 0.9, 0, -1.9));
  // two small tables
  for (const [x, z] of [[1.6, -0.6], [0.4, 0.4]]) {
    scene.add(at(group(cyl(0.38, 0.38, 0.03, stone, { y: 0.74 }, 36), cyl(0.03, 0.03, 0.72, brass, { y: 0.36 }), cyl(0.2, 0.2, 0.02, brass, { y: 0.01 })), x, 0, z));
    for (const s of [-1, 1]) scene.add(at(group(rbox(0.42, 0.06, 0.42, 0.02, oak, { y: 0.45 }), rbox(0.42, 0.4, 0.04, 0.02, oak, { y: 0.7, z: -0.2 }), [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b]) => cyl(0.015, 0.015, 0.44, std({ color: '#111' }), { x: a * 0.18, y: 0.22, z: b * 0.18 }))), x + s * 0.55, 0, z, s * Math.PI / 2));
  }
  scene.add(at(plant(1.6, std({ color: '#c2552c' }), std({ color: '#4a8a4f', roughness: 0.7 }), 906), 2.4, 0, -2.4));
  lights(scene, { sun: 3.2 });
  return scene;
}

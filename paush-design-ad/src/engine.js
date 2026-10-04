// Renderer + scene registry + camera helpers shared by the ad.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { buildLiving, buildEmpty, buildBedroom, buildOffice, buildCafe } from './rooms.js';

export const W = 1080, H = 1920;
export let renderer, camera, scenes = {};

export function init(canvas) {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1); renderer.setSize(W, H, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.92;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const pm = new THREE.PMREMGenerator(renderer);
  const env = pm.fromScene(new RoomEnvironment(), 0.04).texture;
  const make = { modern: () => buildLiving('modern'), traditional: () => buildLiving('traditional'), scandinavian: () => buildLiving('scandinavian'),
    industrial: () => buildLiving('industrial'), bohemian: () => buildLiving('bohemian'), empty: buildEmpty, bedroom: buildBedroom, office: buildOffice, cafe: buildCafe };
  for (const k in make) { const s = make[k](); s.environment = env; s.environmentIntensity = k === 'empty' ? 0.45 : 0.3; s.background = new THREE.Color('#111'); scenes[k] = s; }
  camera = new THREE.PerspectiveCamera(60, W / H, 0.05, 60);
}

// cam: {p:[x,y,z], t:[x,y,z], fov}
export function setCam(c) {
  camera.position.set(...c.p); camera.lookAt(...c.t);
  if (c.fov && camera.fov !== c.fov) { camera.fov = c.fov; camera.updateProjectionMatrix(); }
  if (c.up) camera.up.set(...c.up); else camera.up.set(0, 1, 0);
  camera.lookAt(...c.t);
}
export function lerpCam(a, b, k) {
  const L = (x, y) => x.map((v, i) => v + (y[i] - v) * k);
  return { p: L(a.p, b.p), t: L(a.t, b.t), fov: (a.fov || 60) + ((b.fov || 60) - (a.fov || 60)) * k };
}
export function render(name) { renderer.setScissorTest(false); renderer.render(scenes[name], camera); }
// vertical split: left part shows `left`, right part shows `right`; split in px from the left edge
export function renderSplit(left, right, splitPx) {
  const s = Math.round(Math.max(0, Math.min(W, splitPx)));
  renderer.setScissorTest(true);
  renderer.setViewport(0, 0, W, H);
  if (s > 0) { renderer.setScissor(0, 0, s, H); renderer.render(scenes[left], camera); }
  if (s < W) { renderer.setScissor(s, 0, W - s, H); renderer.render(scenes[right], camera); }
  renderer.setScissorTest(false);
}
export function project(x, y, z) { const v = new THREE.Vector3(x, y, z).project(camera); return [(v.x + 1) / 2 * W, (1 - v.y) / 2 * H]; }
export { THREE };

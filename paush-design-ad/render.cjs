// Renders ad.html (Three.js + HTML overlays) frame by frame and pipes frames to ffmpeg.
//   node render.cjs                         -> output/video_silent.mp4 + output/sfx_cues.json
//   node render.cjs --stills 0,5,10         -> output/stills/t_<sec>.png
//   node render.cjs --timeline x.json --out output/x.mp4
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const fs = require('fs'), path = require('path');
const serve = require('./serve.cjs');
const ROOT = __dirname, FPS = 30;
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };

(async () => {
  const tl = JSON.parse(fs.readFileSync(path.resolve(ROOT, opt('--timeline', 'timeline.json')), 'utf8'));
  const outPath = path.resolve(ROOT, opt('--out', 'output/video_silent.mp4'));
  const srv = await serve(ROOT);
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--font-render-hinting=none'] });
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => console.log('[page error]', e.message));
  await page.goto(`http://127.0.0.1:${srv.address().port}/ad.html`, { waitUntil: 'domcontentloaded', timeout: 180000 });
  await page.waitForFunction(() => window.READY === true, null, { timeout: 180000 });
  await page.evaluate((t) => window.setTimeline(t), tl);
  fs.mkdirSync(path.join(ROOT, 'output'), { recursive: true });
  const stills = opt('--stills', null);
  if (stills) {
    const dir = path.join(ROOT, 'output', 'stills'); fs.mkdirSync(dir, { recursive: true });
    for (const s of stills.split(',').map(Number)) {
      await page.evaluate((t) => window.renderFrame(t), s);
      await page.screenshot({ path: path.join(dir, `t_${s.toFixed(2)}.png`) });
    }
    await browser.close(); srv.close(); console.log('stills ->', dir); return;
  }
  fs.writeFileSync(path.join(ROOT, 'output', 'sfx_cues.json'), JSON.stringify({ end: tl.end, cues: await page.evaluate(() => window.getCues()) }, null, 1));
  const total = Math.round(tl.end * FPS);
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-r', String(FPS), '-movflags', '+faststart', outPath], { stdio: ['pipe', 'inherit', 'inherit'] });
  const t0 = Date.now();
  for (let f = 0; f < total; f++) {
    await page.evaluate((t) => window.renderFrame(t), f / FPS);
    const buf = await page.screenshot({ type: 'jpeg', quality: 94 });
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
    if (f % 60 === 0) console.log(`frame ${f}/${total}  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  }
  ff.stdin.end(); await new Promise((r) => ff.on('close', r));
  await browser.close(); srv.close(); console.log('wrote', outPath);
})();

// Renders ad.html frame-by-frame with headless Chromium and pipes frames into ffmpeg.
//   node render.cjs                      -> output/video_silent.mp4 + output/sfx_cues.json
//   node render.cjs --stills 0,4.5,10    -> output/stills/t_<sec>.png (for quick review)
//   node render.cjs --timeline other.json
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const FPS = 30;
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const timelinePath = path.resolve(ROOT, opt('--timeline', 'timeline.json'));
const outPath = path.resolve(ROOT, opt('--out', 'output/video_silent.mp4'));
const stills = opt('--stills', null);

(async () => {
  const tl = JSON.parse(fs.readFileSync(timelinePath, 'utf8'));
  const browser = await chromium.launch({ args: ['--font-render-hinting=none', '--disable-lcd-text'] });
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  await page.goto('file://' + path.join(ROOT, 'ad.html'));
  await page.waitForFunction(() => window.READY === true, null, { timeout: 60000 });
  await page.evaluate((t) => window.setTimeline(t), tl);
  fs.mkdirSync(path.join(ROOT, 'output'), { recursive: true });

  if (stills) {
    const dir = path.join(ROOT, 'output', 'stills');
    fs.mkdirSync(dir, { recursive: true });
    for (const s of stills.split(',').map(Number)) {
      await page.evaluate((t) => window.render(t), s);
      await page.screenshot({ path: path.join(dir, `t_${s.toFixed(2)}.png`) });
    }
    await browser.close();
    console.log('stills written to', dir);
    return;
  }

  const cues = await page.evaluate(() => window.getCues());
  fs.writeFileSync(path.join(ROOT, 'output', 'sfx_cues.json'), JSON.stringify({ end: tl.end, cues }, null, 1));

  const total = Math.round(tl.end * FPS);
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-r', String(FPS), '-movflags', '+faststart', outPath],
    { stdio: ['pipe', 'inherit', 'inherit'] });
  const t0 = Date.now();
  for (let f = 0; f < total; f++) {
    await page.evaluate((t) => window.render(t), f / FPS);
    const buf = await page.screenshot({ type: 'jpeg', quality: 95 });
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
    if (f % 150 === 0) console.log(`frame ${f}/${total}  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  }
  ff.stdin.end();
  await new Promise((r) => ff.on('close', r));
  await browser.close();
  console.log('wrote', outPath);
})();

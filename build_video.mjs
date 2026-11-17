// build_video.mjs
// Zero-npm-dependency Headless Chrome CDP + FFmpeg verifier, 48kHz soundtrack builder,
// keyframe inspector, and multi-tab parallel 9:16 (1080x1920 @ 30fps) MP4 renderer.

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, 'out');
const KEYFRAME_DIR = path.join(OUT_DIR, 'keyframes');
const FRAMES_DIR = path.join(OUT_DIR, 'frames_jpg');

function resolveChromeBin() {
  if (process.env.CHROME_BIN) return process.env.CHROME_BIN;
  const candidates =
    process.platform === 'darwin'
      ? [
          '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
          '/Applications/Chromium.app/Contents/MacOS/Chromium',
        ]
      : process.platform === 'win32'
        ? [
            'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
            'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
          ]
        : [
            '/usr/bin/google-chrome',
            '/usr/bin/google-chrome-stable',
            '/usr/bin/chromium',
            '/usr/bin/chromium-browser',
          ];
  for (const bin of candidates) {
    if (fs.existsSync(bin)) return bin;
  }
  return candidates[0];
}

const CHROME_BIN = resolveChromeBin();
const TOTAL_SIM_SEC = 137.0;
const PLAYBACK_SPEED = 1.50;
const REAL_SEC = TOTAL_SIM_SEC / PLAYBACK_SPEED; // 91.333333s
const FPS = 30;
const TOTAL_FRAMES = Math.round(REAL_SEC * FPS); // 2740 frames

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.wav': 'audio/wav',
  '.mp4': 'video/mp4',
};

function startStaticServer(rootDir) {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      try {
        const cleanUrl = decodeURIComponent((req.url || '/').split('?')[0]);
        const relPath = cleanUrl === '/' ? '/index.html' : cleanUrl;
        const absPath = path.resolve(rootDir, '.' + relPath);
        if (!absPath.startsWith(rootDir)) {
          res.writeHead(403);
          res.end('Forbidden');
          return;
        }
        if (!fs.existsSync(absPath) || fs.statSync(absPath).isDirectory()) {
          res.writeHead(404);
          res.end('Not found');
          return;
        }
        const ext = path.extname(absPath).toLowerCase();
        res.writeHead(200, {
          'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
          'Cache-Control': 'no-cache',
        });
        fs.createReadStream(absPath).pipe(res);
      } catch (err) {
        res.writeHead(500);
        res.end(String(err));
      }
    });
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      resolve({ server, port: addr.port, baseUrl: `http://127.0.0.1:${addr.port}` });
    });
  });
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
}

async function launchChrome(debugPort = 0) {
  const userDataDir = path.join(OUT_DIR, `chrome_profile_${process.pid}`);
  fs.mkdirSync(userDataDir, { recursive: true });

  const args = [
    '--headless=new',
    `--remote-debugging-port=${debugPort}`,
    `--user-data-dir=${userDataDir}`,
    '--window-size=1080,1920',
    '--hide-scrollbars',
    '--mute-audio',
    '--autoplay-policy=no-user-gesture-required',
    '--enable-webgl',
    '--ignore-gpu-blocklist',
    '--disable-background-timer-throttling',
    '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows',
    '--no-first-run',
    '--no-default-browser-check',
    'about:blank',
  ];

  if (!fs.existsSync(CHROME_BIN)) {
    throw new Error(
      `Chrome executable not found at "${CHROME_BIN}". Please install Google Chrome or set CHROME_BIN=/path/to/chrome.`
    );
  }

  const proc = spawn(CHROME_BIN, args, { stdio: ['ignore', 'pipe', 'pipe'] });
  let wsEndpoint = null;

  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Timed out waiting for Chrome DevTools endpoint')), 15000);
    let stderrBuf = '';
    proc.once('error', (err) => {
      clearTimeout(timeout);
      reject(new Error(`Failed to spawn Chrome ("${CHROME_BIN}"): ${err.message}`));
    });
    proc.stderr.on('data', (chunk) => {
      stderrBuf += chunk.toString();
      const m = stderrBuf.match(/DevTools listening on (ws:\/\/127\.0\.0\.1:\d+\/devtools\/browser\/[^\s]+)/);
      if (m) {
        wsEndpoint = m[1];
        clearTimeout(timeout);
        resolve();
      }
    });
    proc.on('exit', (code) => {
      clearTimeout(timeout);
      reject(new Error(`Chrome exited early (${code}): ${stderrBuf}`));
    });
  });

  const portMatch = wsEndpoint.match(/127\.0\.0\.1:(\d+)/);
  const actualPort = Number(portMatch[1]);

  return {
    proc,
    port: actualPort,
    wsEndpoint,
    async close() {
      try {
        proc.kill('SIGTERM');
      } catch (_e) {}
      await sleep(250);
      try {
        fs.rmSync(userDataDir, { recursive: true, force: true });
      } catch (_e) {}
    },
  };
}

class CDPSession {
  constructor(wsUrl, label = 'tab') {
    this.wsUrl = wsUrl;
    this.label = label;
    this.ws = null;
    this.nextId = 1;
    this.pending = new Map();
    this.errors = [];
  }

  async connect() {
    this.ws = new WebSocket(this.wsUrl);
    await new Promise((resolve, reject) => {
      this.ws.addEventListener('open', () => resolve(), { once: true });
      this.ws.addEventListener('error', (e) => reject(e), { once: true });
    });

    this.ws.addEventListener('message', (ev) => {
      const msg = JSON.parse(typeof ev.data === 'string' ? ev.data : ev.data.toString());
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(`${msg.error.message} (${JSON.stringify(msg.error)})`));
        else resolve(msg.result);
      } else if (msg.method === 'Runtime.exceptionThrown') {
        const d = msg.params?.exceptionDetails;
        const txt = `${d?.text || 'Exception'}: ${d?.exception?.description || ''} @ ${d?.url}:${d?.lineNumber}`;
        this.errors.push(txt);
        console.error(`[${this.label} EXCEPTION]`, txt);
      } else if (msg.method === 'Runtime.consoleAPICalled' && msg.params?.type === 'error') {
        const argsTxt = (msg.params.args || []).map((a) => a.value ?? a.description ?? '').join(' ');
        this.errors.push(argsTxt);
        console.error(`[${this.label} CONSOLE.ERROR]`, argsTxt);
      }
    });

    await this.send('Page.enable');
    await this.send('Runtime.enable');
  }

  send(method, params = {}) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async eval(expression, awaitPromise = true) {
    const res = await this.send('Runtime.evaluate', {
      expression,
      awaitPromise,
      returnByValue: true,
    });
    if (res.exceptionDetails) {
      throw new Error(
        `Eval exception: ${res.exceptionDetails.text} ${res.exceptionDetails.exception?.description || ''}`
      );
    }
    return res.result?.value;
  }

  async navigateAndWaitReady(url) {
    await this.send('Emulation.setDeviceMetricsOverride', {
      width: 1080,
      height: 1920,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await this.send('Page.navigate', { url });
    for (let i = 0; i < 200; i++) {
      if (this.errors.length > 0) {
        throw new Error(`Page threw JS errors during boot:\n${this.errors.join('\n')}`);
      }
      const ready = await this.eval('Boolean(window.__PELICAN_READY__)', false).catch(() => false);
      if (ready) return;
      await sleep(100);
    }
    throw new Error(`Timed out waiting for __PELICAN_READY__ on ${url}`);
  }

  close() {
    try {
      this.ws?.close();
    } catch (_e) {}
  }
}

async function openNewTabSession(chromePort, url, label) {
  const res = await fetch(`http://127.0.0.1:${chromePort}/json/new?${encodeURIComponent('about:blank')}`, {
    method: 'PUT',
  });
  if (!res.ok) throw new Error(`Failed to open new tab: HTTP ${res.status}`);
  const target = await res.json();
  const cdp = new CDPSession(target.webSocketDebuggerUrl, label);
  await cdp.connect();
  await cdp.navigateAndWaitReady(url);
  return { cdp, targetId: target.id };
}

async function exportSyncedSoundtrack(cdp) {
  const rawWavPath = path.join(OUT_DIR, 'raw_137s_48k.wav');
  const outWavPath = path.join(OUT_DIR, 'naiwa_soundtrack_48k.wav');

  if (fs.existsSync(outWavPath) && fs.statSync(outWavPath).size > 8_000_000) {
    console.log(`[audio] Reusing existing synced 48kHz soundtrack: ${outWavPath}`);
    return outWavPath;
  }

  console.log('[audio] Synthesizing 137.0s 48kHz stereo master soundtrack in WebAudio...');
  const meta = await cdp.eval('window.__pelicanPrepareMasterWav(48000, false)', true);
  console.log(
    `[audio] Master rendered in ${meta.renderMs.toFixed(0)}ms (${meta.durationSec.toFixed(2)}s, ${meta.byteLength} bytes)`
  );

  const fullBuf = Buffer.alloc(meta.byteLength);
  const chunkSize = 512 * 1024;
  for (let off = 0; off < meta.byteLength; off += chunkSize) {
    const b64 = await cdp.eval(`window.__pelicanReadMasterWavChunk(${off}, ${chunkSize})`, false);
    const chunk = Buffer.from(b64, 'base64');
    chunk.copy(fullBuf, off);
  }
  fs.writeFileSync(rawWavPath, fullBuf);

  const laughVoicePath = path.join(__dirname, 'assets', 'panels', 'naiwa_laugh_voice.wav');
  if (fs.existsSync(laughVoicePath)) {
    console.log('[audio] Time-scaling soundtrack (atempo=1.50) & mixing original Naiwa belly-laugh audio at 85.85s...');
    execFileSync(
      'ffmpeg',
      [
        '-y',
        '-i',
        rawWavPath,
        '-i',
        laughVoicePath,
        '-filter_complex',
        '[0:a]atempo=1.50[base];[1:a]adelay=85850|85850[laugh];[base][laugh]amix=inputs=2:duration=first:dropout_transition=0:normalize=0,alimiter=limit=0.89125:level=false[out]',
        '-map',
        '[out]',
        '-ar',
        '48000',
        '-ac',
        '2',
        '-c:a',
        'pcm_s16le',
        outWavPath,
      ],
      { stdio: 'inherit' }
    );
  } else {
    console.log('[audio] Time-scaling soundtrack cleanly via FFmpeg pitch-preserving atempo=1.50 -> 91.333s...');
    execFileSync(
      'ffmpeg',
      ['-y', '-i', rawWavPath, '-af', 'atempo=1.50', '-ar', '48000', '-c:a', 'pcm_s16le', outWavPath],
      { stdio: 'inherit' }
    );
  }

  return outWavPath;
}

const VERIFY_KEYFRAMES = [
  { name: '00_intro_3.5s', simT: 3.5 },
  { name: '01_sahara_cave_8.0s', simT: 8.0 },
  { name: '02_egypt_cartouche_13.8s', simT: 13.8 },
  { name: '03_han_rubbing_20.0s', simT: 20.0 },
  { name: '04_tang_apsaras_26.2s', simT: 26.2 },
  { name: '05_song_macro_zoom_31.8s', simT: 31.8 },
  { name: '06_qingming_bridge_38.0s', simT: 38.0 },
  { name: '07_maya_codex_44.0s', simT: 44.0 },
  { name: '08_mughal_miniature_50.0s', simT: 50.0 },
  { name: '09_bada_eyeroll_56.0s', simT: 56.0 },
  { name: '10_wayang_kulit_61.8s', simT: 61.8 },
  { name: '11_ukiyoe_wave_68.0s', simT: 68.0 },
  { name: '12_starry_night_74.0s', simT: 74.0 },
  { name: '13_scream_abstract_80.0s', simT: 80.0 },
  { name: '14_nosferatu_shadow_86.0s', simT: 86.0 },
  { name: '15_oscilloscope_90.6s', simT: 90.6 },
  { name: '16_8bit_famicom_98.0s', simT: 98.0 },
  { name: '17_win2000_buzz_103.08s', simT: 103.08 },
  { name: '17_win2000_chat_104.0s', simT: 104.0 },
  { name: '18_vaporwave_neon_110.0s', simT: 110.0 },
  { name: '19_shortvideo_fullscreen_116.0s', simT: 116.0 },
  { name: '20_code_art_121.5s', simT: 121.5 },
  { name: '21a_outro_3x7_wall_127.5s', simT: 127.5 },
  { name: '21a_outro_3x7_wall_128.4s', simT: 128.4 },
  { name: '21b_press_belly_laugh_132.2s', simT: 132.2 },
  { name: '21c_press_corridor_bell_136.02s', simT: 136.02 },
];

async function captureVerifyKeyframes(cdp) {
  fs.mkdirSync(KEYFRAME_DIR, { recursive: true });
  console.log(`[verify] Rendering ${VERIFY_KEYFRAMES.length} 1080x1920 PNG keyframes...`);
  for (const kf of VERIFY_KEYFRAMES) {
    const b64 = await cdp.eval(`window.captureFrameAt(${kf.simT}, 'image/png')`, true);
    if (cdp.errors.length > 0) {
      throw new Error(`Errors while rendering ${kf.name} (t=${kf.simT}):\n${cdp.errors.join('\n')}`);
    }
    const outPath = path.join(KEYFRAME_DIR, `${kf.name}.png`);
    fs.writeFileSync(outPath, Buffer.from(b64, 'base64'));
    console.log(`  ✓ ${kf.name}.png (simT=${kf.simT}s)`);
  }
}

async function renderFullVideo(chromePort, renderUrl, wavPath) {
  fs.mkdirSync(FRAMES_DIR, { recursive: true });
  const workersCount = 6;
  console.log(
    `[render] Launching ${workersCount} parallel headless WebGL workers for ${TOTAL_FRAMES} frames (1080x1920 @ ${FPS}fps)...`
  );

  const sessions = [];
  for (let w = 0; w < workersCount; w++) {
    const sess = await openNewTabSession(chromePort, renderUrl, `worker-${w}`);
    sessions.push(sess);
  }

  const tStart = Date.now();
  let completed = 0;
  const perWorker = Math.ceil(TOTAL_FRAMES / workersCount);

  await Promise.all(
    sessions.map(async ({ cdp }, wIdx) => {
      const f0 = wIdx * perWorker;
      const f1 = Math.min(TOTAL_FRAMES, f0 + perWorker);
      for (let f = f0; f < f1; f++) {
        const simT = (f / FPS) * PLAYBACK_SPEED;
        const b64 = await cdp.eval(`window.captureFrameAt(${simT.toFixed(6)}, 'image/jpeg', 0.96)`, true);
        if (cdp.errors.length > 0) {
          throw new Error(`Worker ${wIdx} error at frame ${f} (simT=${simT}):\n${cdp.errors.join('\n')}`);
        }
        const frameFile = path.join(FRAMES_DIR, `frame_${String(f).padStart(5, '0')}.jpg`);
        fs.writeFileSync(frameFile, Buffer.from(b64, 'base64'));
        completed++;
        if (completed % 150 === 0 || completed === TOTAL_FRAMES) {
          const elapsed = (Date.now() - tStart) / 1000;
          const rate = completed / Math.max(0.1, elapsed);
          const eta = (TOTAL_FRAMES - completed) / Math.max(0.1, rate);
          console.log(
            `[render] ${completed}/${TOTAL_FRAMES} frames (${((completed / TOTAL_FRAMES) * 100).toFixed(1)}%) · ${rate.toFixed(1)} fps · ETA ${eta.toFixed(0)}s`
          );
        }
      }
    })
  );

  for (const s of sessions) s.cdp.close();

  const mp4Path = path.join(__dirname, 'nailong_6000yr_bike.mp4');
  console.log(`[mux] Encoding final 1080x1920 H.264 + 48kHz AAC MP4 -> ${mp4Path} ...`);
  execFileSync(
    'ffmpeg',
    [
      '-y',
      '-framerate',
      String(FPS),
      '-i',
      path.join(FRAMES_DIR, 'frame_%05d.jpg'),
      '-i',
      wavPath,
      '-c:v',
      'libx264',
      '-preset',
      'medium',
      '-crf',
      '17',
      '-pix_fmt',
      'yuv420p',
      '-r',
      String(FPS),
      '-c:a',
      'aac',
      '-b:a',
      '192k',
      '-ar',
      '48000',
      '-shortest',
      '-movflags',
      '+faststart',
      mp4Path,
    ],
    { stdio: 'inherit' }
  );

  // Clean up temporary JPEG frame sequence so workspace stays tidy!
  fs.rmSync(FRAMES_DIR, { recursive: true, force: true });
  console.log(`[done] Masterpiece MP4 ready: ${mp4Path}`);
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const doVerify = process.argv.includes('--verify') || !process.argv.includes('--render');
  const doRender = process.argv.includes('--render');

  const { server, baseUrl } = await startStaticServer(__dirname);
  const chrome = await launchChrome(0);

  try {
    const renderUrl = `${baseUrl}/render.html`;
    const mainTab = await openNewTabSession(chrome.port, renderUrl, 'primary');
    const wavPath = await exportSyncedSoundtrack(mainTab.cdp);

    if (doVerify) {
      await captureVerifyKeyframes(mainTab.cdp);
    }
    mainTab.cdp.close();

    if (doRender) {
      await renderFullVideo(chrome.port, renderUrl, wavPath);
    }
  } finally {
    await chrome.close();
    server.close();
  }
}

main().catch((err) => {
  console.error('[FATAL]', err);
  process.exit(1);
});

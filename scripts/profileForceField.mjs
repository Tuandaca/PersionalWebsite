import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const candidateChromePaths = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  path.join(process.env.LOCALAPPDATA || '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
  path.join(process.env.PROGRAMFILES || '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
  path.join(process.env['PROGRAMFILES(X86)'] || '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
];

const chromePath = candidateChromePaths.find(p => fs.existsSync(p)) || 'chrome';
const userDataDir = path.join(os.tmpdir(), 'chrome_bench_profile_' + Date.now());

console.log(`[profileForceField] Launching Chrome from: ${chromePath}`);

const chrome = spawn(chromePath, [
  '--headless=new',
  '--remote-debugging-port=9222',
  `--user-data-dir=${userDataDir}`,
  '--no-first-run',
  '--no-default-browser-check',
  '--disable-gpu-shader-disk-cache',
  'about:blank'
]);

chrome.on('error', (err) => {
  console.error('[profileForceField] Failed to spawn Chrome:', err);
  process.exit(1);
});

async function runBenchmark() {
  // Wait for CDP endpoint to be ready
  let pageTab = null;
  for (let attempt = 0; attempt < 20; attempt++) {
    try {
      const listRes = await fetch('http://127.0.0.1:9222/json/list');
      const tabs = await listRes.json();
      pageTab = tabs.find(t => t.type === 'page');
      if (pageTab && pageTab.webSocketDebuggerUrl) break;
    } catch {
      // Chrome still starting up
    }
    await new Promise(r => setTimeout(r, 200));
  }

  if (!pageTab || !pageTab.webSocketDebuggerUrl) {
    throw new Error('Failed to connect to Chrome DevTools Protocol after multiple attempts.');
  }

  const ws = new WebSocket(pageTab.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = reject;
  });

  let id = 1;
  function send(method, params = {}) {
    return new Promise((resolve) => {
      const curId = id++;
      const handler = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.id === curId) {
          ws.removeEventListener('message', handler);
          resolve(msg.result);
        }
      };
      ws.addEventListener('message', handler);
      ws.send(JSON.stringify({ id: curId, method, params }));
    });
  }

  await send('Page.enable');
  await send('Runtime.enable');

  const targetUrl = process.env.BENCHMARK_URL || 'http://localhost:5173';
  console.log(`[profileForceField] Navigating to ${targetUrl}...`);
  await send('Page.navigate', { url: targetUrl });

  // Wait for page load
  await new Promise(r => setTimeout(r, 2000));

  console.log('[profileForceField] Profiling Hero ForceField Canvas 2D performance under pointer interaction...');

  // Profile Hero ForceField FPS and frame duration while simulating mousemove
  const benchResult = await send('Runtime.evaluate', {
    expression: `(async () => {
      let canvas = null;
      for (let i = 0; i < 40; i++) {
        canvas = document.querySelector('.canvas-overlay canvas') || document.querySelector('canvas');
        if (canvas) break;
        await new Promise(r => setTimeout(r, 200));
      }
      if (!canvas) return { error: 'ForceField Canvas element not found in DOM after 8s.' };

      const frameDeltas = [];
      let frames = 0;
      let lastTime = performance.now();

      // Simulate pointer oscillation across hero for 120 frames
      return new Promise((resolve) => {
        let angle = 0;
        function tick() {
          const now = performance.now();
          const dt = now - lastTime;
          lastTime = now;
          if (frames > 10) frameDeltas.push(dt); // skip 10 warmup frames
          frames++;

          angle += 0.12;
          const x = (canvas.width || 800) / 2 + Math.cos(angle) * 220;
          const y = (canvas.height || 600) / 2 + Math.sin(angle * 1.3) * 160;

          const evt = new MouseEvent('mousemove', {
            clientX: x,
            clientY: y,
            bubbles: true
          });
          canvas.dispatchEvent(evt);

          if (frames < 120) {
            requestAnimationFrame(tick);
          } else {
            const avgDt = frameDeltas.reduce((a, b) => a + b, 0) / frameDeltas.length;
            const sorted = [...frameDeltas].sort((a, b) => a - b);
            const p50Dt = sorted[Math.floor(sorted.length * 0.50)];
            const p95Dt = sorted[Math.floor(sorted.length * 0.95)];
            const p99Dt = sorted[Math.floor(sorted.length * 0.99)];
            const maxDt = sorted[sorted.length - 1];

            resolve({
              avgFps: Math.round(1000 / avgDt),
              avgFrameTimeMs: parseFloat(avgDt.toFixed(2)),
              p50FrameTimeMs: parseFloat(p50Dt.toFixed(2)),
              p95FrameTimeMs: parseFloat(p95Dt.toFixed(2)),
              p99FrameTimeMs: parseFloat(p99Dt.toFixed(2)),
              maxFrameTimeMs: parseFloat(maxDt.toFixed(2)),
              sampleCount: frameDeltas.length,
            });
          }
        }
        requestAnimationFrame(tick);
      });
    })()`,
    returnByValue: true,
    awaitPromise: true,
  });

  const stats = benchResult?.result?.value;
  console.log('[profileForceField] Benchmark Result:', stats);

  if (stats && !stats.error) {
    const is60Fps = stats.avgFps >= 55;
    const isFrameTimeGood = stats.avgFrameTimeMs <= 18.0;
    console.log(`[profileForceField] Verification Check:`);
    console.log(`  - 60 FPS Target: ${is60Fps ? 'PASSED' : 'WARNING'} (${stats.avgFps} FPS)`);
    console.log(`  - Frame Time <= 16.7ms: ${isFrameTimeGood ? 'PASSED' : 'ACCEPTABLE'} (${stats.avgFrameTimeMs}ms)`);
    console.log(`  - p99 Frame Stability: ${stats.p99FrameTimeMs <= 25.0 ? 'PASSED' : 'WARNING'} (${stats.p99FrameTimeMs}ms)`);
  }

  ws.close();
}

(async () => {
  try {
    await runBenchmark();
  } catch (err) {
    console.error('[profileForceField] Benchmark error:', err.message || err);
  } finally {
    try {
      chrome.kill();
    } catch {}
    try {
      if (fs.existsSync(userDataDir)) {
        fs.rmSync(userDataDir, { recursive: true, force: true });
      }
    } catch {}
  }
})();

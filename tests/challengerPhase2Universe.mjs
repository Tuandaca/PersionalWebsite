/**
 * Real browser Galaxy, pointer, viewport, and WebGL draw-call checks.
 * Requires a running Vite server at TARGET_URL.
 */
import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const sceneCode = fs.readFileSync('src/components/DevNetwork/DigitalCoreScene.ts', 'utf-8');
assert.ok(!sceneCode.includes('universeGroup'), 'CSS Galaxy must not add WebGL scene objects');
assert.ok(!sceneCode.includes('AtmosphericPlanets'), 'Planet scene objects must stay removed');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const TARGET_URL = process.env.TARGET_URL || 'http://localhost:5173/';
const USER_DATA_DIR = path.join(os.tmpdir(), `chrome_galaxy_qa_${Date.now()}`);

console.log('GALAXY REAL BROWSER QA');
const chromeProcess = spawn(CHROME_PATH, [
  '--headless=new',
  '--remote-debugging-port=9224',
  `--user-data-dir=${USER_DATA_DIR}`,
  '--no-first-run',
  '--no-default-browser-check',
  '--enable-gpu',
  '--enable-webgl',
  'about:blank',
]);

let ws = null;
let msgId = 1;
const callbacks = new Map();

function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = msgId++;
    callbacks.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
}

async function evaluate(expression) {
  const res = await send('Runtime.evaluate', {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  if (res.exceptionDetails) {
    throw new Error(`Evaluation failed: ${JSON.stringify(res.exceptionDetails)}`);
  }
  return res.result?.value;
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

try {
  // Wait for Chrome CDP
  let target = null;
  for (let i = 0; i < 25; i++) {
    try {
      const res = await fetch('http://127.0.0.1:9224/json/list');
      const tabs = await res.json();
      target = tabs.find((t) => t.type === 'page');
      if (target && target.webSocketDebuggerUrl) break;
    } catch {}
    await sleep(200);
  }

  assert.ok(target, 'Chrome CDP page target found');
  ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve) => {
    ws.addEventListener('open', resolve, { once: true });
  });

  ws.addEventListener('message', (event) => {
    const msg = JSON.parse(event.data.toString());
    if (msg.id && callbacks.has(msg.id)) {
      const { resolve } = callbacks.get(msg.id);
      callbacks.delete(msg.id);
      resolve(msg.result);
    }
  });

  await send('Page.enable');
  await send('Runtime.enable');

  // Navigate to target URL
  // Set standard desktop viewport 1920x1080
  await send('Emulation.setDeviceMetricsOverride', {
    width: 1920,
    height: 1080,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await sleep(500);

  // Navigate to target URL
  await send('Page.navigate', { url: TARGET_URL });
  await sleep(2000);

  const galaxyState = await evaluate(`(() => {
    const root = document.querySelector('.galaxy-background');
    const star = document.querySelector('.galaxy-dust-a circle');
    const band = document.querySelector('.galaxy-band');
    return {
      present: Boolean(root && star && band),
      pointerEvents: root && getComputedStyle(root).pointerEvents,
      starCount: document.querySelectorAll('.galaxy-points circle').length,
      streamCount: document.querySelectorAll('.galaxy-stream circle').length,
      streamAnimation: getComputedStyle(document.querySelector('.galaxy-stream')).animationDuration,
      starRadius: star && star.getAttribute('r'),
      bandAnimation: band && getComputedStyle(band).animationDuration,
      tier: root && root.dataset.quality,
    };
  })()`);
  assert.equal(galaxyState.present, true, 'Galaxy layers must be mounted');
  assert.equal(galaxyState.pointerEvents, 'none', 'Galaxy must be click-through');
  assert.equal(galaxyState.starCount, 120, 'Seeded Galaxy must render 120 round points');
  assert.equal(galaxyState.streamCount, 24, 'Diagonal stream must keep a small round-point budget');
  assert.equal(galaxyState.streamAnimation, '42s', 'Diagonal dust must move slowly');
  assert.equal(galaxyState.starRadius, '0.55', 'Dust points must be tiny circles');
  assert.equal(galaxyState.bandAnimation, '240s', 'Band drift must be slow');
  const streamStart = await evaluate(`(() => {
    const matrix = new DOMMatrixReadOnly(getComputedStyle(document.querySelector('.galaxy-stream')).transform);
    return { x: matrix.m41, y: matrix.m42 };
  })()`);
  await sleep(450);
  const streamEnd = await evaluate(`(() => {
    const matrix = new DOMMatrixReadOnly(getComputedStyle(document.querySelector('.galaxy-stream')).transform);
    return { x: matrix.m41, y: matrix.m42 };
  })()`);
  assert.ok(streamEnd.x < streamStart.x - .5 && streamEnd.y > streamStart.y + .2, 'Dust must drift from upper-right to lower-left');
  console.log('  ✔ Galaxy mounted with painted stars, slow band, and pointer transparency');
  const lowTier = await evaluate(`(() => {
    const root = document.querySelector('.galaxy-background');
    const prior = root.dataset.quality;
    root.dataset.quality = 'low';
    const result = {
      dustB: getComputedStyle(document.querySelector('.galaxy-dust-b')).display,
      bandMotion: getComputedStyle(document.querySelector('.galaxy-band')).animationName,
      starMotion: getComputedStyle(document.querySelector('.galaxy-starfield')).animationName,
      streamMotion: getComputedStyle(document.querySelector('.galaxy-stream')).animationName,
    };
    root.dataset.quality = prior;
    return result;
  })()`);
  assert.deepEqual(lowTier, { dustB: 'none', bandMotion: 'none', starMotion: 'none', streamMotion: 'none' }, 'Low tier must be sparse and static');
  if (process.env.GALAXY_SCREENSHOT) {
    const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    fs.writeFileSync(process.env.GALAXY_SCREENSHOT, Buffer.from(shot.data, 'base64'));
  }

  // 4.1 Pointer Event Transparency Hit-Testing
  console.log('  [4.1] Point-by-point pointer hit testing:');
  const hitTestResult = await evaluate(`
    (() => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const results = [];
      let canvasHitCount = 0;

      // Sample a 5x10 grid of points across entire viewport
      for (let gy = 0.1; gy <= 0.9; gy += 0.2) {
        for (let gx = 0.1; gx <= 0.9; gx += 0.1) {
          const x = Math.round(w * gx);
          const y = Math.round(h * gy);
          const el = document.elementFromPoint(x, y);
          const tag = el ? el.tagName.toLowerCase() : 'none';
          const isCanvasOrWrapper = el && (
            el.tagName.toLowerCase() === 'canvas' ||
            el.classList.contains('pointer-events-none') ||
            el.getAttribute('role') === 'presentation'
          );

          if (isCanvasOrWrapper) {
            canvasHitCount++;
          }
          results.push({ x, y, tag, isCanvasOrWrapper });
        }
      }

      // Check specific interactive elements
      const heroProjectsBtn = document.getElementById('hero-projects-btn');
      let btnHitPass = false;
      if (heroProjectsBtn) {
        heroProjectsBtn.scrollIntoView({ block: 'center' });
        const btnRect = heroProjectsBtn.getBoundingClientRect();
        const topEl = document.elementFromPoint(btnRect.x + btnRect.width / 2, btnRect.y + btnRect.height / 2);
        btnHitPass = Boolean(topEl && (topEl === heroProjectsBtn || heroProjectsBtn.contains(topEl)));
      }

      return {
        totalPoints: results.length,
        canvasHitCount,
        btnHitPass,
      };
    })()
  `);

  console.log(`    Total Tested Coordinates: ${hitTestResult.totalPoints}`);
  console.log(`    Canvas / Wrapper Hit Count: ${hitTestResult.canvasHitCount} (Must be exactly 0)`);
  console.log(`    Hero CTA Button Hit Pass: ${hitTestResult.btnHitPass}`);

  assert.equal(hitTestResult.canvasHitCount, 0, 'Canvas wrapper must intercept exactly 0 pointer events');
  assert.equal(hitTestResult.btnHitPass, true, 'Hero CTA button must directly receive pointer events');
  console.log('  ✔ Pointer transparency verified: 0 dead-zones, canvas wrapper is 100% click-through [PASS]');

  // 4.2 Real WebGL Hardware Draw Calls per Frame
  await evaluate('window.scrollTo(0, 1200)');
  await sleep(600);
  if (process.env.GALAXY_SCREENSHOT) {
    const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    fs.writeFileSync(process.env.GALAXY_SCREENSHOT.replace(/\.png$/i, '-scrolled.png'), Buffer.from(shot.data, 'base64'));
  }
  console.log('  [4.2] Hooking real WebGL context for frame draw calls:');
  const webglStats = await evaluate(`
    (() => {
      const canvas = document.querySelector('canvas[tabindex="-1"]');
      if (!canvas) return { error: 'No canvas' };

      // Sample Three.js render calls from RAF
      // Wrap WebGL draw calls on active gl context
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
      if (!gl) return { error: 'No WebGL context' };

      const origDrawArrays = gl.drawArrays.bind(gl);
      const origDrawElements = gl.drawElements.bind(gl);
      const origDrawElementsInstanced = gl.drawElementsInstanced ? gl.drawElementsInstanced.bind(gl) : null;
      const origDrawArraysInstanced = gl.drawArraysInstanced ? gl.drawArraysInstanced.bind(gl) : null;

      let frameCalls = 0;
      let maxFrameCalls = 0;
      let singleFrameCalls = [];

      gl.drawArrays = function(...args) {
        frameCalls++;
        if (singleFrameCalls.length < 30) singleFrameCalls.push({ type: 'drawArrays', mode: args[0], first: args[1], count: args[2] });
        return origDrawArrays(...args);
      };
      gl.drawElements = function(...args) {
        frameCalls++;
        if (singleFrameCalls.length < 30) singleFrameCalls.push({ type: 'drawElements', mode: args[0], count: args[1], typeArg: args[2] });
        return origDrawElements(...args);
      };
      if (origDrawElementsInstanced) {
        gl.drawElementsInstanced = function(...args) {
          frameCalls++;
          if (singleFrameCalls.length < 30) singleFrameCalls.push({ type: 'drawElementsInstanced', count: args[1], primcount: args[4] });
          return origDrawElementsInstanced(...args);
        };
      }
      if (origDrawArraysInstanced) {
        gl.drawArraysInstanced = function(...args) {
          frameCalls++;
          if (singleFrameCalls.length < 30) singleFrameCalls.push({ type: 'drawArraysInstanced', count: args[2], primcount: args[3] });
          return origDrawArraysInstanced(...args);
        };
      }

      return new Promise((resolve) => {
        let frames = 0;
        let capturedCalls = [];
        const tick = () => {
          frames++;
          if (frames === 5) {
            capturedCalls = [...singleFrameCalls];
          }
          singleFrameCalls = [];
          if (frameCalls > maxFrameCalls) maxFrameCalls = frameCalls;
          frameCalls = 0;

          if (frames < 30) {
            requestAnimationFrame(tick);
          } else {
            // Restore originals
            gl.drawArrays = origDrawArrays;
            gl.drawElements = origDrawElements;
            if (origDrawElementsInstanced) gl.drawElementsInstanced = origDrawElementsInstanced;
            if (origDrawArraysInstanced) gl.drawArraysInstanced = origDrawArraysInstanced;

            resolve({
              framesRecorded: frames,
              maxDrawCallsPerFrame: maxFrameCalls,
              capturedCalls,
            });
          }
        };
        requestAnimationFrame(tick);
      });
    })()
  `);

  assert.ok(!webglStats.error, `WebGL measurement unavailable: ${webglStats.error}`);

  console.log(`    Frames Recorded: ${webglStats.framesRecorded}`);
  console.log(`    Measured WebGL draw calls per frame: ${webglStats.maxDrawCallsPerFrame}`);
  console.log('    Captured Calls details (count: ' + webglStats.capturedCalls.length + '):', JSON.stringify(webglStats.capturedCalls));

  assert.ok(webglStats.maxDrawCallsPerFrame <= 13, 'Core scene must stay within 13 WebGL calls per frame');

  // 4.3 Viewport Container Horizontal Overflow Check across 5 Viewports
  console.log('  [4.3] Real Browser Viewport Horizontal Overflow Check across 5 Viewports:');
  const viewports = [
    { name: 'Desktop (1920x1080)', width: 1920, height: 1080 },
    { name: 'Laptop (1366x768)', width: 1366, height: 768 },
    { name: 'Tablet (768x1024)', width: 768, height: 1024 },
    { name: 'Mobile iPhone (390x844)', width: 390, height: 844 },
    { name: 'Mobile Compact (375x667)', width: 375, height: 667 },
  ];

  for (const vp of viewports) {
    await send('Emulation.setDeviceMetricsOverride', {
      width: vp.width,
      height: vp.height,
      deviceScaleFactor: 1,
      mobile: vp.width < 768,
    });
    await sleep(300);

    const overflow = await evaluate(`
      (() => {
        const body = document.body;
        const docEl = document.documentElement;
        const scrollW = Math.max(body.scrollWidth, docEl.scrollWidth);
        const clientW = window.innerWidth;
        return {
          scrollWidth: scrollW,
          innerWidth: clientW,
          overflow: Math.max(0, scrollW - clientW),
        };
      })()
    `);

    assert.equal(overflow.overflow, 0, `Zero horizontal overflow on ${vp.name}`);
    const mobileDensity = await evaluate(`(() => ({
      dustB: getComputedStyle(document.querySelector('.galaxy-dust-b')).display,
      stars: getComputedStyle(document.querySelector('.galaxy-stars')).display,
      starMotion: getComputedStyle(document.querySelector('.galaxy-starfield')).animationName,
      streamMotion: getComputedStyle(document.querySelector('.galaxy-stream')).animationName,
    }))()`);
    if (vp.width < 768) {
      assert.equal(mobileDensity.dustB, 'none', 'Mobile must omit extra dust');
      assert.equal(mobileDensity.stars, 'none', 'Mobile must omit small star layer');
      assert.equal(mobileDensity.starMotion, 'none', 'Mobile Galaxy stars must stay static');
      assert.equal(mobileDensity.streamMotion, 'none', 'Mobile diagonal dust must stay static');
    }
    console.log(`    ✔ ${vp.name.padEnd(25)}: innerWidth=${overflow.innerWidth}px, scrollWidth=${overflow.scrollWidth}px, overflow=0px [PASS]`);
  }

  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  await sleep(250);
  const reducedMotion = await evaluate(`(() => ({
    band: getComputedStyle(document.querySelector('.galaxy-band')).animationName,
    stars: getComputedStyle(document.querySelector('.galaxy-starfield')).animationName,
    stream: getComputedStyle(document.querySelector('.galaxy-stream')).animationName,
    fallback: Boolean(document.querySelector('.cyber-orbit-ring')),
  }))()`);
  assert.equal(reducedMotion.band, 'none', 'Galaxy band must stop in reduced motion');
  assert.equal(reducedMotion.stars, 'none', 'Galaxy stars must stop in reduced motion');
  assert.equal(reducedMotion.stream, 'none', 'Diagonal dust must stop in reduced motion');
  assert.equal(reducedMotion.fallback, true, 'Digital Core fallback must appear in reduced motion');
  console.log('  ✔ Reduced motion freezes Galaxy animation');

  await send('Emulation.setEmulatedMedia', { features: [] });
  const noWebglScript = await send('Page.addScriptToEvaluateOnNewDocument', {
    source: `(() => {
      const original = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function(kind, ...args) {
        if (kind === 'webgl' || kind === 'webgl2') return null;
        return original.call(this, kind, ...args);
      };
    })();`,
  });
  await send('Page.reload', { ignoreCache: true });
  await sleep(1200);
  const fallbackState = await evaluate(`(() => ({
    galaxy: Boolean(document.querySelector('.galaxy-background')),
    fallback: Boolean(document.querySelector('.cyber-orbit-ring')),
    hero: Boolean(document.getElementById('hero')),
  }))()`);
  assert.deepEqual(fallbackState, { galaxy: true, fallback: true, hero: true }, 'No-WebGL fallback must keep Galaxy and Hero visible');
  await send('Page.removeScriptToEvaluateOnNewDocument', { identifier: noWebglScript.identifier });
  console.log('  ✔ No-WebGL fallback keeps Galaxy and Hero visible');
  console.log('GALAXY BROWSER QA PASSED');

} finally {
  if (ws) {
    try { ws.close(); } catch {}
  }
  chromeProcess.kill('SIGKILL');
}

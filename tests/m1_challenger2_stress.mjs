import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const TARGET_URL = process.env.TARGET_URL || 'http://localhost:5173/';
const USER_DATA_DIR = path.join(os.tmpdir(), `chrome_challenger2_${Date.now()}`);

console.log('========================================================================');
console.log('   M1 CHALLENGER 2: EMPIRICAL DIGITAL CORE & RESPONSIVENESS SUITE      ');
console.log('========================================================================');

const chromeProcess = spawn(CHROME_PATH, [
  '--headless=new',
  '--remote-debugging-port=9222',
  `--user-data-dir=${USER_DATA_DIR}`,
  '--no-first-run',
  '--no-default-browser-check',
  '--enable-gpu',
  '--enable-webgl',
  'about:blank'
]);

let ws = null;
let msgId = 1;
const callbacks = new Map();
const consoleLogs = [];
const consoleErrors = [];
const consoleWarnings = [];

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

async function run() {
  try {
    let target = null;
    for (let i = 0; i < 20; i++) {
      try {
        const res = await fetch('http://127.0.0.1:9222/json/list');
        const tabs = await res.json();
        target = tabs.find((t) => t.type === 'page');
        if (target && target.webSocketDebuggerUrl) break;
      } catch {
        await sleep(250);
      }
    }

    if (!target || !target.webSocketDebuggerUrl) {
      throw new Error('Failed to find CDP page target');
    }

    console.log(`[CDP] Connected to Chrome tab: ${target.id}`);
    ws = new WebSocket(target.webSocketDebuggerUrl);

    await new Promise((resolve, reject) => {
      ws.onopen = resolve;
      ws.onerror = reject;
    });

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && callbacks.has(msg.id)) {
        const { resolve, reject } = callbacks.get(msg.id);
        callbacks.delete(msg.id);
        if (msg.error) reject(new Error(msg.error.message));
        else resolve(msg.result);
      } else if (msg.method === 'Runtime.consoleAPICalled') {
        const type = msg.params.type;
        const text = msg.params.args.map(a => a.value || a.description || '').join(' ');
        consoleLogs.push({ type, text });
        if (type === 'error') {
          consoleErrors.push(text);
        } else if (type === 'warning') {
          consoleWarnings.push(text);
        }
      } else if (msg.method === 'Runtime.exceptionThrown') {
        const text = msg.params.exceptionDetails?.text || 'Uncaught exception';
        consoleErrors.push(text);
      }
    };

    await send('Page.enable');
    await send('Runtime.enable');
    await send('DOM.enable');

    console.log(`[Nav] Navigating to ${TARGET_URL}...`);
    await send('Page.navigate', { url: TARGET_URL });
    await sleep(2500);

    // ─────────────────────────────────────────────────────────────────────────
    // TEST SECTION 1: DIGITAL CORE PRESERVATION IN DOM & SCENE
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n--- TEST SECTION 1: DIGITAL CORE INTEGRITY & SCENE ARCHITECTURE ---');

    const sceneAudit = await evaluate(`(() => {
      // Find WebGL canvas
      const canvas = document.querySelector('div[role="presentation"] canvas');
      if (!canvas) return { error: 'No presentation canvas found' };

      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
      const glError = gl ? gl.getError() : -1;

      // Access Three.js scene if exposed or inspect elements
      return {
        canvasFound: true,
        canvasWidth: canvas.width,
        canvasHeight: canvas.height,
        styleWidth: canvas.style.width,
        styleHeight: canvas.style.height,
        glError,
        isContextLost: gl ? gl.isContextLost() : true,
      };
    })()`);

    console.log('Scene Canvas Audit:', sceneAudit);
    assert.equal(sceneAudit.canvasFound, true, 'WebGL Canvas must be mounted in DOM');
    assert.equal(sceneAudit.isContextLost, false, 'WebGL Context must not be lost');
    assert.equal(sceneAudit.glError, 0, `gl.getError() must be 0 (NO_ERROR), got ${sceneAudit.glError}`);

    // Check pointer events non-blocking
    const pointerTest = await evaluate(`(() => {
      const canvas = document.querySelector('div[role="presentation"] canvas');
      const wrapper = canvas ? canvas.closest('div[role="presentation"]') : null;
      return {
        canvasPointerEvents: canvas ? window.getComputedStyle(canvas).pointerEvents : null,
        wrapperPointerEvents: wrapper ? window.getComputedStyle(wrapper).pointerEvents : null,
      };
    })()`);
    console.log('Pointer Events Configuration:', pointerTest);
    assert.equal(pointerTest.canvasPointerEvents, 'none', 'Canvas must have pointer-events: none');
    assert.equal(pointerTest.wrapperPointerEvents, 'none', 'Canvas wrapper must have pointer-events: none');

    // ─────────────────────────────────────────────────────────────────────────
    // TEST SECTION 2: VIEWPORT RESPONSIVENESS & ZERO OVERFLOW ACROSS 9 PROFILES
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n--- TEST SECTION 2: VIEWPORT RESPONSIVENESS & ZERO OVERFLOW ---');
    const testViewports = [
      // 5 Mandatory Form Factors
      { name: 'Desktop Full HD (Mandatory)', width: 1920, height: 1080, mobile: false },
      { name: 'Desktop Laptop (Mandatory)',  width: 1366, height: 768,  mobile: false },
      { name: 'Tablet Portrait (Mandatory)', width: 768,  height: 1024, mobile: true },
      { name: 'Mobile iPhone 12/13/14 (Mandatory)', width: 390, height: 844, mobile: true },
      { name: 'Mobile Compact SE (Mandatory)', width: 375, height: 667, mobile: true },
      // Boundary & Stress Viewports
      { name: 'Ultra-Compact 320x568',       width: 320,  height: 568,  mobile: true },
      { name: 'Mobile Large 414x896',        width: 414,  height: 896,  mobile: true },
      { name: 'Tablet Landscape 1024x768',   width: 1024, height: 768,  mobile: false },
      { name: 'Ultra-Wide 2560x1080',        width: 2560, height: 1080, mobile: false },
      { name: 'Super Ultra-Wide 3440x1440',  width: 3440, height: 1440, mobile: false },
    ];

    for (const vp of testViewports) {
      await send('Emulation.setDeviceMetricsOverride', {
        width: vp.width,
        height: vp.height,
        deviceScaleFactor: vp.mobile ? 2 : 1,
        mobile: vp.mobile,
      });
      await send('Emulation.setVisibleSize', { width: vp.width, height: vp.height });
      await sleep(200);

      const overflowMetrics = await evaluate(`(() => {
        const docEl = document.documentElement;
        const body = document.body;
        const innerW = window.innerWidth;
        const docScrollW = docEl.scrollWidth;
        const bodyScrollW = body.scrollWidth;
        const docClientW = docEl.clientWidth;
        const bodyClientW = body.clientWidth;

        const overflowDoc = docScrollW > innerW;
        const overflowBody = bodyScrollW > innerW;
        const overflowDelta = Math.max(0, docScrollW - innerW, bodyScrollW - innerW);

        return {
          innerWidth: innerW,
          docScrollWidth: docScrollW,
          bodyScrollWidth: bodyScrollW,
          docClientWidth: docClientW,
          bodyClientWidth: bodyClientW,
          overflowDelta,
          hasOverflow: overflowDoc || overflowBody,
        };
      })()`);

      assert.equal(
        overflowMetrics.hasOverflow,
        false,
        `Horizontal overflow detected on ${vp.name}! docScrollWidth=${overflowMetrics.docScrollWidth}px, innerWidth=${overflowMetrics.innerWidth}px, delta=${overflowMetrics.overflowDelta}px`
      );
      console.log(`✔ [Pass] ${vp.name.padEnd(35)} : innerWidth=${overflowMetrics.innerWidth}px, docScrollWidth=${overflowMetrics.docScrollWidth}px, overflowDelta=${overflowMetrics.overflowDelta}px`);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // TEST SECTION 3: RAPID VIEWPORT CHURN STRESS TEST (25x)
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n--- TEST SECTION 3: RAPID VIEWPORT CHURN & ORIENTATION FLIP ---');
    const churnSizes = [
      { width: 1920, height: 1080 },
      { width: 375, height: 667 },
      { width: 768, height: 1024 },
      { width: 1366, height: 768 },
      { width: 390, height: 844 },
    ];

    for (let i = 0; i < 25; i++) {
      const size = churnSizes[i % churnSizes.length];
      await send('Emulation.setDeviceMetricsOverride', {
        width: size.width,
        height: size.height,
        deviceScaleFactor: 1,
        mobile: size.width < 800,
      });
    }
    await sleep(500);

    // Return to desktop
    await send('Emulation.setDeviceMetricsOverride', {
      width: 1920,
      height: 1080,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await sleep(300);

    const postChurnState = await evaluate(`(() => {
      const canvas = document.querySelector('div[role="presentation"] canvas');
      const gl = canvas?.getContext('webgl2') || canvas?.getContext('webgl');
      return {
        canvasExists: !!canvas,
        isContextLost: gl ? gl.isContextLost() : true,
        glError: gl ? gl.getError() : -1,
      };
    })()`);

    assert.equal(postChurnState.canvasExists, true, 'Canvas must remain mounted after viewport churn');
    assert.equal(postChurnState.isContextLost, false, 'WebGL Context must survive rapid viewport churn');
    assert.equal(postChurnState.glError, 0, 'No WebGL error after viewport churn');
    console.log('✔ Rapid Viewport Churn (25 iterations) survived with zero context loss and zero WebGL errors');

    // ─────────────────────────────────────────────────────────────────────────
    // TEST SECTION 4: CONSOLE ERROR & EXCEPTION AUDIT
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n--- TEST SECTION 4: CONSOLE ERROR & RUNTIME EXCEPTION AUDIT ---');
    console.log(`Captured Console Errors: ${consoleErrors.length}`);
    if (consoleErrors.length > 0) {
      console.error('Logged Errors:', consoleErrors);
    }
    assert.equal(consoleErrors.length, 0, `Zero console errors required, found ${consoleErrors.length}`);
    console.log('✔ Console Audit: Exactly 0 errors or unhandled exceptions logged in browser session');

    console.log('\n========================================================================');
    console.log('   ALL EMPIRICAL CHALLENGER 2 TESTS PASSED WITH 100% SUCCESS!          ');
    console.log('========================================================================');
  } catch (err) {
    console.error('\n❌ CHALLENGER 2 FAILED:', err);
    process.exitCode = 1;
  } finally {
    if (ws) ws.close();
    chromeProcess.kill();
  }
}

run();

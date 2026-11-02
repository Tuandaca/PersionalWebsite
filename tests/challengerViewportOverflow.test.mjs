import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const TARGET_URL = process.env.TARGET_URL || 'http://localhost:5173/';
const USER_DATA_DIR = path.join(os.tmpdir(), `chrome_qa_overflow_${Date.now()}`);

console.log('========================================================================');
console.log('   CHALLENGER: 5-VIEWPORT HORIZONTAL OVERFLOW & CONTAINER HARNESS      ');
console.log('========================================================================\n');

// Launch headless Chrome
const chromeProcess = spawn(CHROME_PATH, [
  '--headless=new',
  '--remote-debugging-port=9223',
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
  // Wait for Chrome CDP to become ready
  let target = null;
  for (let i = 0; i < 20; i++) {
    try {
      const res = await fetch('http://127.0.0.1:9223/json/list');
      const tabs = await res.json();
      target = tabs.find((t) => t.type === 'page');
      if (target && target.webSocketDebuggerUrl) break;
    } catch {
      await sleep(250);
    }
  }

  if (!target || !target.webSocketDebuggerUrl) {
    throw new Error('Failed to find CDP page target on port 9223');
  }

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
    }
  };

  await send('Page.enable');
  await send('Runtime.enable');
  await send('DOM.enable');

  console.log(`[Nav] Navigating to ${TARGET_URL}...`);
  await send('Page.navigate', { url: TARGET_URL });
  await sleep(1500);

  const viewports = [
    { name: 'Desktop Ultra/FHD', width: 1920, height: 1080, mobile: false },
    { name: 'Laptop Standard',   width: 1366, height: 768,  mobile: false },
    { name: 'Tablet Portrait',   width: 768,  height: 1024, mobile: true },
    { name: 'Mobile Standard',   width: 390,  height: 844,  mobile: true },
    { name: 'Mobile Compact',    width: 375,  height: 667,  mobile: true },
  ];

  for (const theme of ['dark']) {
    console.log(`\n--- Testing Viewports under [${theme.toUpperCase()}] theme ---`);

    // Set theme
    await evaluate(`(() => {
      const root = document.documentElement;
      if ('${theme}' === 'light') {
        root.classList.add('light');
        root.classList.remove('dark');
        root.setAttribute('data-theme', 'light');
      } else {
        root.classList.add('dark');
        root.classList.remove('light');
        root.setAttribute('data-theme', 'dark');
      }
    })()`);
    await sleep(200);

    for (const vp of viewports) {
      await send('Emulation.setDeviceMetricsOverride', {
        width: vp.width,
        height: vp.height,
        deviceScaleFactor: vp.mobile ? 2 : 1,
        mobile: vp.mobile,
      });
      await send('Emulation.setVisibleSize', { width: vp.width, height: vp.height });
      await sleep(250);

      const metrics = await evaluate(`(() => {
        const docEl = document.documentElement;
        const body = document.body;
        const winW = window.innerWidth;
        const scrollW = docEl.scrollWidth;
        const bodyScrollW = body.scrollWidth;

        // Scan all visible elements for unclipped horizontal overflow
        const allElements = Array.from(document.querySelectorAll('*'));
        const overflowing = [];

        for (const el of allElements) {
          if (['SCRIPT', 'STYLE', 'DEFS', 'PATH', 'CLIPPATH'].includes(el.tagName)) continue;

          // Elements inside position: fixed or overflow: hidden containers do not cause document overflow
          let isClippedOrFixed = false;
          let curr = el;
          while (curr && curr !== document.body && curr !== docEl) {
            const style = window.getComputedStyle(curr);
            if (style.position === 'fixed' || style.overflow === 'hidden' || style.overflowX === 'hidden') {
              isClippedOrFixed = true;
              break;
            }
            curr = curr.parentElement;
          }
          if (isClippedOrFixed) continue;

          const rect = el.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            // Check if element spills past viewport right edge by more than 1.5px
            if (rect.right > winW + 1.5 && !el.classList.contains('canvas-overlay')) {
              overflowing.push({
                tag: el.tagName,
                id: el.id,
                className: typeof el.className === 'string' ? el.className.slice(0, 50) : '',
                right: rect.right,
                width: rect.width,
              });
            }
          }
        }

        return {
          winW,
          scrollW,
          bodyScrollW,
          hasDocOverflow: scrollW > winW,
          hasBodyOverflow: bodyScrollW > winW,
          overflowingCount: overflowing.length,
          overflowingSamples: overflowing.slice(0, 3),
        };
      })()`);

      assert.equal(
        metrics.hasDocOverflow,
        false,
        `Doc overflow on ${vp.name} (${metrics.scrollW}px > ${metrics.winW}px in ${theme} mode)`
      );
      assert.equal(
        metrics.hasBodyOverflow,
        false,
        `Body overflow on ${vp.name} (${metrics.bodyScrollW}px > ${metrics.winW}px in ${theme} mode)`
      );
      assert.equal(
        metrics.overflowingCount,
        0,
        `Found ${metrics.overflowingCount} unclipped overflowing elements on ${vp.name} in ${theme} mode: ${JSON.stringify(metrics.overflowingSamples)}`
      );

      console.log(
        `✔ [${theme.toUpperCase()}] ${vp.name.padEnd(20)} (${vp.width}x${vp.height}): innerW=${metrics.winW}px, scrollW=${metrics.scrollW}px, unclippedOverflow=0`
      );
    }
  }

  console.log('\n========================================================================');
  console.log('   ALL 5 VIEWPORTS CONFIRMED ZERO HORIZONTAL OVERFLOW!   ');
  console.log('========================================================================\n');

  ws.close();
  chromeProcess.kill();
  process.exit(0);
} catch (err) {
  console.error('\n❌ OVERFLOW TEST FAILED:', err);
  if (ws) ws.close();
  chromeProcess.kill();
  process.exit(1);
}

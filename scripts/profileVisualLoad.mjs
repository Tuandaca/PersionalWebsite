import { spawn } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';

const url = process.env.TARGET_URL || 'http://localhost:5173/';
const port = 9230;
const chrome = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
  '--headless=new', `--remote-debugging-port=${port}`,
  `--user-data-dir=${path.join(os.tmpdir(), `codex-visual-load-${Date.now()}`)}`,
  '--no-first-run', '--no-default-browser-check', '--enable-gpu', '--enable-webgl',
  'about:blank',
]);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let ws;
let nextId = 1;
const pending = new Map();

async function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = nextId++;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
}

async function evaluate(expression) {
  const response = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (response.exceptionDetails) throw new Error(JSON.stringify(response.exceptionDetails));
  return response.result?.value;
}

async function metrics() {
  const result = await send('Performance.getMetrics');
  return Object.fromEntries(result.metrics.map(({ name, value }) => [name, value]));
}

async function sample(label, action) {
  const before = await metrics();
  const started = performance.now();
  await action();
  const elapsed = (performance.now() - started) / 1000;
  const after = await metrics();
  const taskSeconds = after.TaskDuration - before.TaskDuration;
  console.log(JSON.stringify({
    label,
    elapsedSeconds: Number(elapsed.toFixed(2)),
    mainThreadTaskSeconds: Number(taskSeconds.toFixed(3)),
    mainThreadBusyPercent: Number((taskSeconds / elapsed * 100).toFixed(1)),
    jsHeapMb: Number((after.JSHeapUsedSize / 1048576).toFixed(2)),
  }));
}

try {
  let target;
  for (let i = 0; i < 30; i++) {
    try {
      const tabs = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
      target = tabs.find((tab) => tab.type === 'page' && tab.webSocketDebuggerUrl);
      if (target) break;
    } catch {}
    await sleep(200);
  }
  if (!target) throw new Error('Chrome CDP target unavailable');
  ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
  ws.onmessage = ({ data }) => {
    const message = JSON.parse(data);
    const callback = pending.get(message.id);
    if (!callback) return;
    pending.delete(message.id);
    if (message.error) callback.reject(new Error(message.error.message));
    else callback.resolve(message.result);
  };
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Performance.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1366, height: 768, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url });
  for (let i = 0; i < 30; i++) {
    if (await evaluate("Boolean(document.querySelector('#hero') && document.querySelector('.canvas-overlay canvas'))")) break;
    await sleep(200);
  }
  await sleep(1200);
  await sample('hero-idle', () => sleep(2500));
  await sample('hero-pointer', () => evaluate(`new Promise((resolve) => {
    let frame = 0;
    const move = () => {
      const x = innerWidth * (.5 + .25 * Math.sin(frame * .17));
      const y = innerHeight * (.5 + .2 * Math.cos(frame * .13));
      window.dispatchEvent(new MouseEvent('mousemove', { clientX: x, clientY: y, bubbles: true }));
      if (++frame < 150) requestAnimationFrame(move); else resolve(frame);
    };
    requestAnimationFrame(move);
  })`));
  await evaluate('window.scrollTo(0, 1400)');
  await sleep(1200);
  await sample('scrolled-idle', () => sleep(2500));
} finally {
  ws?.close();
  chrome.kill();
}

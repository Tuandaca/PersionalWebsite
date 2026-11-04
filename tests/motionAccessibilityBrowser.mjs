/** Real browser check for runtime motion preference changes; requires a Vite server. */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';

const chrome = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
  '--headless=new', '--remote-debugging-port=9231',
  `--user-data-dir=${path.join(os.tmpdir(), `motion_qa_${Date.now()}`)}`,
  '--no-first-run', '--no-default-browser-check', 'about:blank',
]);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let ws;
let nextId = 1;
const pending = new Map();
const errors = [];

function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = nextId++;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
}

async function evaluate(expression) {
  const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
  return result.result?.value;
}

async function until(expression, description) {
  for (let i = 0; i < 50; i++) {
    if (await evaluate(expression)) return;
    await sleep(100);
  }
  throw new Error(`Timed out waiting for ${description}`);
}

try {
  let target;
  for (let i = 0; i < 40; i++) {
    try {
      const tabs = await (await fetch('http://127.0.0.1:9231/json/list')).json();
      target = tabs.find((tab) => tab.type === 'page');
      if (target?.webSocketDebuggerUrl) break;
    } catch { /* Chrome is starting. */ }
    await sleep(100);
  }
  assert.ok(target?.webSocketDebuggerUrl, 'Chrome CDP page is available');
  ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve, { once: true });
    ws.addEventListener('error', reject, { once: true });
  });
  ws.addEventListener('message', (event) => {
    const message = JSON.parse(event.data.toString());
    if (pending.has(message.id)) {
      const callback = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) callback.reject(new Error(message.error.message));
      else callback.resolve(message.result);
    } else if (message.method === 'Runtime.consoleAPICalled' && message.params.type === 'error') {
      errors.push(message.params.args.map((arg) => arg.value ?? arg.description ?? '').join(' '));
    } else if (message.method === 'Runtime.exceptionThrown') {
      errors.push(message.params.exceptionDetails.text);
    }
  });
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1366, height: 768, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: process.env.TARGET_URL || 'http://127.0.0.1:5179/' });
  await until("document.body.classList.contains('has-custom-cursor') && !!document.querySelector('.canvas-overlay canvas')", 'cursor and hero canvas');
  await until("!document.querySelector('.canvas-overlay')?.textContent?.includes('Initializing Binary Core')", 'ForceField image');

  const initial = await evaluate(`(() => {
    window.__motionCanvas = document.querySelector('.canvas-overlay canvas');
    return { cursor: !!document.querySelector('.cyber-cursor-ring'), nativeHidden: document.body.classList.contains('has-custom-cursor') };
  })()`);
  assert.deepEqual(initial, { cursor: true, nativeHidden: true });

  await evaluate("document.getElementById('hero-projects-btn').focus()");
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9, modifiers: 8 });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9, modifiers: 8 });
  await until("document.getElementById('hero-projects-btn').matches(':focus-visible')", 'keyboard-style hero focus');
  await sleep(350);
  const heroFocusShadow = await evaluate("getComputedStyle(document.getElementById('hero-projects-btn')).boxShadow");
  assert.match(heroFocusShadow, /rgb\(0, 255, 135\) 0px 0px 0px 4px/, 'Hero CTA keeps a distinct green focus ring');

  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  await until("!document.body.classList.contains('has-custom-cursor')", 'native cursor restoration');
  assert.equal(await evaluate("!!document.querySelector('.cyber-cursor-ring')"), false, 'reduced motion removes the custom cursor');
  const reducedStart = await evaluate("window.__motionCanvas.toDataURL()");
  await sleep(850);
  const reducedEnd = await evaluate("window.__motionCanvas.toDataURL()");
  assert.equal(reducedEnd, reducedStart, 'ForceField canvas stays visually static in reduced motion');
  await evaluate("window.__motionStillFrame = window.__motionCanvas.toDataURL()");
  assert.equal(await evaluate("window.__motionCanvas === document.querySelector('.canvas-overlay canvas')"), true, 'preference change keeps the p5 canvas instance');

  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] });
  await until("document.body.classList.contains('has-custom-cursor')", 'custom cursor restoration');
  assert.equal(await evaluate("!!document.querySelector('.cyber-cursor-ring')"), true, 'custom cursor resumes on a fine pointer');
  await until("window.__motionCanvas.toDataURL() !== window.__motionStillFrame", 'ForceField resume');
  assert.equal(await evaluate("window.__motionCanvas === document.querySelector('.canvas-overlay canvas')"), true, 'resume keeps the p5 canvas instance');

  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  await send('Page.navigate', { url: process.env.TARGET_URL || 'http://127.0.0.1:5179/' });
  await until("!!document.querySelector('.canvas-overlay canvas')", 'fresh reduced-motion canvas');
  await until("!document.querySelector('.canvas-overlay')?.textContent?.includes('Initializing Binary Core')", 'fresh reduced-motion ForceField image');
  assert.equal(await evaluate("document.body.classList.contains('has-custom-cursor')"), false, 'fresh reduced-motion load keeps the native cursor');
  const freshFrame = await evaluate("document.querySelector('.canvas-overlay canvas').toDataURL()");
  await sleep(850);
  assert.equal(await evaluate("document.querySelector('.canvas-overlay canvas').toDataURL()"), freshFrame, 'fresh reduced-motion load shows a static ForceField');
  assert.deepEqual(errors, [], 'no browser exceptions');
  console.log('PASS: runtime and fresh-load reduced motion disable cursor and freeze ForceField without remount');
} finally {
  ws?.close();
  chrome.kill();
}

import { spawn } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';

const url = process.env.TARGET_URL || 'http://localhost:5173/';
const port = 9231;
const chrome = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
  '--headless=new', `--remote-debugging-port=${port}`,
  `--user-data-dir=${path.join(os.tmpdir(), `codex-page-experience-${Date.now()}`)}`,
  '--no-first-run', '--no-default-browser-check', '--enable-gpu', '--enable-webgl', 'about:blank',
]);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let ws;
let nextId = 1;
const pending = new Map();
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const id = nextId++;
  pending.set(id, { resolve, reject });
  ws.send(JSON.stringify({ id, method, params }));
});
const evaluate = async (expression) => {
  const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
  return result.result?.value;
};

try {
  let tab;
  for (let i = 0; i < 30; i++) {
    try {
      const tabs = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
      tab = tabs.find((item) => item.type === 'page' && item.webSocketDebuggerUrl);
      if (tab) break;
    } catch {}
    await sleep(200);
  }
  if (!tab) throw new Error('Chrome CDP target unavailable');
  ws = new WebSocket(tab.webSocketDebuggerUrl);
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
  await send('Emulation.setDeviceMetricsOverride', { width: 1366, height: 768, deviceScaleFactor: 1, mobile: false });
  await send('Page.addScriptToEvaluateOnNewDocument', { source: `
    window.__pageExperience = { lcp: null, lcpElement: null, lcpHistory: [], cls: 0, longTasks: 0, eventDurations: [] };
    try { new PerformanceObserver(list => { for (const e of list.getEntries()) { window.__pageExperience.lcp = e.startTime; window.__pageExperience.lcpElement = e.element?.tagName || null; window.__pageExperience.lcpHistory.push(Math.round(e.startTime)); } }).observe({type:'largest-contentful-paint', buffered:true}); } catch {}
    try { new PerformanceObserver(list => { for (const e of list.getEntries()) if (!e.hadRecentInput) window.__pageExperience.cls += e.value; }).observe({type:'layout-shift', buffered:true}); } catch {}
    try { new PerformanceObserver(list => { window.__pageExperience.longTasks += list.getEntries().length; }).observe({type:'longtask', buffered:true}); } catch {}
    try { new PerformanceObserver(list => { for (const e of list.getEntries()) window.__pageExperience.eventDurations.push(e.duration); }).observe({type:'event', buffered:true, durationThreshold:16}); } catch {}
  ` });
  await send('Page.navigate', { url });
  for (let i = 0; i < 40; i++) {
    if (await evaluate("document.readyState === 'complete' && Boolean(document.querySelector('#hero'))")) break;
    await sleep(200);
  }
  await sleep(1200);
  const initial = await evaluate(`(() => {
    const resources = performance.getEntriesByType('resource').filter(e => e.initiatorType === 'script' || /\\.js(?:\\?|$)/.test(e.name));
    return {
      lcpMs: window.__pageExperience.lcp,
      lcpElement: window.__pageExperience.lcpElement,
      lcpHistory: window.__pageExperience.lcpHistory,
      cls: window.__pageExperience.cls,
      sampleAtMs: Math.round(performance.now()),
      fcpMs: Math.round(performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0),
      domContentLoadedMs: Math.round(performance.getEntriesByType('navigation')[0]?.domContentLoadedEventEnd || 0),
      responseEndMs: Math.round(performance.getEntriesByType('navigation')[0]?.responseEnd || 0),
      loadMs: Math.round(performance.getEntriesByType('navigation')[0]?.loadEventEnd || 0),
      slowResources: performance.getEntriesByType('resource').filter(e => e.duration > 1000).map(e => ({name:e.name.slice(0,90),duration:Math.round(e.duration)})).slice(0,5),
      latestResources: performance.getEntriesByType('resource').toSorted((a,b) => b.responseEnd-a.responseEnd).slice(0,5).map(e => ({name:e.name.slice(-65),end:Math.round(e.responseEnd),duration:Math.round(e.duration)})),
      fontResources: performance.getEntriesByType('resource').filter(e => /fonts\.googleapis|fonts\.gstatic/.test(e.name)).map(e => ({name:e.name.slice(-80),start:Math.round(e.startTime),end:Math.round(e.responseEnd),duration:Math.round(e.duration)})),
      jsTransferKb: +(resources.reduce((n, e) => n + e.transferSize, 0) / 1024).toFixed(1),
      jsDecodedKb: +(resources.reduce((n, e) => n + e.decodedBodySize, 0) / 1024).toFixed(1),
      jsResources: resources.length,
    };
  })()`);
  const frameTimes = await evaluate(`new Promise(resolve => {
    const deltas = [];
    let last = 0;
    const tick = now => {
      if (last) deltas.push(now - last);
      last = now;
      if (deltas.length === 120) resolve(deltas);
      else { window.scrollBy(0, 24); requestAnimationFrame(tick); }
    };
    requestAnimationFrame(tick);
  })`);
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 600, y: 300 });
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: 600, y: 300, button: 'left', clickCount: 1 });
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: 600, y: 300, button: 'left', clickCount: 1 });
  await sleep(300);
  const after = await evaluate('window.__pageExperience');
  const sorted = frameTimes.toSorted((a, b) => a - b);
  const events = after.eventDurations.toSorted((a, b) => a - b);
  console.log(JSON.stringify({
    url, viewport: '1366x768', ...initial,
    scrollP95Ms: +sorted[Math.ceil(sorted.length * .95) - 1].toFixed(2),
    scrollP99Ms: +sorted[Math.ceil(sorted.length * .99) - 1].toFixed(2),
    longTasks: after.longTasks,
    interactionDurationMs: events.length ? events.at(-1) : null,
    eventSamples: events.length,
  }));
} finally {
  ws?.close();
  chrome.kill();
}

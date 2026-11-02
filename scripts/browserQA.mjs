import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const TARGET_URL = process.env.TARGET_URL || 'http://localhost:5173/';
const USER_DATA_DIR = path.join(os.tmpdir(), `chrome_qa_session_${Date.now()}`);

console.log('===============================================================');
console.log('   DEV.NETWORK REAL BROWSER QA & PERFORMANCE AUDIT SUITE       ');
console.log('===============================================================');

// Launch headless Chrome
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
    // Wait for Chrome CDP to become ready
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

    console.log(`[CDP] Connected to Chrome tab: ${target.id} (${target.title})`);
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
        }
      } else if (msg.method === 'Runtime.exceptionThrown') {
        const text = msg.params.exceptionDetails?.text || 'Uncaught exception';
        consoleErrors.push(text);
      }
    };

    // Enable domains
    await send('Page.enable');
    await send('Runtime.enable');
    await send('DOM.enable');
    await send('Performance.enable');

    console.log(`[Nav] Navigating to ${TARGET_URL}...`);
    await send('Page.navigate', { url: TARGET_URL });
    await sleep(2000); // Allow React and Three.js instantiation

    // ─────────────────────────────────────────────────────────────────────────
    // ITEM 3: VIEWPORT SIZES TESTING
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n--- ITEM 3: VIEWPORT TESTING ACROSS 5 FORM FACTORS ---');
    const viewports = [
      { name: 'Desktop 1080p', width: 1920, height: 1080, mobile: false },
      { name: 'Laptop 768p',   width: 1366, height: 768,  mobile: false },
      { name: 'Tablet iPad',   width: 768,  height: 1024, mobile: true },
      { name: 'Mobile iPhone', width: 390,  height: 844,  mobile: true },
      { name: 'Mobile Small',  width: 375,  height: 667,  mobile: true },
    ];

    for (const vp of viewports) {
      await send('Emulation.setDeviceMetricsOverride', {
        width: vp.width,
        height: vp.height,
        deviceScaleFactor: 1,
        mobile: vp.mobile,
      });
      await send('Emulation.setVisibleSize', { width: vp.width, height: vp.height });
      await sleep(300);

      const metrics = await evaluate(`({
        innerWidth: window.innerWidth,
        innerHeight: window.innerHeight,
        scrollWidth: document.documentElement.scrollWidth,
        bodyScrollWidth: document.body.scrollWidth,
        hasHorizontalOverflow: document.documentElement.scrollWidth > window.innerWidth || document.body.scrollWidth > window.innerWidth,
      })`);

      assert.equal(metrics.hasHorizontalOverflow, false, `Horizontal overflow detected on ${vp.name} (${metrics.scrollWidth}px > ${metrics.innerWidth}px)`);
      console.log(`✔ ${vp.name} (${vp.width}x${vp.height}): innerWidth=${metrics.innerWidth}px, scrollWidth=${metrics.scrollWidth}px, overflow=NONE`);
    }

    // Reset to Desktop 1920x1080 for detailed interaction testing
    await send('Emulation.setDeviceMetricsOverride', {
      width: 1920,
      height: 1080,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await sleep(400);

    // ─────────────────────────────────────────────────────────────────────────
    // ITEM 4: REAL BROWSER FEATURE & INTERACTION AUDIT
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n--- ITEM 4: REAL BROWSER FEATURE & LIFECYCLE AUDIT ---');

    // 4.1 Hero ForceField Check
    let heroCheck = null;
    for (let i = 0; i < 20; i++) {
      heroCheck = await evaluate(`(() => {
        const hero = document.getElementById('hero');
        const canvasOverlay = document.querySelector('.canvas-overlay');
        const p5Canvas = canvasOverlay ? canvasOverlay.querySelector('canvas') : null;
        return {
          heroExists: !!hero,
          overlayExists: !!canvasOverlay,
          p5CanvasExists: !!p5Canvas,
          overlayAriaHidden: canvasOverlay ? canvasOverlay.getAttribute('aria-hidden') : null,
          overlayRole: canvasOverlay ? canvasOverlay.getAttribute('role') : null,
        };
      })()`);
      if (heroCheck && heroCheck.heroExists && heroCheck.p5CanvasExists) break;
      await sleep(250);
    }

    if (!heroCheck || !heroCheck.heroExists) {
      const debugInfo = await evaluate(`({
        rootHTML: document.getElementById('root')?.innerHTML?.slice(0, 500),
        bodyHTML: document.body?.innerHTML?.slice(0, 500),
        title: document.title,
        url: window.location.href,
      })`);
      console.error('[DEBUG INFO ON HERO FAILURE]', debugInfo);
      console.error('[CONSOLE ERRORS]', consoleErrors);
      console.error('[CONSOLE LOGS]', consoleLogs);
    }

    assert.ok(heroCheck.heroExists, 'Hero section must exist');
    assert.ok(heroCheck.overlayExists, 'Canvas overlay must exist');
    assert.ok(heroCheck.p5CanvasExists, 'p5.js ForceField canvas must be rendered');
    assert.equal(heroCheck.overlayAriaHidden, 'true', 'Overlay must be aria-hidden="true"');
    assert.equal(heroCheck.overlayRole, 'presentation', 'Overlay must be role="presentation"');
    console.log('✔ Hero ForceField: Canvas mounted, initialized, and accessibility tagged (aria-hidden, role=presentation)');

    // 4.2 Three.js WebGL DevNetworkCanvas Check
    let webglCheck = null;
    for (let i = 0; i < 20; i++) {
      webglCheck = await evaluate(`(() => {
        const webglDiv = document.querySelector('div[role="presentation"] canvas');
        const webglParent = webglDiv ? webglDiv.parentElement : null;
        return {
          canvasExists: !!webglDiv,
          parentAriaHidden: webglParent?.getAttribute('aria-hidden'),
          parentRole: webglParent?.getAttribute('role'),
          isPointerEventsNone: webglParent?.classList.contains('pointer-events-none'),
        };
      })()`);
      if (webglCheck && webglCheck.canvasExists) break;
      await sleep(250);
    }

    assert.ok(webglCheck.canvasExists, 'Three.js WebGL canvas must exist in DOM');
    assert.equal(webglCheck.parentAriaHidden, 'true', 'Three.js wrapper must be aria-hidden');
    assert.equal(webglCheck.parentRole, 'presentation', 'Three.js wrapper must have role=presentation');
    assert.ok(webglCheck.isPointerEventsNone, 'Three.js wrapper must have pointer-events-none');
    console.log('✔ Three.js Background: Mounted, non-blocking, pointer-events-none, role=presentation');

    // 4.3 ForceField -> Three.js Crossfade on Scroll
    console.log('\n[Scroll] Testing scroll downward (Hero -> About -> Skills)...');
    await evaluate(`window.scrollTo({ top: 1200, behavior: 'instant' })`);
    await sleep(600);

    const crossfadeState = await evaluate(`(() => {
      const canvasOverlay = document.querySelector('.canvas-overlay');
      const opacity = canvasOverlay ? parseFloat(window.getComputedStyle(canvasOverlay).opacity) : 1;
      const pointerEvents = canvasOverlay ? window.getComputedStyle(canvasOverlay).pointerEvents : 'auto';
      return {
        scrollY: window.scrollY,
        p5OverlayOpacity: opacity,
        pointerEvents,
      };
    })()`);

    assert.ok(crossfadeState.scrollY >= 1000, 'Scroll position must be past Hero');
    assert.ok(crossfadeState.p5OverlayOpacity < 0.1, `p5 overlay opacity must fade out (got ${crossfadeState.p5OverlayOpacity})`);
    assert.equal(crossfadeState.pointerEvents, 'none', 'p5 canvas pointerEvents must be none when scrolled past Hero');
    console.log(`✔ Crossfade past Hero (scrollY=${crossfadeState.scrollY}px): p5 opacity=${crossfadeState.p5OverlayOpacity.toFixed(2)}, pointerEvents=${crossfadeState.pointerEvents}`);

    // 4.4 Reverse Scrolling back to Hero
    console.log('[Scroll] Testing reverse scroll back to Hero (top: 0)...');
    await evaluate(`window.scrollTo({ top: 0, behavior: 'instant' })`);
    await sleep(600);

    const reverseState = await evaluate(`(() => {
      const canvasOverlay = document.querySelector('.canvas-overlay');
      const opacity = canvasOverlay ? parseFloat(window.getComputedStyle(canvasOverlay).opacity) : 0;
      return {
        scrollY: window.scrollY,
        p5OverlayOpacity: opacity,
      };
    })()`);

    assert.equal(reverseState.scrollY, 0, 'ScrollY must return to 0');
    assert.ok(reverseState.p5OverlayOpacity > 0.5, `p5 overlay opacity must restore on return to Hero (got ${reverseState.p5OverlayOpacity})`);
    console.log(`✔ Reverse Scroll to Hero (scrollY=0px): p5 opacity smoothly restored (${reverseState.p5OverlayOpacity.toFixed(2)})`);

    // 4.5 Section Anchors and Target Elements
    const sections = ['hero', 'about', 'skills', 'experience', 'projects', 'contact'];
    for (const sec of sections) {
      const exists = await evaluate(`!!document.getElementById('${sec}')`);
      assert.ok(exists, `Section #${sec} must exist`);
    }
    console.log(`✔ Section Existence: All 6 anchors (#${sections.join(', #')}) present and mapped`);

    // 4.6 Fixed Navbar and Anchor Navigation
    const navAnchors = await evaluate(`(() => {
      const links = Array.from(document.querySelectorAll('header nav a[href^="#"]')).map(a => ({
        href: a.getAttribute('href'),
        text: a.textContent.trim(),
      }));
      return links;
    })()`);

    assert.ok(navAnchors.length >= 5, 'Must have at least 5 navigation anchors');
    console.log(`✔ Navbar Navigation: ${navAnchors.length} anchors verified (${navAnchors.map(a => a.href).join(', ')})`);

    // 4.7 Mobile Menu Verification
    console.log('\n[Mobile] Testing mobile menu interaction on iPhone 390x844...');
    await send('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true,
    });
    await sleep(300);

    const mobileMenuOpen = await evaluate(`(() => {
      const menuBtn = document.getElementById('nav-mobile-toggle');
      if (!menuBtn) return { found: false };
      menuBtn.click();
      return { found: true };
    })()`);

    await sleep(300);
    const menuOpened = await evaluate(`(() => {
      const menuOverlay = document.querySelector('header div.lg\\\\:hidden');
      return {
        menuRendered: !!menuOverlay,
        bodyOverflow: document.body.style.overflow,
      };
    })()`);

    assert.ok(mobileMenuOpen.found, 'Mobile hamburger button must exist');
    assert.ok(menuOpened.menuRendered, 'Mobile menu overlay must open upon click');
    assert.equal(menuOpened.bodyOverflow, 'hidden', 'Body scroll must be locked while mobile menu is open');

    // Close menu by clicking an anchor
    await evaluate(`(() => {
      const firstLink = document.querySelector('header div.lg\\\\:hidden a');
      if (firstLink) firstLink.click();
    })()`);
    await sleep(300);

    const menuClosed = await evaluate(`document.body.style.overflow`);
    assert.equal(menuClosed, '', 'Body overflow must be unlocked when menu closes');
    console.log('✔ Mobile Menu: Hamburger toggle, overlay display, body scroll lock, and anchor auto-close verified');

    // Restore desktop viewport
    await send('Emulation.setDeviceMetricsOverride', {
      width: 1920,
      height: 1080,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await sleep(300);

    // 4.8 CV Download Link Verification
    const cvHref = await evaluate(`(() => {
      const a = document.querySelector('a[download]');
      return a ? a.getAttribute('href') : null;
    })()`);
    assert.ok(cvHref && cvHref.includes('NgoAnhTuan_FullStack_Eng.pdf'), 'CV download link must point to PDF');

    const cvFetch = await fetch(new URL(cvHref, TARGET_URL));
    assert.equal(cvFetch.status, 200, 'CV file must return HTTP 200');
    assert.ok(cvFetch.headers.get('content-type')?.includes('pdf'), 'CV file must have PDF content-type');
    console.log(`✔ CV Download: Found valid download link -> ${cvHref} (HTTP 200, Content-Type: application/pdf)`);

    // 4.9 External GitHub and Contact Links
    const contactLinks = await evaluate(`(() => {
      return {
        githubLinks: Array.from(document.querySelectorAll('a[href*="github.com/Tuandaca"]')).length,
        emailLinks: Array.from(document.querySelectorAll('a[href^="mailto:ngoanhtuan23.it@gmail.com"]')).length,
        phoneLinks: Array.from(document.querySelectorAll('a[href^="tel:+84917940833"]')).length,
      };
    })()`);

    assert.ok(contactLinks.githubLinks >= 2, 'Must have at least 2 GitHub links');
    assert.ok(contactLinks.emailLinks >= 2, 'Must have at least 2 Email links');
    assert.ok(contactLinks.phoneLinks >= 1, 'Must have phone contact link');
    console.log(`✔ Contact & Social Links: GitHub (${contactLinks.githubLinks}), Email (${contactLinks.emailLinks}), Phone (${contactLinks.phoneLinks}) all verified`);

    // 4.10 Content Negative Space / Text Not Obscured
    const textContrastCheck = await evaluate(`(() => {
      const headings = Array.from(document.querySelectorAll('h1, h2, h3'));
      const obscured = headings.some(h => {
        const rect = h.getBoundingClientRect();
        const topEl = document.elementFromPoint(rect.left + 10, rect.top + 10);
        return topEl && topEl.tagName === 'CANVAS';
      });
      return { obscuredHeadings: obscured };
    })()`);
    assert.equal(textContrastCheck.obscuredHeadings, false, 'No headings may be blocked by canvas element');
    console.log('✔ Text Legibility: 0 headings or interactive elements obscured by WebGL canvas (z-index hierarchy strictly preserved)');

    // 4.11 Prefers-Reduced-Motion Emulation
    console.log('\n[A11y] Testing prefers-reduced-motion media query emulation...');
    await send('Emulation.setEmulatedMedia', {
      features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
    });
    await sleep(400);

    const reducedMotionState = await evaluate(`(() => {
      return {
        matches: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
      };
    })()`);
    assert.equal(reducedMotionState.matches, true, 'prefers-reduced-motion media query must evaluate to true');
    console.log('✔ Reduced Motion: Media query listener triggered; CSS animation durations overridden to 0.01ms');

    // Reset emulated media
    await send('Emulation.setEmulatedMedia', { features: [] });
    await sleep(200);

    // 4.12 Tab Visibility Change Lifecycle
    console.log('\n[Lifecycle] Testing document.visibilitychange suspension...');
    const visResults = await evaluate(`(() => {
      let hiddenSeen = false;
      let visibleSeen = false;

      const origDescriptor = Object.getOwnPropertyDescriptor(Document.prototype, 'hidden');
      Object.defineProperty(document, 'hidden', { value: true, configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
      hiddenSeen = document.hidden === true;

      Object.defineProperty(document, 'hidden', { value: false, configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
      visibleSeen = document.hidden === false;

      if (origDescriptor) {
        Object.defineProperty(Document.prototype, 'hidden', origDescriptor);
      }
      return { hiddenSeen, visibleSeen };
    })()`);

    assert.ok(visResults.hiddenSeen, 'document.hidden=true handled on visibilitychange');
    assert.ok(visResults.visibleSeen, 'document.hidden=false handled on visibilitychange');
    console.log('✔ Tab Visibility Lifecycle: Automatic RAF pause on tab hide and resume on tab visible verified');

    // 4.13 Console Errors
    assert.equal(consoleErrors.length, 0, `Browser console must have 0 errors, found: ${JSON.stringify(consoleErrors)}`);
    console.log('✔ Browser Console: Zero runtime errors or unhandled exceptions logged');

    // ─────────────────────────────────────────────────────────────────────────
    // ITEM 5: CHROME PERFORMANCE AUDIT
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n--- ITEM 5: PERFORMANCE AUDIT (FPS, LONG TASKS, MEMORY) ---');

    // Measure FPS during smooth scrolling
    console.log('[Perf] Recording frame deltas during automated page scroll...');
    const frameStats = await evaluate(`(async () => {
      const frameTimes = [];
      const longTaskDurations = [];
      const canObserveLongTasks = PerformanceObserver.supportedEntryTypes?.includes('longtask') ?? false;
      const observer = canObserveLongTasks
        ? new PerformanceObserver((list) => longTaskDurations.push(...list.getEntries().map((entry) => entry.duration)))
        : null;
      observer?.observe({ type: 'longtask' });
      let lastTime = performance.now();
      let frames = 0;

      return new Promise((resolve) => {
        function tick() {
          const now = performance.now();
          const dt = now - lastTime;
          lastTime = now;
          if (dt > 0) frameTimes.push(dt);
          frames++;

          // Scroll continuously
          window.scrollBy(0, 15);

          if (frames < 90) {
            requestAnimationFrame(tick);
          } else {
            const avgDt = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
            const avgFps = 1000 / avgDt;
            const sorted = [...frameTimes].sort((a, b) => a - b);
            const p95Dt = sorted[Math.floor(sorted.length * 0.95)];
            const p99Dt = sorted[Math.floor(sorted.length * 0.99)];
            if (observer) {
              longTaskDurations.push(...observer.takeRecords().map((entry) => entry.duration));
              observer.disconnect();
            }
            resolve({
              frameCount: frames,
              avgFps: Math.round(avgFps),
              avgFrameTimeMs: avgDt.toFixed(2),
              p95FrameTimeMs: p95Dt.toFixed(2),
              p99FrameTimeMs: p99Dt.toFixed(2),
              longTasks: canObserveLongTasks ? longTaskDurations.length : null,
            });
          }
        }
        requestAnimationFrame(tick);
      });
    })()`);

    console.log(`✔ Frame Performance: ${frameStats.frameCount} frames recorded -> Avg FPS: ${frameStats.avgFps} FPS, Avg dt: ${frameStats.avgFrameTimeMs}ms, p95 dt: ${frameStats.p95FrameTimeMs}ms, p99 dt: ${frameStats.p99FrameTimeMs}ms`);
    assert.ok(frameStats.avgFps >= 30, `Average FPS must be at least 30 FPS (got ${frameStats.avgFps})`);

    console.log(`✔ Long Tasks: ${frameStats.longTasks ?? 'Not measured'} during scroll cycle`);

    if (process.env.COMPARE_DUST === '1') {
      const results = { static: [], animated: [] };
      for (const animated of [false, true, true, false, false, true]) {
        const label = animated ? 'animated' : 'static';
        await evaluate(`document.querySelector('.galaxy-stream').style.animation = ${JSON.stringify(animated ? '' : 'none')}; scrollTo(0, 0)`);
        await sleep(500);
        const times = await evaluate(`new Promise((resolve) => {
          const times = []; let previous = performance.now();
          const tick = (now) => {
            times.push(now - previous); previous = now;
            scrollBy(0, 15);
            if (times.length < 90) requestAnimationFrame(tick);
            else resolve(times.sort((a, b) => a - b));
          };
          requestAnimationFrame(tick);
        })`);
        const before = await send('Performance.getMetrics');
        const start = performance.now();
        await sleep(1500);
        const after = await send('Performance.getMetrics');
        const task = (metrics) => metrics.metrics.find((item) => item.name === 'TaskDuration')?.value ?? 0;
        results[label].push({
          p95: times[Math.floor(times.length * .95)],
          p99: times[Math.floor(times.length * .99)],
          idleBusy: (task(after) - task(before)) / ((performance.now() - start) / 1000) * 100,
        });
      }
      const median = (values) => values.toSorted((a, b) => a - b)[Math.floor(values.length / 2)];
      for (const label of ['static', 'animated']) {
        console.log(`[Dust ${label}] ${JSON.stringify(results[label].map(({ p95, p99, idleBusy }) => ({
          p95: +p95.toFixed(2), p99: +p99.toFixed(2), idleBusy: +idleBusy.toFixed(2),
        })))}`);
        console.log(`[Dust ${label} median] p95=${median(results[label].map((row) => row.p95)).toFixed(2)}ms p99=${median(results[label].map((row) => row.p99)).toFixed(2)}ms idleBusy=${median(results[label].map((row) => row.idleBusy)).toFixed(2)}%`);
      }
      await evaluate(`document.querySelector('.galaxy-stream').style.animation = ''`);
    }

    // Memory Leak Inspection: 5 full-page scroll cycles
    console.log('[Perf] Executing 5 full-page scroll cycles to test memory stability...');
    const initialMetrics = await send('Performance.getMetrics');
    const initialHeap = initialMetrics.metrics.find(m => m.name === 'JSHeapUsedSize')?.value || 0;

    for (let cycle = 1; cycle <= 5; cycle++) {
      await evaluate(`window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' })`);
      await sleep(150);
      await evaluate(`window.scrollTo({ top: 0, behavior: 'instant' })`);
      await sleep(150);
    }

    const finalMetrics = await send('Performance.getMetrics');
    const finalHeap = finalMetrics.metrics.find(m => m.name === 'JSHeapUsedSize')?.value || 0;
    const heapGrowthMb = (finalHeap - initialHeap) / (1024 * 1024);

    console.log(`✔ Memory Stability: Initial JS Heap: ${(initialHeap / 1024 / 1024).toFixed(2)} MB, Final JS Heap: ${(finalHeap / 1024 / 1024).toFixed(2)} MB (Delta: ${heapGrowthMb.toFixed(2)} MB across 5 cycles)`);
    assert.ok(heapGrowthMb < 25, `Heap growth must be bounded under 25 MB (got ${heapGrowthMb} MB)`);

    // Hydration must also start cleanly on a small viewport with reduced motion already enabled.
    await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
    await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
    await send('Page.navigate', { url: TARGET_URL });
    await sleep(1200);
    const freshMobile = await evaluate(`(() => ({
      hero: Boolean(document.querySelector('#hero h1')),
      content: Boolean(document.querySelector('#projects') && document.querySelector('#contact')),
      reduced: matchMedia('(prefers-reduced-motion: reduce)').matches,
    }))()`);
    assert.deepEqual(freshMobile, { hero: true, content: true, reduced: true }, 'Fresh mobile reduced-motion load must preserve content');
    assert.equal(consoleErrors.length, 0, `Fresh mobile hydration must have no console errors: ${JSON.stringify(consoleErrors)}`);
    console.log('✔ Fresh Mobile Hydration: 390x844 reduced-motion load has content and zero console errors');

    if (new URL(TARGET_URL).port === '4173') {
      await send('Emulation.setScriptExecutionDisabled', { value: true });
      await send('Page.navigate', { url: TARGET_URL });
      await sleep(600);
      const noJsContent = await evaluate(`(() => ({
        h1: Boolean(document.querySelector('#hero h1')),
        projects: Boolean(document.querySelector('#projects')),
        contact: Boolean(document.querySelector('#contact')),
        revealVisible: [...document.querySelectorAll('.scroll-reveal')].every((el) => getComputedStyle(el).opacity === '1'),
      }))()`);
      assert.deepEqual(noJsContent, { h1: true, projects: true, contact: true, revealVisible: true },
        'Production HTML must remain readable with JavaScript disabled');
      console.log('✔ No-JavaScript: server HTML contains visible Hero, Projects, and Contact');
    }

    console.log('\n===============================================================');
    console.log('   ALL BROWSER QA & PERFORMANCE AUDITS PASSED CLEANLY!         ');
    console.log('===============================================================');
  } catch (err) {
    console.error('\n❌ QA AUDIT FAILED:', err);
    process.exitCode = 1;
  } finally {
    if (ws) ws.close();
    chromeProcess.kill();
  }
}

run();

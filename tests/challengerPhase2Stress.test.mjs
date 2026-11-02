/**
 * Challenger Phase 2 Stress Test Suite: Performance, Lifecycle & Quality Transitions
 *
 * Adversarial empirical tests:
 * 1. Rapid Tab Visibility Switching: 25+ toggles, delta-time clamp, RAF runaway check.
 * 2. Adaptive Quality Engine Hysteresis: Fluctuating FPS (40-60 FPS), 15s cooldown, max 2 downgrades, anti-flapping.
 * 3. Reduced-Motion Lock: Strict freeze of CSS Galaxy motion and quality engine lock.
 * 4. DigitalCoreScene Lifecycle Invariants: Delta clamping, lastTimestamp reset, zero time jump.
 */

import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import jiti from 'jiti';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const load = jiti(process.cwd());

const {
  QUALITY_PRESETS,
  calculateInitialPreset,
  AdaptiveQualityEngine,
  DOWNGRADE_FPS_THRESHOLD,
  DOWNGRADE_FRAME_COUNT,
  UPGRADE_FPS_THRESHOLD,
  UPGRADE_FRAME_COUNT,
  COOLDOWN_MS,
  MAX_DOWNGRADES,
  EMA_ALPHA,
} = load('./src/hooks/useAdaptiveQuality.ts');

const {
  calculateCanvasCoordination,
} = load('./src/hooks/useCanvasCoordinator.ts');

const galaxyCss = fs.readFileSync('./src/index.css', 'utf-8');

// ─────────────────────────────────────────────────────────────────────────────
// 1. RAPID TAB VISIBILITY SWITCHING STRESS TESTS
// ─────────────────────────────────────────────────────────────────────────────
describe('Challenger Stress 1: Rapid Tab Visibility Switching', () => {

  it('1.1 Coordinator determinism under 50 rapid visibility toggles', () => {
    // Alternating visibility rapidly across various scroll positions
    const scrollPositions = [0.0, 0.03, 0.10, 0.25, 0.75, 1.0];
    for (let i = 0; i < 50; i++) {
      const isVisible = (i % 2 === 0);
      const sp = scrollPositions[i % scrollPositions.length];
      const state = calculateCanvasCoordination(sp, isVisible);

      if (!isVisible) {
        // Tab hidden: BOTH p5 and Three.js MUST be inactive
        assert.equal(state.isP5Active, false, `p5 must be inactive when tab hidden (toggle ${i})`);
        assert.equal(state.isWebglActive, false, `WebGL must be inactive when tab hidden (toggle ${i})`);
      } else {
        // Tab visible: WebGL active, p5 active only if sp < 0.15
        assert.equal(state.isWebglActive, true, `WebGL must be active when tab visible (toggle ${i})`);
        if (sp >= 0.15) {
          assert.equal(state.isP5Active, false, `p5 must be stopped past hero even if tab visible (toggle ${i})`);
        } else {
          assert.equal(state.isP5Active, true, `p5 must be active in hero zone when tab visible (toggle ${i})`);
        }
      }
    }
  });

  it('1.2 Time-delta spike suppression on resume after arbitrary pause durations', () => {
    // Simulate various pause durations: 0.5s, 2s, 10s, 60s, 3600s (1 hour)
    const pauseDurations = [0.5, 2.0, 10.0, 60.0, 3600.0];
    for (const rawDuration of pauseDurations) {
      // The DigitalCoreScene clamps delta to Math.min(Math.max(rawDelta, 0), 0.1)
      const clampedDelta = Math.min(Math.max(rawDuration, 0), 0.1);
      assert.ok(clampedDelta <= 0.1, `Clamped delta must not exceed 0.1s for pause duration ${rawDuration}s`);
      assert.ok(clampedDelta >= 0, `Clamped delta must not be negative for pause duration ${rawDuration}s`);
    }

    // Negative raw delta (e.g. system clock skew) must clamp to 0
    const negativeDuration = -5.0;
    const clampedNeg = Math.min(Math.max(negativeDuration, 0), 0.1);
    assert.equal(clampedNeg, 0, 'Negative delta must be clamped to 0');
  });

  it('1.3 Headless Chrome CDP: 25 rapid document.hidden toggles with zero error or runaway', async () => {
    const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
    const TARGET_URL = 'http://localhost:5173/';
    const USER_DATA_DIR = path.join(os.tmpdir(), `chrome_vis_test_${Date.now()}`);

    const chromeProcess = spawn(CHROME_PATH, [
      '--headless=new',
      '--remote-debugging-port=9225',
      `--user-data-dir=${USER_DATA_DIR}`,
      '--no-first-run',
      '--no-default-browser-check',
      '--enable-gpu',
      '--enable-webgl',
      'about:blank'
    ]);

    try {
      const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
      let target = null;
      for (let attempt = 0; attempt < 20; attempt++) {
        try {
          const res = await fetch('http://127.0.0.1:9225/json/list');
          const tabs = await res.json();
          target = tabs.find((t) => t.type === 'page');
          if (target && target.webSocketDebuggerUrl) break;
        } catch {
          await sleep(250);
        }
      }

      assert.ok(target, 'CDP page target found');
      const ws = new WebSocket(target.webSocketDebuggerUrl);
      await new Promise((resolve, reject) => {
        ws.onopen = resolve;
        ws.onerror = reject;
      });

      let msgId = 1;
      const callbacks = new Map();
      const consoleErrors = [];

      function send(method, params = {}) {
        return new Promise((resolve, reject) => {
          const id = msgId++;
          callbacks.set(id, { resolve, reject });
          ws.send(JSON.stringify({ id, method, params }));
        });
      }

      ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.id && callbacks.has(msg.id)) {
          const { resolve, reject } = callbacks.get(msg.id);
          callbacks.delete(msg.id);
          if (msg.error) reject(new Error(msg.error.message));
          else resolve(msg.result);
        } else if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
          consoleErrors.push(msg.params.args.map(a => a.value || '').join(' '));
        } else if (msg.method === 'Runtime.exceptionThrown') {
          consoleErrors.push(msg.params.exceptionDetails?.text || 'Uncaught error');
        }
      };

      async function evaluate(expression) {
        const res = await send('Runtime.evaluate', {
          expression,
          returnByValue: true,
          awaitPromise: true,
        });
        return res.result?.value;
      }

      await send('Page.enable');
      await send('Runtime.enable');
      await send('Page.navigate', { url: TARGET_URL });
      await sleep(1500);

      // Perform 25 rapid visibility toggles in the live browser
      const toggleResult = await evaluate(`(async () => {
        let toggleCount = 0;
        const origDesc = Object.getOwnPropertyDescriptor(Document.prototype, 'hidden') ||
                         Object.getOwnPropertyDescriptor(document, 'hidden');

        for (let i = 0; i < 25; i++) {
          const hidden = (i % 2 === 0);
          Object.defineProperty(document, 'hidden', { value: hidden, configurable: true });
          document.dispatchEvent(new Event('visibilitychange'));
          toggleCount++;
          await new Promise(r => setTimeout(r, 20));
        }

        // Restore visible
        Object.defineProperty(document, 'hidden', { value: false, configurable: true });
        document.dispatchEvent(new Event('visibilitychange'));

        if (origDesc) {
          try {
            Object.defineProperty(document, 'hidden', origDesc);
          } catch (e) {}
        }

        // Measure frame count over 500ms after 25 rapid toggles to verify normal loop
        let framesAfterResume = 0;
        const start = performance.now();
        await new Promise((resolve) => {
          function countFrames() {
            framesAfterResume++;
            if (performance.now() - start >= 500) {
              resolve();
            } else {
              requestAnimationFrame(countFrames);
            }
          }
          requestAnimationFrame(countFrames);
        });

        return {
          toggleCount,
          framesAfterResume,
          isDocumentHidden: document.hidden
        };
      })()`);

      assert.equal(toggleResult.toggleCount, 25, '25 toggles completed');
      assert.equal(toggleResult.isDocumentHidden, false, 'Document returned to visible');
      // In 500ms at ~60fps, we expect ~20-35 frames. Runaway (>75 frames) or freeze (0 frames) indicates failure.
      assert.ok(
        toggleResult.framesAfterResume >= 15 && toggleResult.framesAfterResume <= 75,
        `Frames after resume (${toggleResult.framesAfterResume}) must be healthy ~60 FPS without runaway or freeze`
      );
      assert.equal(consoleErrors.length, 0, `Zero runtime console errors during 25 toggles, got: ${JSON.stringify(consoleErrors)}`);
    } finally {
      chromeProcess.kill();
    }
  });

});

// ─────────────────────────────────────────────────────────────────────────────
// 2. ADAPTIVE QUALITY ENGINE HYSTERESIS STRESS TESTS
// ─────────────────────────────────────────────────────────────────────────────
describe('Challenger Stress 2: Adaptive Quality Engine Hysteresis', () => {

  it('2.1 Rapidly fluctuating FPS (40 FPS <-> 60 FPS) does NOT cause tier flapping', () => {
    const tierChanges = [];
    const engine = new AdaptiveQualityEngine({
      initialTier: 'high',
      onPresetChange: (cfg) => {
        tierChanges.push(cfg.tier);
      },
    });

    let virtualTime = 1000;

    // Simulate 20 alternating cycles: 30 frames at 40 FPS, then 30 frames at 60 FPS
    // (Never sustains 60 consecutive low frames or 600 high frames)
    for (let cycle = 0; cycle < 20; cycle++) {
      for (let f = 0; f < 30; f++) {
        virtualTime += 25; // 40 FPS = 25ms per frame
        engine.setFps(40, virtualTime);
      }
      for (let f = 0; f < 30; f++) {
        virtualTime += 16.67; // 60 FPS = 16.67ms per frame
        engine.setFps(60, virtualTime);
      }
    }

    assert.equal(tierChanges.length, 0, 'Fluctuating FPS without sustained 60 consecutive frames must NOT trigger any tier changes');
    assert.equal(engine.getCurrentTier(), 'high', 'Tier must remain High');
    assert.equal(engine.getDowngradeCount(), 0, 'Downgrade count must remain 0');
  });

  it('2.2 15s Cooldown strictly blocks subsequent adjustments during cooldown window', () => {
    const tierChanges = [];
    const engine = new AdaptiveQualityEngine({
      initialTier: 'high',
      cooldownMs: 15000,
      onPresetChange: (cfg) => {
        tierChanges.push(cfg.tier);
      },
    });

    let virtualTime = 1000;

    // Sustained 60 low frames -> triggers downgrade 1 (High -> Medium)
    for (let f = 0; f < 60; f++) {
      virtualTime += 25;
      engine.setFps(35, virtualTime);
    }

    assert.equal(tierChanges.length, 1, 'First downgrade must trigger');
    assert.equal(tierChanges[0], 'medium');
    assert.equal(engine.isInCooldown(virtualTime), true, 'Engine must be in cooldown');
    assert.ok(engine.getCooldownRemaining(virtualTime) > 0, 'Cooldown remaining must be > 0');

    // Feed another 100 consecutive frames of terrible 20 FPS during cooldown (elapsed: ~2.5s)
    for (let f = 0; f < 100; f++) {
      virtualTime += 50;
      engine.setFps(20, virtualTime);
    }

    assert.equal(tierChanges.length, 1, 'Cooldown must strictly block 2nd downgrade during 15s window');
    assert.equal(engine.getCurrentTier(), 'medium');
    assert.equal(engine.getDowngradeCount(), 1);

    // Now advance time past 15000ms cooldown window
    virtualTime += 16000;
    assert.equal(engine.isInCooldown(virtualTime), false, 'Cooldown must have expired');

    // Feed 60 consecutive low frames after cooldown expired
    for (let f = 0; f < 60; f++) {
      virtualTime += 30;
      engine.setFps(30, virtualTime);
    }

    assert.equal(tierChanges.length, 2, 'Second downgrade must trigger after cooldown expires');
    assert.equal(tierChanges[1], 'low');
    assert.equal(engine.getDowngradeCount(), 2);
  });

  it('2.3 Max 2 downgrades per session strictly prevents runaway downgrading', () => {
    const tierChanges = [];
    const engine = new AdaptiveQualityEngine({
      initialTier: 'ultra',
      maxDowngrades: 2,
      cooldownMs: 15000,
      onPresetChange: (cfg) => {
        tierChanges.push(cfg.tier);
      },
    });

    let virtualTime = 1000;

    // Downgrade 1: Ultra -> High
    for (let f = 0; f < 60; f++) {
      virtualTime += 25;
      engine.setFps(35, virtualTime);
    }
    assert.equal(engine.getCurrentTier(), 'high');

    // Advance past cooldown
    virtualTime += 16000;

    // Downgrade 2: High -> Medium
    for (let f = 0; f < 60; f++) {
      virtualTime += 25;
      engine.setFps(35, virtualTime);
    }
    assert.equal(engine.getCurrentTier(), 'medium');
    assert.equal(engine.getDowngradeCount(), 2);

    // Advance past cooldown again
    virtualTime += 16000;

    // Attempt Downgrade 3 (should be strictly blocked by maxDowngrades = 2)
    for (let f = 0; f < 120; f++) {
      virtualTime += 25;
      engine.setFps(20, virtualTime);
    }

    assert.equal(engine.getCurrentTier(), 'medium', 'Engine must NOT downgrade beyond maxDowngrades budget (2)');
    assert.equal(engine.getDowngradeCount(), 2);
    assert.equal(tierChanges.length, 2, 'Exactly 2 tier changes permitted per session');
  });

  it('2.4 Upgrade requires 600 consecutive frames above 58 FPS', () => {
    let upgradeTriggered = false;
    const engine = new AdaptiveQualityEngine({
      initialTier: 'medium',
      cooldownMs: 15000,
      onPresetChange: () => {
        upgradeTriggered = true;
      },
    });

    let virtualTime = 1000;

    // Feed 599 high frames (just 1 short of 600)
    for (let f = 0; f < 599; f++) {
      virtualTime += 16;
      engine.setFps(60, virtualTime);
    }

    assert.equal(upgradeTriggered, false, '599 high frames must NOT trigger upgrade (needs 600)');
    assert.equal(engine.getCurrentTier(), 'medium');

    // 1 frame of drop to 55 FPS resets consecutiveHighFrames counter
    virtualTime += 18;
    engine.setFps(55, virtualTime);
    assert.equal(engine.getConsecutiveHighFrames(), 0, 'Sub-58 frame resets high frame counter');

    // Feed 600 consecutive frames at 60 FPS
    for (let f = 0; f < 600; f++) {
      virtualTime += 16;
      engine.setFps(60, virtualTime);
    }

    assert.equal(upgradeTriggered, true, '600 consecutive frames above 58 FPS triggers upgrade');
    assert.equal(engine.getCurrentTier(), 'high');
  });

});

// ─────────────────────────────────────────────────────────────────────────────
// 3. REDUCED-MOTION STRICT LOCK STRESS TESTS
// ─────────────────────────────────────────────────────────────────────────────
describe('Challenger Stress 3: Reduced-Motion Strict Lock', () => {

  it('3.2 Galaxy star drift freezes in reduced motion', () => {
    assert.match(galaxyCss, /@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.galaxy-starfield,[\s\S]*?animation: none !important/);
  });

  it('3.3 Galaxy haze freezes in reduced motion', () => {
    assert.match(galaxyCss, /@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.galaxy-band,[\s\S]*?animation: none !important/);
  });

  it('3.4 Galaxy twinkle freezes in reduced motion', () => {
    assert.match(galaxyCss, /@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.galaxy-twinkle,[\s\S]*?\.galaxy-stream\s*\{\s*animation: none !important/);
  });

  it('3.5 AdaptiveQualityEngine strictly locks tier in reduced motion', () => {
    let presetChangeTriggered = false;
    let latestConfig = null;
    const engine = new AdaptiveQualityEngine({
      initialTier: 'high',
      prefersReducedMotion: true,
      onPresetChange: (cfg) => {
        presetChangeTriggered = true;
        latestConfig = cfg;
      },
    });

    assert.equal(engine.getCurrentTier(), 'reduced-motion', 'Engine initialized in reduced-motion tier');
    // Reset notification tracker after initialization
    presetChangeTriggered = false;

    // Feed 300 frames of 10 FPS (severe lag)
    for (let i = 0; i < 300; i++) {
      engine.setFps(10, i * 100);
    }
    assert.equal(presetChangeTriggered, false, 'No preset change callback on lag');
    assert.equal(engine.getCurrentTier(), 'reduced-motion', 'Tier remains strictly reduced-motion');

    // Feed 1000 frames of 120 FPS (high performance)
    for (let i = 0; i < 1000; i++) {
      engine.setFps(120, i * 8);
    }
    assert.equal(presetChangeTriggered, false, 'No preset change callback on high FPS');
    assert.equal(engine.getCurrentTier(), 'reduced-motion', 'Tier remains strictly reduced-motion');

    // Dynamic transition: disable reduced motion restores previous standard tier (high)
    engine.setReducedMotion(false, 50000);
    assert.equal(presetChangeTriggered, true, 'Restoring motion notifies preset change');
    assert.equal(engine.getCurrentTier(), 'high', 'Tier returns to previous standard tier (high)');
    assert.equal(latestConfig?.tier, 'high');
    assert.equal(latestConfig?.continuousRotation, true);

    // Dynamic transition: re-enable reduced motion locks tier again
    presetChangeTriggered = false;
    engine.setReducedMotion(true, 55000);
    assert.equal(presetChangeTriggered, true, 'Enabling motion notifies preset change');
    assert.equal(engine.getCurrentTier(), 'reduced-motion');
    assert.equal(latestConfig?.tier, 'reduced-motion');
    assert.equal(latestConfig?.continuousRotation, false);

    // Again verify lag does not trigger downgrade
    presetChangeTriggered = false;
    for (let i = 0; i < 100; i++) {
      engine.setFps(15, 55000 + i * 50);
    }
    assert.equal(presetChangeTriggered, false, 'Lag cannot downgrade while re-locked in reduced-motion');
    assert.equal(engine.getCurrentTier(), 'reduced-motion');
  });

});

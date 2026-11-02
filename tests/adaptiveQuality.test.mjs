import assert from 'node:assert/strict';
import {
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
} from '../src/hooks/useAdaptiveQuality.ts';

console.log('--- Running useAdaptiveQuality & Adaptive Rendering Engine Tests ---');

// ── TEST 1: Preset Configurations ───────────────────────────────────────────
{
  assert.equal(QUALITY_PRESETS['ultra'].dpr, 1.5, 'Ultra DPR should be 1.5');
  assert.equal(QUALITY_PRESETS['ultra'].particles, 1400, 'Ultra particles should be 1400');
  assert.equal(QUALITY_PRESETS['ultra'].continuousRotation, true, 'Ultra continuousRotation should be true');

  assert.equal(QUALITY_PRESETS['high'].dpr, 1.25, 'High DPR should be 1.25');
  assert.equal(QUALITY_PRESETS['high'].particles, 1000, 'High particles should be 1000');
  assert.equal(QUALITY_PRESETS['high'].continuousRotation, true, 'High continuousRotation should be true');

  assert.equal(QUALITY_PRESETS['medium'].dpr, 1.0, 'Medium DPR should be 1.0');
  assert.equal(QUALITY_PRESETS['medium'].particles, 600, 'Medium particles should be 600');
  assert.equal(QUALITY_PRESETS['medium'].continuousRotation, true, 'Medium continuousRotation should be true');

  assert.equal(QUALITY_PRESETS['low'].dpr, 0.75, 'Low DPR should be 0.75');
  assert.equal(QUALITY_PRESETS['low'].particles, 250, 'Low particles should be 250');
  assert.equal(QUALITY_PRESETS['low'].continuousRotation, true, 'Low continuousRotation should be true');

  assert.equal(QUALITY_PRESETS['reduced-motion'].dpr, 1.0, 'Reduced motion DPR should be 1.0');
  assert.equal(QUALITY_PRESETS['reduced-motion'].continuousRotation, false, 'Reduced motion continuousRotation must be false');
  console.log('✓ Test 1 Passed: All 5 Quality Preset Configurations Verified');
}

// ── TEST 2: Device Capability Heuristics ────────────────────────────────────
{
  // Mobile / Touch device
  const mobilePreset = calculateInitialPreset({ isTouch: true, innerWidth: 390, hardwareConcurrency: 4 });
  assert.equal(mobilePreset, 'medium', 'Touch device should initialize to medium preset');

  // Small viewport
  const smallScreenPreset = calculateInitialPreset({ isTouch: false, innerWidth: 640, hardwareConcurrency: 8 });
  assert.equal(smallScreenPreset, 'medium', 'Small viewport (<768) should initialize to medium preset');

  // Low CPU concurrency
  const lowConcurrencyPreset = calculateInitialPreset({ isTouch: false, innerWidth: 1920, hardwareConcurrency: 2 });
  assert.equal(lowConcurrencyPreset, 'medium', 'Low concurrency (<4) should initialize to medium preset');

  // High-performance desktop
  const ultraPreset = calculateInitialPreset({ isTouch: false, innerWidth: 1920, hardwareConcurrency: 12 });
  assert.equal(ultraPreset, 'ultra', 'High concurrency + large desktop should initialize to ultra preset');

  // Standard desktop
  const highPreset = calculateInitialPreset({ isTouch: false, innerWidth: 1280, hardwareConcurrency: 6 });
  assert.equal(highPreset, 'high', 'Standard desktop should initialize to high preset');

  // Prefers reduced motion overrides all
  const reducedPreset = calculateInitialPreset({ prefersReducedMotion: true, innerWidth: 2560, hardwareConcurrency: 16 });
  assert.equal(reducedPreset, 'reduced-motion', 'Prefers reduced motion must override device specs to reduced-motion');
  console.log('✓ Test 2 Passed: Device Capability Heuristics Verified');
}

// ── TEST 3: 60-Frame EMA Mathematical Smoothing ────────────────────────────
{
  const engine = new AdaptiveQualityEngine({ initialTier: 'high' });
  let t = 1000;

  // Initialize with 60 FPS
  engine.setFps(60, t);
  assert.equal(engine.getEmaFps(), 60, 'Initial EMA FPS should equal first input');

  // Input 30 FPS frame: EMA = (alpha * 30) + ((1 - alpha) * 60)
  t += 16;
  engine.setFps(30, t);
  const expectedEma = (EMA_ALPHA * 30) + ((1 - EMA_ALPHA) * 60);
  assert.ok(Math.abs(engine.getEmaFps() - expectedEma) < 1e-6, 'EMA must match mathematical formula');
  console.log('✓ Test 3 Passed: 60-Frame EMA Formula & Precision Verified');
}

// ── TEST 4: Downgrade Trigger & 15-Second Cooldown Hysteresis ───────────────
{
  let currentConfig = null;
  const engine = new AdaptiveQualityEngine({
    initialTier: 'high',
    cooldownMs: COOLDOWN_MS,
    onPresetChange: (cfg) => { currentConfig = cfg; },
  });

  let t = 0;
  // Initialize directly at a low FPS (30 FPS) so emaFps starts at 30 (< 45)
  engine.setFps(30, t);
  assert.equal(engine.getConsecutiveLowFrames(), 1);

  // Feed 58 more frames of 30 FPS (total 59 frames) -> should not trigger downgrade yet
  for (let i = 0; i < DOWNGRADE_FRAME_COUNT - 2; i++) {
    t += 16;
    engine.setFps(30, t);
  }
  assert.equal(engine.getConsecutiveLowFrames(), 59);
  assert.equal(engine.getCurrentTier(), 'high', 'Must not downgrade before 60 consecutive low frames');

  // 60th frame of low FPS -> triggers downgrade from 'high' to 'medium'
  t += 16;
  engine.setFps(30, t);
  assert.equal(engine.getCurrentTier(), 'medium', 'Must downgrade to medium on 60th low frame');
  assert.equal(engine.getDowngradeCount(), 1, 'Downgrade count should be 1');
  assert.ok(engine.isInCooldown(t), 'Engine must enter cooldown immediately after adjustment');

  // Feed another 100 low frames during cooldown (e.g. t + 5000ms < 15000ms cooldown)
  const duringCooldown = t + 5000;
  for (let i = 0; i < 100; i++) {
    engine.setFps(25, duringCooldown + i * 16);
  }
  assert.equal(engine.getCurrentTier(), 'medium', 'Must NOT oscillate or downgrade again during 15s cooldown');
  assert.equal(engine.getDowngradeCount(), 1, 'Downgrade count must remain 1 during cooldown');

  // Advance time past cooldown (>15000ms) and feed 60 low frames -> second downgrade to 'low'
  let postCooldown = t + COOLDOWN_MS + 100;
  assert.equal(engine.isInCooldown(postCooldown), false, 'Cooldown should be expired');

  for (let i = 0; i < DOWNGRADE_FRAME_COUNT; i++) {
    postCooldown += 16;
    engine.setFps(25, postCooldown);
  }
  assert.equal(engine.getCurrentTier(), 'low', 'Must downgrade to low after cooldown expires and 60 low frames sustained');
  assert.equal(engine.getDowngradeCount(), 2, 'Downgrade count should be 2');
  console.log('✓ Test 4 Passed: Downgrade Trigger & 15-Second Cooldown Hysteresis Verified');
}

// ── TEST 5: Maximum 2 Downgrades Per Session Limit ─────────────────────────
{
  const engine = new AdaptiveQualityEngine({
    initialTier: 'high',
    maxDowngrades: MAX_DOWNGRADES,
    cooldownMs: 100, // Short cooldown for testing limit
  });

  let t = 0;
  // First downgrade: high -> medium (feed 60 low frames starting at 20 FPS)
  for (let i = 0; i < DOWNGRADE_FRAME_COUNT; i++) {
    t += 16;
    engine.setFps(20, t);
  }
  assert.equal(engine.getCurrentTier(), 'medium');

  // Advance past cooldown
  t += 200;

  // Second downgrade: medium -> low
  for (let i = 0; i < DOWNGRADE_FRAME_COUNT; i++) {
    t += 16;
    engine.setFps(20, t);
  }
  assert.equal(engine.getCurrentTier(), 'low');
  assert.equal(engine.getDowngradeCount(), 2);

  // Advance past cooldown and feed another 100 low frames -> should NOT downgrade beyond limit
  t += 200;
  for (let i = 0; i < DOWNGRADE_FRAME_COUNT * 2; i++) {
    t += 16;
    engine.setFps(10, t);
  }
  assert.equal(engine.getCurrentTier(), 'low', 'Must respect MAX_DOWNGRADES limit (2)');
  assert.equal(engine.getDowngradeCount(), 2, 'Downgrade count must not exceed 2');
  console.log('✓ Test 5 Passed: Maximum Downgrades Limit (2) Strictly Enforced');
}

// ── TEST 6: Upgrade Trigger on Sustained High FPS ───────────────────────────
{
  const engine = new AdaptiveQualityEngine({
    initialTier: 'medium',
    cooldownMs: 100,
  });

  let t = 0;
  // Initialize directly with 60 FPS (> 58 FPS)
  engine.setFps(60, t);
  assert.equal(engine.getConsecutiveHighFrames(), 1);

  // Feed 598 more frames of 60 FPS (total 599 frames) -> should not upgrade yet
  for (let i = 0; i < UPGRADE_FRAME_COUNT - 2; i++) {
    t += 16;
    engine.setFps(60, t);
  }
  assert.equal(engine.getConsecutiveHighFrames(), 599);
  assert.equal(engine.getCurrentTier(), 'medium', 'Must not upgrade before 600 consecutive frames');

  // 600th frame of 60 FPS -> triggers upgrade to 'high'
  t += 16;
  engine.setFps(60, t);
  assert.equal(engine.getCurrentTier(), 'high', 'Must upgrade to high after 600 consecutive frames > 58 FPS');
  console.log('✓ Test 6 Passed: Upgrade Trigger on Sustained High Performance Verified');
}

// ── TEST 7: Dynamic Prefers-Reduced-Motion Switching & Restoration ─────────
{
  let currentConfig = null;
  const engine = new AdaptiveQualityEngine({
    initialTier: 'high',
    onPresetChange: (cfg) => { currentConfig = cfg; },
  });

  assert.equal(engine.getCurrentTier(), 'high');

  // User turns on reduced motion
  engine.setReducedMotion(true);
  assert.equal(engine.getCurrentTier(), 'reduced-motion', 'Must switch to reduced-motion');
  assert.equal(engine.getCurrentPreset().continuousRotation, false, 'continuousRotation must be false');

  // While in reduced motion, low FPS frames must not trigger downgrades
  for (let i = 0; i < 200; i++) {
    engine.setFps(15, i * 16);
  }
  assert.equal(engine.getCurrentTier(), 'reduced-motion', 'Must stay in reduced-motion regardless of frame rate');

  // User turns off reduced motion -> restored to previous standard tier ('high')
  engine.setReducedMotion(false);
  assert.equal(engine.getCurrentTier(), 'high', 'Must restore previous tier on reduced motion disable');
  assert.equal(engine.getCurrentPreset().continuousRotation, true, 'continuousRotation must be restored to true');
  console.log('✓ Test 7 Passed: Prefers-Reduced-Motion Dynamic Handling Verified');
}

console.log('\nALL 7 ADAPTIVE QUALITY TEST SUITES PASSED WITH 100% SUCCESSFUL ASSERTIONS!');

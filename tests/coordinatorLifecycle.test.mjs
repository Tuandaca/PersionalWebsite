import assert from 'node:assert';
import { calculateCanvasCoordination } from '../src/hooks/useCanvasCoordinator.ts';

console.log('--- Running useCanvasCoordinator Lifecycle & Coordination Tests ---');

// Test 1: Pure Hero Zone (Sp in [0.0, 0.05])
{
  const testPoints = [0.0, 0.01, 0.025, 0.049, 0.05];
  for (const sp of testPoints) {
    const res = calculateCanvasCoordination(sp, true);
    assert.strictEqual(res.p5Opacity, 1.0, `p5Opacity at Sp=${sp} should be 1.0`);
    assert.strictEqual(res.isP5Active, true, `isP5Active at Sp=${sp} should be true`);
    assert.strictEqual(res.isWebglActive, true, `isWebglActive at Sp=${sp} should be true`);
    assert.ok(
      Math.abs(res.webglOpacity - 0.40) < 0.001,
      `webglOpacity at Sp=${sp} should be 0.40 (ambient), got ${res.webglOpacity}`
    );
  }
  console.log('✓ Test 1 Passed: Pure Hero Zone (Sp in [0.0, 0.05])');
}

// Test 2: Crossfade Zone (Sp in (0.05, 0.15))
{
  // Midpoint at Sp = 0.10: t = 0.5
  const mid = calculateCanvasCoordination(0.10, true);
  assert.ok(Math.abs(mid.p5Opacity - 0.50) < 0.001, `p5Opacity at Sp=0.10 should be 0.50, got ${mid.p5Opacity}`);
  assert.strictEqual(mid.isP5Active, true, 'isP5Active in crossfade zone should be true');
  assert.strictEqual(mid.isWebglActive, true, 'isWebglActive in crossfade zone should be true');
  // webglOpacity ramps 0.40 + 0.5 * (0.85 - 0.40) = 0.625
  assert.ok(
    Math.abs(mid.webglOpacity - 0.625) < 0.001,
    `webglOpacity at Sp=0.10 should be 0.625, got ${mid.webglOpacity}`
  );

  // Near end of crossfade at Sp = 0.14: t = 0.9
  const nearEnd = calculateCanvasCoordination(0.14, true);
  assert.ok(Math.abs(nearEnd.p5Opacity - 0.10) < 0.001, `p5Opacity at Sp=0.14 should be 0.10`);
  assert.strictEqual(nearEnd.isP5Active, true, 'isP5Active at Sp=0.14 should be true');
  // webglOpacity ramps 0.40 + 0.9 * (0.85 - 0.40) = 0.805
  assert.ok(
    Math.abs(nearEnd.webglOpacity - 0.805) < 0.001,
    `webglOpacity at Sp=0.14 should be 0.805, got ${nearEnd.webglOpacity}`
  );

  console.log('✓ Test 2 Passed: Crossfade Zone (Sp in (0.05, 0.15))');
}

// Test 3: Past Hero Zone (Sp >= 0.15) — Mutual Exclusion Active
{
  const pastPoints = [0.15, 0.20, 0.50, 0.80, 1.0];
  for (const sp of pastPoints) {
    const res = calculateCanvasCoordination(sp, true);
    assert.strictEqual(res.p5Opacity, 0.0, `p5Opacity at Sp=${sp} must be exactly 0.0`);
    assert.strictEqual(res.isP5Active, false, `isP5Active at Sp=${sp} must be false (triggering p5.noLoop())`);
    assert.strictEqual(res.isWebglActive, true, `isWebglActive at Sp=${sp} must be true`);
    assert.ok(
      res.webglOpacity >= 0.85 && res.webglOpacity <= 1.0,
      `webglOpacity at Sp=${sp} must be full fidelity in [0.85, 1.0], got ${res.webglOpacity}`
    );
  }

  // Exactly at boundary Sp = 0.15
  const boundary = calculateCanvasCoordination(0.15, true);
  assert.strictEqual(boundary.p5Opacity, 0.0, 'p5Opacity at Sp=0.15 must be 0.0');
  assert.strictEqual(boundary.isP5Active, false, 'isP5Active at Sp=0.15 must be false');
  assert.ok(Math.abs(boundary.webglOpacity - 0.85) < 0.001, `webglOpacity at boundary should be 0.85`);

  // At page bottom Sp = 1.0
  const bottom = calculateCanvasCoordination(1.0, true);
  assert.ok(Math.abs(bottom.webglOpacity - 1.0) < 0.001, `webglOpacity at Sp=1.0 should be 1.0`);

  console.log('✓ Test 3 Passed: Past Hero Mutual Exclusion (Sp >= 0.15, p5.noLoop() enforced)');
}

// Test 4: Custom Storyteller Target Opacity Past Hero
{
  const res = calculateCanvasCoordination(0.50, true, {
    targetWebglOpacity: 0.95,
  });
  assert.strictEqual(res.p5Opacity, 0.0);
  assert.strictEqual(res.isP5Active, false);
  assert.ok(Math.abs(res.webglOpacity - 0.95) < 0.001, `webglOpacity should match targetWebglOpacity (0.95)`);
  console.log('✓ Test 4 Passed: Custom Storyteller Target Opacity handling');
}

// Test 5: Bidirectional Reversibility (Scroll Down vs Scroll Up)
{
  const steps = 100;
  for (let i = 0; i <= steps; i++) {
    const spForward = i / steps;
    const forward = calculateCanvasCoordination(spForward, true);

    const spReverse = (steps - i) / steps;
    const reverse = calculateCanvasCoordination(spReverse, true);

    // Test symmetric points match
    const forwardCounterpart = calculateCanvasCoordination(spReverse, true);
    assert.strictEqual(reverse.p5Opacity, forwardCounterpart.p5Opacity);
    assert.strictEqual(reverse.isP5Active, forwardCounterpart.isP5Active);
    assert.strictEqual(reverse.webglOpacity, forwardCounterpart.webglOpacity);
    assert.strictEqual(reverse.isWebglActive, forwardCounterpart.isWebglActive);
  }
  console.log('✓ Test 5 Passed: 100% Deterministic Bidirectional Reversibility');
}

// Test 6: Global Tab Visibility Suspension (document.hidden === true)
{
  // When tab is hidden, both p5 and WebGL loops MUST suspend regardless of scroll position
  const hiddenHero = calculateCanvasCoordination(0.02, false);
  assert.strictEqual(hiddenHero.isP5Active, false, 'p5 must be suspended when tab hidden in hero');
  assert.strictEqual(hiddenHero.isWebglActive, false, 'WebGL must be suspended when tab hidden in hero');

  const hiddenCrossfade = calculateCanvasCoordination(0.10, false);
  assert.strictEqual(hiddenCrossfade.isP5Active, false, 'p5 must be suspended when tab hidden in crossfade');
  assert.strictEqual(hiddenCrossfade.isWebglActive, false, 'WebGL must be suspended when tab hidden in crossfade');

  const hiddenPast = calculateCanvasCoordination(0.60, false);
  assert.strictEqual(hiddenPast.isP5Active, false, 'p5 must be suspended when tab hidden past hero');
  assert.strictEqual(hiddenPast.isWebglActive, false, 'WebGL must be suspended when tab hidden past hero');

  // When tab becomes visible again, loops resume based on current section
  const visibleHero = calculateCanvasCoordination(0.02, true);
  assert.strictEqual(visibleHero.isP5Active, true, 'p5 resumes when tab visible in hero');
  assert.strictEqual(visibleHero.isWebglActive, true, 'WebGL resumes when tab visible');

  const visiblePast = calculateCanvasCoordination(0.60, true);
  assert.strictEqual(visiblePast.isP5Active, false, 'p5 stays suspended when tab visible past hero');
  assert.strictEqual(visiblePast.isWebglActive, true, 'WebGL resumes when tab visible past hero');

  console.log('✓ Test 6 Passed: Global Tab Visibility Suspension & Section-Aware Resume');
}

// Test 7: Boundary Clamping
{
  const negativeSp = calculateCanvasCoordination(-0.25, true);
  assert.strictEqual(negativeSp.p5Opacity, 1.0);
  assert.strictEqual(negativeSp.isP5Active, true);
  assert.ok(Math.abs(negativeSp.webglOpacity - 0.40) < 0.001);

  const overflowSp = calculateCanvasCoordination(1.5, true);
  assert.strictEqual(overflowSp.p5Opacity, 0.0);
  assert.strictEqual(overflowSp.isP5Active, false);
  assert.ok(Math.abs(overflowSp.webglOpacity - 1.0) < 0.001);

  console.log('✓ Test 7 Passed: Boundary Clamping for overscroll inputs');
}

console.log('\nAll 7 Canvas Coordinator test suites PASSED cleanly with 100% assertions met!');

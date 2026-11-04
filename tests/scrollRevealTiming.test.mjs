import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

console.log('--- Running ScrollReveal Timing & Motion Tests (Task 1.1) ---');

const rootDir = process.cwd();
const scrollRevealPath = path.join(rootDir, 'src', 'hooks', 'useScrollReveal.tsx');
assert.ok(fs.existsSync(scrollRevealPath), 'src/hooks/useScrollReveal.tsx must exist');

const hookSource = fs.readFileSync(scrollRevealPath, 'utf-8');

// 1. Clamp ceiling must be at least 500ms (e.g. Math.min(500, Math.max(0, delay)))
const clampMatch = hookSource.match(/Math\.min\((\d+),\s*Math\.max\(0,\s*delay\)\)/);
assert.ok(clampMatch, 'useScrollReveal.tsx must use Math.min(<ceiling>, Math.max(0, delay)) clamp pattern');

const ceiling = parseInt(clampMatch[1], 10);
assert.ok(
  ceiling >= 500,
  `Clamp ceiling must be at least 500ms to allow smooth staggered animations, but found ${ceiling}ms`
);

// 2. Delay values up to 500ms are accepted without clamping to 180ms
const testDelays = [0, 80, 160, 220, 280, 340, 400, 500];
for (const delay of testDelays) {
  const clamped = Math.min(ceiling, Math.max(0, delay));
  assert.equal(
    clamped,
    delay,
    `Delay ${delay}ms must be preserved without clamping to 180ms (got ${clamped}ms)`
  );
}

// Ensure 180ms legacy clamp is gone
assert.ok(
  !hookSource.includes('Math.min(180,'),
  'Legacy clamp ceiling of 180ms must be replaced with at least 500ms'
);

// 3. When prefers-reduced-motion is true, delay is strictly '0ms'
assert.ok(
  hookSource.includes("isReducedMotion ? '0ms'") || hookSource.includes('isReducedMotion ? "0ms"'),
  "When prefers-reduced-motion is active (isReducedMotion=true), transitionDelay must be strictly '0ms'"
);

console.log('✓ All ScrollReveal timing and motion tests passed successfully!');

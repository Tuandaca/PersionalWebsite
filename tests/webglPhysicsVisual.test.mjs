import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

console.log('--- Running WebGL, Cyber Universe & ForceField Physics Tests (R5, R6) ---');

const rootDir = process.cwd();
const fresnelGlowPath = path.join(rootDir, 'src', 'components', 'DevNetwork', 'shaders', 'fresnelGlow.ts');
const digitalCorePath = path.join(rootDir, 'src', 'components', 'DevNetwork', 'DigitalCoreScene.ts');
const componentPath = path.join(rootDir, 'src', 'Component.tsx');
const appTsxPath = path.join(rootDir, 'src', 'App.tsx');
const indexCssPath = path.join(rootDir, 'src', 'index.css');
const galaxyPath = path.join(rootDir, 'src', 'components', 'GalaxyBackground.tsx');

// ── TEST 1: Requirement R5 — Digital Core Visual Tuning ─────────────────────────
console.log('Testing Test 1: Digital Core Shader & 6-Layer Visual Tuning (R5)...');

const fresnelGlowCode = fs.readFileSync(fresnelGlowPath, 'utf-8');
const digitalCoreCode = fs.readFileSync(digitalCorePath, 'utf-8');

// 1.1 Shader default colors
assert(
  fresnelGlowCode.includes("uColorCore: { value: options?.colorCore ?? new THREE.Color('#01150a') }"),
  'fresnelGlow.ts must default uColorCore to obsidian #01150a'
);
assert(
  fresnelGlowCode.includes("uColor: { value: options?.color ?? new THREE.Color('#00ff87') }"),
  'fresnelGlow.ts must default atmospheric halo to emerald #00ff87'
);

// 1.2 DigitalCoreScene layer parameters
assert(
  digitalCoreCode.includes("color: 0x00ff87") && digitalCoreCode.includes("radius: 3.25"),
  'DigitalCoreScene gimbal ring 3 must be tuned to bright emerald 0x00ff87'
);
assert(
  digitalCoreCode.includes("colorCore: new THREE.Color('#01150a')"),
  'DigitalCoreScene Fresnel core must use obsidian #01150a'
);
assert(
  digitalCoreCode.includes("color: new THREE.Color('#00ff87')"),
  'DigitalCoreScene atmospheric halo must use emerald #00ff87'
);
assert(
  !digitalCoreCode.includes("0x00e5ff"),
  'DigitalCoreScene must eliminate legacy cyan 0x00e5ff in favor of emerald dominance'
);

// 1.3 Section-aware intensity scaling
assert(
  digitalCoreCode.includes('isTextHeavyZone') || digitalCoreCode.includes('textZoneMultiplier'),
  'DigitalCoreScene must implement section-aware intensity scaling'
);
assert(
  digitalCoreCode.includes('Math.abs(this.targetPosition.x) >= 1.0') || digitalCoreCode.includes('Math.abs(this.targetPosition.x) > 1.0'),
  'Section-aware scaling must check lateral displacement (|x| >= 1.0) in text-heavy zones'
);

console.log('✓ Test 1 Passed: Digital Core shader & 6-layer neon-green visual tuning verified.');

// ── TEST 2: Requirement R5 — Global Cyber Universe Background ──────────────────
console.log('Testing Test 2: Global Neon Green Cyber Universe Background (R5)...');

const appTsxCode = fs.readFileSync(appTsxPath, 'utf-8');
const indexCssCode = fs.readFileSync(indexCssPath, 'utf-8');

// 2.1 Deep-space base colors
assert(
  appTsxCode.includes('bg-[#010503]'),
  'App.tsx root container must use deep-space base #010503'
);
assert(
  indexCssCode.includes('background-color: #010503;'),
  'index.css body must use deep-space base #010503'
);

// 2.2 CSS Galaxy replaces the former decorative WebGL universe.
const galaxyCode = fs.readFileSync(galaxyPath, 'utf-8');
assert(appTsxCode.includes('<GalaxyBackground tier={adaptiveQuality.tier}'), 'App must mount Galaxy synchronously');
assert(galaxyCode.includes('seededRandom') && galaxyCode.includes('<circle'), 'Galaxy stars must be deterministic round points');
assert(galaxyCode.includes('aria-hidden="true"'), 'Galaxy is decorative');
assert(indexCssCode.includes('.galaxy-background') && indexCssCode.includes('pointer-events: none'), 'Galaxy must not block pointer events');
assert(indexCssCode.includes('galaxy-band-drift 240s') && indexCssCode.includes('galaxy-drift 170s'), 'Galaxy motion must be slow');
assert(indexCssCode.includes('prefers-reduced-motion: reduce'), 'Galaxy must respect reduced motion');
assert(digitalCoreCode.includes('CanvasTexture') && digitalCoreCode.includes('this.particleSprite?.dispose()'), 'Core point sprite must be round and disposed');

console.log('✓ Test 2 Passed: deterministic CSS Galaxy and round Core particles verified.');

// ── TEST 3: Requirement R6 — Hero ForceField Hacker Glyphs & Physics ────────────
console.log('Testing Test 3: Hero ForceField Hacker Glyphs & Physics Governance (R6)...');

const componentCode = fs.readFileSync(componentPath, 'utf-8');

// 3.1 Strict Binary glyph set
assert(componentCode.includes('BINARY_GLYPHS'), 'Component.tsx must define BINARY_GLYPHS');
assert(componentCode.includes("'0'") && componentCode.includes("'1'"), 'BINARY_GLYPHS must include binary digits');

// 3.2 Monospace font and high-performance texture atlas rendering
assert(componentCode.includes('JetBrains Mono, Courier New, monospace'), 'Component.tsx must configure monospace font');
assert(
  componentCode.includes('buildBinaryAtlas') || componentCode.includes('drawImage'),
  'Component.tsx must use pre-rendered binary texture atlas with drawImage for 60+ FPS'
);
assert(!componentCode.includes('p.point(x, y)'), 'Component.tsx must replace p.point() with glyph rendering');

// 3.3 Particle spacing & character density governance
assert(componentCode.includes('spacing = 22'), 'Component.tsx default spacing must be 22');
assert(componentCode.includes('isMobile ? 450') && componentCode.includes('targetCount') && componentCode.includes('safeSpacing'), 'Component.tsx must cap glyph density by viewport and quality tier');
assert(appTsxCode.includes('spacing={22}'), 'App.tsx must pass spacing={22} to ForceFieldBackground');

// 3.4 Physics preservation
assert(componentCode.includes('applyForceField'), 'Component.tsx must preserve applyForceField');
assert(componentCode.includes('abLen2'), 'Component.tsx must preserve line-segment projection physics');
assert(componentCode.includes('impulseStrength'), 'Component.tsx must preserve mouse velocity impulse');
assert(componentCode.includes('ptVelX[i] += (ox - ptPosX[i]) * rs'), 'Component.tsx must preserve spring restoration');
assert(componentCode.includes('ptVelX[i] *= fr'), 'Component.tsx must preserve friction damping');

// 3.5 Lifecycle preservation
assert(componentCode.includes('useImperativeHandle(ref, () => ({'), 'Component.tsx must expose imperative handle');
assert(componentCode.includes('p5InstanceRef.current.noLoop()'), 'Component.tsx must pause draw loop with p.noLoop()');
assert(componentCode.includes('p5InstanceRef.current.loop()'), 'Component.tsx must resume draw loop with p.loop()');
assert(appTsxCode.includes('isActive={isP5Active}'), 'App.tsx must bind isP5Active lifecycle');

console.log('✓ Test 3 Passed: Hacker glyphs, density governance, physics, and lifecycle verified.');

console.log('\nALL WEBGL, CYBER UNIVERSE & FORCEFIELD PHYSICS TESTS PASSED WITH 100% SUCCESS!');

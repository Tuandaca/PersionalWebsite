import assert from 'node:assert/strict';
import fs from 'node:fs';

const scene = fs.readFileSync('src/components/DevNetwork/DigitalCoreScene.ts', 'utf-8');
const galaxy = fs.readFileSync('src/components/GalaxyBackground.tsx', 'utf-8');

assert.ok(!scene.includes("from './universe'"), 'Decorative universe must not add WebGL renderables');
assert.ok(!scene.includes('universeGroup'), 'Decorative universe group must be removed');
assert.ok(galaxy.includes('<circle') && galaxy.includes('seededRandom'), 'Galaxy points must be deterministic round SVG dots');
assert.ok(!galaxy.includes('requestAnimationFrame'), 'Galaxy must not start another RAF loop');

console.log('CSS Galaxy adds zero Three.js renderables by construction. Runtime draw calls require browser measurement.');

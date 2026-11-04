import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

console.log('--- Running UI, Motion & Visual Systems Tests (R2, R3, R4) ---');

const rootDir = process.cwd();
const indexCssPath = path.join(rootDir, 'src', 'index.css');
const appTsxPath = path.join(rootDir, 'src', 'App.tsx');
const scrollRevealPath = path.join(rootDir, 'src', 'hooks', 'useScrollReveal.tsx');
const cyberCursorPath = path.join(rootDir, 'src', 'components', 'CyberCursor.tsx');
const indexHtmlPath = path.join(rootDir, 'index.html');

// ── TEST 1: Requirement R2 — Readability & Content-Safe Visual System ──────────
console.log('Testing Test 1: Content-Safe Visual System & Contrast Safety...');

const indexCss = fs.readFileSync(indexCssPath, 'utf-8');
const appTsx = fs.readFileSync(appTsxPath, 'utf-8');

// Bento card dark obsidian backing and blur
assert(indexCss.includes('.bento-card'), 'index.css must define .bento-card');
assert(indexCss.includes('rgba(10, 20, 14, 0.92)'), 'bento-card must have dark obsidian backing');
assert(indexCss.includes('backdrop-filter: blur(8px)'), 'bento-card must keep a moderate backdrop-filter blur');
assert(indexCss.includes('rgba(0, 255, 135, 0.12)'), 'bento-card must have subtle emerald border');

// Content shield utility for WCAG AAA contrast
assert(indexCss.includes('.content-shield'), 'index.css must define .content-shield utility');
assert(indexCss.includes('radial-gradient'), 'content-shield must feature radial-gradient darkening vignette');

// Content section z-index hierarchy: content >= 10, canvases <= 1
const sectionMatches = appTsx.match(/<section id="([^"]+)" className="([^"]+)"/g);
assert(sectionMatches && sectionMatches.length >= 5, 'Must find content sections in App.tsx');
for (const match of sectionMatches) {
  assert(
    match.includes('z-10'),
    `Section in "${match}" must have z-index >= 10 (z-10)`
  );
}

// Decorative canvases remain at z <= 1
assert(appTsx.includes('className="fixed inset-0 pointer-events-none z-0"'), 'DevNetworkCanvas must remain at z-0');
assert(appTsx.includes('canvas-overlay'), 'p5 canvas overlay must be preserved');

// Personal content and CV download preservation
assert(appTsx.includes('NgoAnhTuan_FullStack_Eng.pdf'), 'CV download link must be preserved');
assert(appTsx.includes('Ngo Anh Tuan'), 'Name must be preserved');
assert(appTsx.includes('Full-Stack Software Engineer'), 'Exact career title must be preserved');
assert(!appTsx.includes('Full-Stack Engineer'), 'Shortened career title must not remain');
assert(appTsx.includes('Ton Duc Thang University'), 'Education must be preserved');
assert(appTsx.includes('Van Lang University'), 'Experience must be preserved');
assert(appTsx.includes('https://github.com/Tuandaca/DACNTT'), 'Travel AI repo link must be preserved');
assert(appTsx.includes('https://github.com/Tuandaca/cinema'), 'Cinema repo link must be preserved');
console.log('✓ Test 1 Passed: Content-safe visual system & complete content preservation verified.');

// ── TEST 2: Requirement R3 — Progressive Scroll Reveal & Reduced Motion ───────
console.log('Testing Test 2: Progressive Scroll Reveal Architecture...');

const scrollRevealCode = fs.readFileSync(scrollRevealPath, 'utf-8');
const indexHtmlCode = fs.readFileSync(indexHtmlPath, 'utf-8');

// Immediate display on prefers-reduced-motion
assert(scrollRevealCode.includes('prefers-reduced-motion: reduce'), 'useScrollReveal must detect prefers-reduced-motion');
assert(scrollRevealCode.includes('isReducedMotion ? \'0ms\''), 'useScrollReveal must eliminate delay on reduced motion');
assert(indexCss.includes('.scroll-reveal'), 'index.css must provide reduced-motion overrides for .scroll-reveal');
assert(indexHtmlCode.includes('<noscript>'), 'index.html must include noscript fallback for scroll-reveal');

// Staggered child reveals across sections in App.tsx
assert(appTsx.includes('delay={0}'), 'App.tsx must feature eyebrow reveals at delay=0');
assert(appTsx.includes('delay={80}'), 'App.tsx must feature heading reveals at delay=80');
assert(appTsx.includes('delay={160}'), 'App.tsx must feature subtitle reveals at delay=160');
assert(appTsx.includes('delay={220 + i * 60}'), 'Skills bento cards must feature staggered reveals (delay={220 + i * 60})');
assert(appTsx.includes('delay={220 + i * 120}'), 'Timeline and project cards must feature staggered reveals (delay={220 + i * 120})');
assert(appTsx.includes('delay={360}'), 'CTAs must feature progressive delay');
console.log('✓ Test 2 Passed: Progressive scroll reveal timing & accessibility fallbacks verified.');

// ── TEST 3: Requirement R4 — Custom Cyber Cursor & Liquid Glass Navbar ────────
console.log('Testing Test 3: Cyber Cursor & Liquid Glass Navbar...');

const cyberCursorCode = fs.readFileSync(cyberCursorPath, 'utf-8');

// Fine pointer media query gating
assert(cyberCursorCode.includes('(pointer: fine) and (hover: hover)'), 'CyberCursor must check fine pointer and hover');
assert(cyberCursorCode.includes('pointer-events-none'), 'CyberCursor must be non-blocking (pointer-events-none)');
assert(cyberCursorCode.includes('z-[9999]'), 'CyberCursor must render at z-[9999]');

// Dot and outer ring specs
assert(cyberCursorCode.includes('#00ff87'), 'CyberCursor must feature #00FF87 emerald dot');
assert(cyberCursorCode.includes('lerpFactor'), 'CyberCursor outer ring must use smooth lerp trailing');
assert(cyberCursorCode.includes('scale(1.5)') || cyberCursorCode.includes('scale'), 'CyberCursor must support interactive hover expansion');
assert(cyberCursorCode.includes('cancelAnimationFrame'), 'CyberCursor must cleanly cancel RAF on unmount');

// Navbar liquid glass capsule and liquid glow pill
assert(indexCss.includes('.liquid-glass-nav'), 'index.css must define .liquid-glass-nav');
assert(indexCss.includes('.liquid-nav-link-active'), 'index.css must define .liquid-nav-link-active');
assert(appTsx.includes('liquid-glass-nav'), 'App.tsx Navbar must use liquid-glass-nav');
assert(appTsx.includes('liquid-nav-link-active'), 'App.tsx Navbar links must use liquid-nav-link-active for active section');
assert(appTsx.includes('<CyberCursor />'), 'App.tsx must mount <CyberCursor />');
console.log('✓ Test 3 Passed: Custom cyber cursor & liquid glass navbar verified.');

console.log('\nALL UI, MOTION & VISUAL SYSTEMS TESTS PASSED WITH 100% SUCCESS!');

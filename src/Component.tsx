import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import p5 from 'p5';
import type { QualityConfig, QualityTier } from './hooks/useAdaptiveQuality';

export const BINARY_GLYPHS = ['0', '1'] as const;
export const HACKER_GLYPHS = ['0', '1'] as const; // backwards-compatible alias

export interface ForceFieldBackgroundProps {
  /**
   * URL of the image to use as the base for the particle field.
   * If omitted, a high-contrast procedural mountain landscape pattern is generated locally.
   * @default ""
   */
  imageUrl?: string;
  /**
   * Base hue for the color palette (0-360)
   * @default 210
   */
  hue?: number;
  /**
   * Color saturation (0-100)
   * @default 100
   */
  saturation?: number;
  /**
   * Brightness threshold for particle visibility (0-255)
   * @default 255
   */
  threshold?: number;
  /**
   * Minimum stroke weight for particles
   * @default 2
   */
  minStroke?: number;
  /**
   * Maximum stroke weight for particles
   * @default 6
   */
  maxStroke?: number;
  /**
   * Spacing between particles (lower = more density)
   * @default 22
   */
  spacing?: number;
  /**
   * Noise scale for particle placement irregularity
   * @default 0
   */
  noiseScale?: number;
  /**
   * Density factor (probability of particle existence)
   * @default 2.0
   */
  density?: number;
  /**
   * Invert the source image brightness mapping
   * @default true
   */
  invertImage?: boolean;
  /**
   * Invert the wireframe/particle visibility condition
   * @default true
   */
  invertWireframe?: boolean;
  /**
   * Enable the magnifier/force field effect
   * @default true
   */
  magnifierEnabled?: boolean;
  /**
   * Radius of the force field effect around the cursor
   * @default 175
   */
  magnifierRadius?: number;
  /**
   * Strength of the force pushing particles away
   * @default 18
   */
  forceStrength?: number;
  /**
   * Friction factor for particle movement (0-1)
   * @default 0.86
   */
  friction?: number;
  /**
   * Speed at which particles return to original position
   * @default 0.14
   */
  restoreSpeed?: number;
  /**
   * Cursor follow responsiveness (0 to 1, higher = faster/snappier, >=0.95 = immediate)
   * @default 0.96
   */
  magnifierInertia?: number;
  /**
   * Additional CSS class names
   */
  className?: string;
  /**
   * Whether the particle physics and draw loop is active.
   * When false (scrolled past hero, Sp >= 0.15), calls p.noLoop() to halt CPU draw load.
   * When true, calls p.loop() to resume physics simulation.
   * @default true
   */
  isActive?: boolean;
  /**
   * External opacity multiplier (0.0 to 1.0) for smooth crossfading
   * @default 1.0
   */
  opacity?: number;
  /**
   * Adaptive quality preset or tier
   */
  qualityPreset?: QualityConfig | QualityTier;
}

export interface ForceFieldBackgroundHandle {
  pause: () => void;
  resume: () => void;
  getP5: () => p5 | null;
}

/**
 * Creates a procedural fallback landscape data URL in case external image loading
 * fails (due to CORS, rate limits, or offline status).
 */
function createFallbackImagePattern(): string {
  if (typeof document === 'undefined') return '';
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 360;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Sky gradient
  const skyGrad = ctx.createLinearGradient(0, 0, 0, 360);
  skyGrad.addColorStop(0, '#05070f');
  skyGrad.addColorStop(0.5, '#1e293b');
  skyGrad.addColorStop(1, '#0f172a');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, 640, 360);

  // Procedural mountain peaks
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(0, 260);
  ctx.lineTo(80, 180);
  ctx.lineTo(160, 240);
  ctx.lineTo(240, 130);
  ctx.lineTo(340, 220);
  ctx.lineTo(440, 90);
  ctx.lineTo(540, 210);
  ctx.lineTo(640, 160);
  ctx.lineTo(640, 360);
  ctx.lineTo(0, 360);
  ctx.closePath();
  ctx.fill();

  // Foreground peaks
  ctx.fillStyle = '#aaaaaa';
  ctx.beginPath();
  ctx.moveTo(0, 300);
  ctx.lineTo(120, 220);
  ctx.lineTo(280, 290);
  ctx.lineTo(420, 190);
  ctx.lineTo(560, 270);
  ctx.lineTo(640, 230);
  ctx.lineTo(640, 360);
  ctx.lineTo(0, 360);
  ctx.closePath();
  ctx.fill();

  return canvas.toDataURL();
}

interface AtlasGlyph {
  sx: number;
  sy: number;
  sw: number;
  sh: number;
  hw: number;
  hh: number;
}

interface BinaryAtlas {
  canvas: HTMLCanvasElement;
  glyphs: AtlasGlyph[][][];
}

/**
 * Pre-renders binary glyph atlas into a single unified sprite sheet:
 * atlas.glyphs[digit: 0|1][shade: 0..paletteLength-1][sizeLevel: 0..2]
 * Consolidates the 72 individual canvas glyphs into a single unified texture atlas,
 * eliminating GPU texture swaps and text layout overhead in the main draw loop.
 */
function buildBinaryAtlas(paletteColors: p5.Color[]): BinaryAtlas | null {
  if (typeof document === 'undefined') return null;
  const sizes = [11, 14, 18];
  const glyphs: AtlasGlyph[][][] = [];

  const paletteLen = paletteColors.length || 12;
  const maxTileW = 44;
  const maxTileH = 44;
  const atlasWidth = maxTileW * paletteLen + 16;
  const atlasHeight = maxTileH * (2 * sizes.length) + 16;

  const atlasCanvas = document.createElement('canvas');
  atlasCanvas.width = atlasWidth;
  atlasCanvas.height = atlasHeight;
  const ctx = atlasCanvas.getContext('2d');
  if (!ctx) return null;

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  let currentY = 2;

  for (let digit = 0; digit <= 1; digit++) {
    glyphs[digit] = [];
    const char = digit === 0 ? '0' : '1';

    for (let sz = 0; sz < sizes.length; sz++) {
      const fontSize = sizes[sz];
      const pad = sz === 2 ? 8 : 4;
      const tileW = Math.ceil(fontSize * 1.4) + pad * 2;
      const tileH = Math.ceil(fontSize * 1.4) + pad * 2;
      const hw = tileW >> 1;
      const hh = tileH >> 1;

      let currentX = 2;

      for (let s = 0; s < paletteColors.length; s++) {
        if (!glyphs[digit][s]) glyphs[digit][s] = [];

        const col = paletteColors[s];
        const colHex = col ? col.toString('#rrggbb') : '#00ff87';

        ctx.save();
        ctx.font = `600 ${fontSize}px "JetBrains Mono", "Courier New", monospace`;
        if (sz === 2) {
          ctx.shadowColor = '#00ff87';
          ctx.shadowBlur = 6;
        }
        ctx.fillStyle = colHex;
        ctx.fillText(char, currentX + hw, currentY + hh);
        ctx.restore();

        glyphs[digit][s][sz] = {
          sx: currentX,
          sy: currentY,
          sw: tileW,
          sh: tileH,
          hw,
          hh,
        };

        currentX += tileW + 2;
      }
      currentY += tileH + 2;
    }
  }

  return { canvas: atlasCanvas, glyphs };
}

/**
 * ForceFieldBackground
 *
 * Interactive, high-performance binary ForceField suspended in digital space.
 * Features:
 * - Binary digits only ('0' and '1') responding to mouse physics and local repulsion.
 * - Sub-millisecond GPU texture blitting via pre-rendered binary glyph atlas.
 * - Uniform spatial grid partitioning limiting cursor physics checks to nearby cells.
 * - Immediate cursor responsiveness (negligible input latency).
 * - Organic, subtle binary flip cadence (~1.5–4.0s) with increased activity near cursor.
 * - StrictMode-safe and zero-allocation frame loop.
 */
export const ForceFieldBackground = forwardRef<ForceFieldBackgroundHandle, ForceFieldBackgroundProps>(
  function ForceFieldBackground(
    {
      imageUrl = "",
      hue = 135,
      saturation = 95,
      threshold = 255,
      minStroke = 1.5,
      maxStroke = 5,
      spacing = 22,
      noiseScale = 0,
      density = 2.0,
      invertImage = true,
      invertWireframe = true,
      magnifierEnabled = true,
      magnifierRadius = 175,
      forceStrength = 18,
      friction = 0.86,
      restoreSpeed = 0.14,
      magnifierInertia = 0.96,
      className = "",
      isActive = true,
      opacity = 1.0,
      qualityPreset,
    },
    ref
  ) {
    const containerRef = useRef<HTMLDivElement>(null);
    const p5ContainerRef = useRef<HTMLDivElement>(null);
    const p5InstanceRef = useRef<p5 | null>(null);
    const isLoopingRef = useRef<boolean>(isActive);
    const isResumePendingRef = useRef<boolean>(true);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Imperative pause/resume handle
    useImperativeHandle(ref, () => ({
      pause: () => {
        if (p5InstanceRef.current && isLoopingRef.current) {
          p5InstanceRef.current.noLoop();
          isLoopingRef.current = false;
        }
      },
      resume: () => {
        if (p5InstanceRef.current && !isLoopingRef.current) {
          isResumePendingRef.current = true;
          p5InstanceRef.current.loop();
          isLoopingRef.current = true;
        }
      },
      getP5: () => p5InstanceRef.current,
    }));

    // Keep latest props in ref to access inside p5 closure without re-instantiating
    const propsRef = useRef({
      hue, saturation, threshold, minStroke, maxStroke, spacing, noiseScale,
      density, invertImage, invertWireframe, magnifierEnabled, magnifierRadius,
      forceStrength, friction, restoreSpeed, magnifierInertia, isActive, opacity,
      qualityPreset
    });

    useEffect(() => {
      propsRef.current = {
        hue, saturation, threshold, minStroke, maxStroke, spacing, noiseScale,
        density, invertImage, invertWireframe, magnifierEnabled, magnifierRadius,
        forceStrength, friction, restoreSpeed, magnifierInertia, isActive, opacity,
        qualityPreset
      };
    }, [
      hue, saturation, threshold, minStroke, maxStroke, spacing, noiseScale,
      density, invertImage, invertWireframe, magnifierEnabled, magnifierRadius,
      forceStrength, friction, restoreSpeed, magnifierInertia, isActive, opacity,
      qualityPreset
    ]);

    // Synchronize external isActive prop with p5 draw loop (pause/resume)
    useEffect(() => {
      const p5Inst = p5InstanceRef.current;
      if (!p5Inst) return;

      if (isActive) {
        if (!isLoopingRef.current) {
          isResumePendingRef.current = true;
          p5Inst.loop();
          isLoopingRef.current = true;
        }
      } else {
        if (isLoopingRef.current) {
          p5Inst.noLoop();
          isLoopingRef.current = false;
        }
      }
    }, [isActive]);

    useEffect(() => {
      if (!containerRef.current || !p5ContainerRef.current) return;

      // Cleanup previous instance if exists (rely purely on p5.remove for native canvas detachment)
      if (p5InstanceRef.current) {
        try {
          p5InstanceRef.current.remove();
        } catch (err) {
          console.warn('ForceFieldBackground: Error removing previous p5 instance', err);
        }
        p5InstanceRef.current = null;
      }

      // Shared cursor state across DOM listeners and p5 sketch
      const pointerState = {
        x: 0,
        y: 0,
        active: false,
        lastActivityMs: 0,
      };

      const sketch = (p: p5) => {
        let originalImg: p5.Image;
        let img: p5.Image;
        let imgPixels: Uint8ClampedArray | null = null;
        let palette: p5.Color[] = [];
        let binaryAtlas: BinaryAtlas | null = null;

        // Fixed 60Hz physics accumulator state
        const FIXED_DT = 16.667;
        let physicsAccumulator = 0;
        let lastPhysicsTime = performance.now();

        // Flat typed arrays for particle data — zero GC, cache-friendly
        let ptPosX: Float32Array = new Float32Array(0);
        let ptPosY: Float32Array = new Float32Array(0);
        let ptOrigX: Float32Array = new Float32Array(0);
        let ptOrigY: Float32Array = new Float32Array(0);
        let ptVelX: Float32Array = new Float32Array(0);
        let ptVelY: Float32Array = new Float32Array(0);
        let ptBinary: Uint8Array = new Uint8Array(0);
        let ptFlipTime: Float32Array = new Float32Array(0);
        let ptShadeIdx: Uint8Array = new Uint8Array(0);
        let ptVisible: Uint8Array = new Uint8Array(0);
        let ptCount = 0;

        // Uniform Spatial Grid for fast O(1) local cursor query
        let gridCols = 0;
        let gridRows = 0;
        let gridCellSize = 160;
        let gridHead: Int32Array = new Int32Array(0);
        let gridNext: Int32Array = new Int32Array(0);

        // State tracking to detect prop changes
        let lastHue = -1;
        let lastSaturation = -1;
        let lastSpacing = -1;
        let lastNoiseScale = -1;
        let lastDensity = -1;
        let lastInvertImage: boolean | null = null;
        let isReducedMotion = false;

        // Cursor tracking
        let curX = 0;
        let curY = 0;
        let prevX = 0;
        let prevY = 0;
        let hasUserInteracted = false;
        let interactiveFrameRate = false;

        // ─── Image loading ────────────────────────────────────────────────────────
        p.preload = () => {
          const sourceUrl = imageUrl || createFallbackImagePattern();
          p.loadImage(
            sourceUrl,
            (loadedImg) => {
              originalImg = loadedImg;
              setIsLoading(false);
            },
            (err) => {
              console.warn("Failed to load primary image, generating procedural fallback:", err);
              const fallbackUrl = createFallbackImagePattern();
              if (fallbackUrl) {
                p.loadImage(
                  fallbackUrl,
                  (fbImg) => { originalImg = fbImg; setIsLoading(false); },
                  () => { setError("Failed to load image"); setIsLoading(false); }
                );
              } else {
                setError("Failed to load image");
                setIsLoading(false);
              }
            }
          );
        };

        // ─── Setup ────────────────────────────────────────────────────────────────
        p.setup = () => {
          if (!containerRef.current) return;
          const cw = containerRef.current.clientWidth || window.innerWidth;
          const ch = containerRef.current.clientHeight || window.innerHeight;
          p.pixelDensity(1); // Decorative canvas does not need full Retina fill rate.
          p.createCanvas(cw, ch);
          p.frameRate(30);

          curX = prevX = p.width / 2;
          curY = prevY = p.height / 2;

          p.textFont('JetBrains Mono, Courier New, monospace');
          p.textAlign(p.CENTER, p.CENTER);

          if (typeof window !== 'undefined' && window.matchMedia) {
            isReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
          }

          if (originalImg) {
            processImage();
            generatePalette(propsRef.current.hue, propsRef.current.saturation);
            binaryAtlas = buildBinaryAtlas(palette);
            generatePoints();
          }

          // Initialize loop state based on isActive prop
          if (!propsRef.current.isActive) {
            p.noLoop();
            isLoopingRef.current = false;
          } else {
            isLoopingRef.current = true;
          }
        };

        p.windowResized = () => {
          if (!containerRef.current) return;
          const cw = containerRef.current.clientWidth || window.innerWidth;
          const ch = containerRef.current.clientHeight || window.innerHeight;
          if (cw > 0 && ch > 0) {
            p.resizeCanvas(cw, ch);
            if (originalImg) {
              processImage();
              generatePoints();
            }
          }
        };

        // ─── Image processing ─────────────────────────────────────────────────────
        function processImage() {
          if (!originalImg) return;
          img = originalImg.get();
          if (p.width > 0 && p.height > 0) img.resize(p.width, p.height);
          img.filter(p.GRAY);

          if (propsRef.current.invertImage) {
            img.loadPixels();
            for (let i = 0; i < img.pixels.length; i += 4) {
              img.pixels[i]     = 255 - img.pixels[i];
              img.pixels[i + 1] = 255 - img.pixels[i + 1];
              img.pixels[i + 2] = 255 - img.pixels[i + 2];
            }
            img.updatePixels();
          }

          // Cache pixel array once — never call loadPixels() in draw loop
          img.loadPixels();
          imgPixels = img.pixels as unknown as Uint8ClampedArray;
          lastInvertImage = propsRef.current.invertImage;
        }

        // ─── Palette ──────────────────────────────────────────────────────────────
        function generatePalette(h: number, s: number) {
          palette = [];
          p.push();
          p.colorMode(p.HSL);
          for (let i = 0; i < 12; i++) {
            const lightness = p.map(i, 0, 11, 95, 10);
            palette.push(p.color(h, s, lightness));
          }
          p.pop();
        }

        // ─── Spatial Grid Construction ────────────────────────────────────────────
        function buildSpatialGrid(width: number, height: number) {
          gridCellSize = Math.max(120, Math.round(propsRef.current.magnifierRadius || 175));
          gridCols = Math.max(1, Math.ceil(width / gridCellSize));
          gridRows = Math.max(1, Math.ceil(height / gridCellSize));

          const cellCount = gridCols * gridRows;
          gridHead = new Int32Array(cellCount).fill(-1);
          gridNext = new Int32Array(ptCount).fill(-1);

          for (let i = 0; i < ptCount; i++) {
            const col = Math.min(gridCols - 1, Math.max(0, (ptOrigX[i] / gridCellSize) | 0));
            const row = Math.min(gridRows - 1, Math.max(0, (ptOrigY[i] / gridCellSize) | 0));
            const cellIdx = row * gridCols + col;
            gridNext[i] = gridHead[cellIdx];
            gridHead[cellIdx] = i;
          }
        }

        // ─── Point generation ─────────────────────────────────────────────────────
        function generatePoints() {
          if (!img) return;
          const { spacing: sp, density: den, noiseScale: ns, qualityPreset: qPreset } = propsRef.current;
          const isMobile = (p.width > 0 && p.width < 768) || (typeof window !== 'undefined' && window.innerWidth < 768);
          const tier = typeof qPreset === 'string' ? qPreset : (qPreset?.tier || 'high');
          const targetCount = isMobile ? 450 : tier === 'ultra' ? 2400 : tier === 'high' ? 2000 : tier === 'medium' ? 1300 : tier === 'low' ? 750 : 500;
          const safeSpacing = Math.max(8, Math.ceil(Math.max(sp || 0, Math.sqrt(img.width * img.height / targetCount))));

          // Count first to allocate typed arrays exactly once
          let count = 0;
          for (let y = 0; y < img.height; y += safeSpacing) {
            for (let x = 0; x < img.width; x += safeSpacing) {
              if (p.random() <= den) count++;
            }
          }

          ptPosX     = new Float32Array(count);
          ptPosY     = new Float32Array(count);
          ptOrigX    = new Float32Array(count);
          ptOrigY    = new Float32Array(count);
          ptVelX     = new Float32Array(count);
          ptVelY     = new Float32Array(count);
          ptBinary   = new Uint8Array(count);
          ptFlipTime = new Float32Array(count);
          ptShadeIdx = new Uint8Array(count);
          ptVisible  = new Uint8Array(count);
          ptCount    = 0;

          const nowSec = p.millis() * 0.001;
          const palLen = palette.length;
          const thr = propsRef.current.threshold;
          const invert = propsRef.current.invertWireframe;
          const imgW = img.width;
          const imgH = img.height;

          // Reproducible pseudo-random distribution
          p.randomSeed(42);
          for (let y = 0; y < img.height; y += safeSpacing) {
            for (let x = 0; x < img.width; x += safeSpacing) {
              const skip = p.random() > den;
              if (skip) continue;

              const nx = ns > 0 ? (p.noise(x * ns, y * ns) - 0.5) * safeSpacing : 0;
              const ny = ns > 0 ? (p.noise((x + 500) * ns, (y + 500) * ns) - 0.5) * safeSpacing : 0;
              const posX = x + nx;
              const posY = y + ny;

              ptOrigX[ptCount] = ptPosX[ptCount] = posX;
              ptOrigY[ptCount] = ptPosY[ptCount] = posY;
              ptVelX[ptCount]  = 0;
              ptVelY[ptCount]  = 0;

              // Pseudo-random initial binary state ~50% 0, 50% 1
              ptBinary[ptCount] = p.random() > 0.5 ? 1 : 0;
              // Staggered initial flip timers across 1.5 - 4.0 seconds
              ptFlipTime[ptCount] = nowSec + 1.5 + p.random() * 2.5;

              // Pre-calculate visibility and shade index from source pixels
              if (imgPixels) {
                const pixX = posX < 0 ? 0 : posX >= imgW ? imgW - 1 : posX | 0;
                const pixY = posY < 0 ? 0 : posY >= imgH ? imgH - 1 : posY | 0;
                const brightness = imgPixels[(pixX + pixY * imgW) * 4];
                const isVis = invert ? brightness < thr : brightness > thr;
                ptVisible[ptCount] = isVis ? 1 : 0;

                let shade = ((brightness / 255) * (palLen - 1)) | 0;
                if (shade < 0) shade = 0;
                if (shade >= palLen) shade = palLen - 1;
                ptShadeIdx[ptCount] = shade;
              } else {
                ptVisible[ptCount] = 1;
                ptShadeIdx[ptCount] = (ptCount % palLen);
              }

              ptCount++;
            }
          }
          p.randomSeed(Date.now());

          // Build uniform spatial acceleration grid
          buildSpatialGrid(p.width, p.height);

          lastSpacing    = sp;
          lastNoiseScale = ns;
          lastDensity    = den;
        }

        // ─── Physics with Spatial Partitioning ────────────────────────────────────
        function applyForceField(
          ax: number, ay: number,  // previous cursor pos
          bx: number, by: number,  // current cursor pos
          mvx: number, mvy: number // mouse velocity
        ) {
          const props = propsRef.current;
          if (!props.magnifierEnabled || ptCount === 0) return;

          const fr   = props.friction;
          const rs   = props.restoreSpeed;
          const fs   = props.forceStrength;
          const rad  = props.magnifierRadius;
          const rad2 = rad * rad;

          // Bounding box of sweep segment + interaction radius
          const minX = Math.min(ax, bx) - rad;
          const maxX = Math.max(ax, bx) + rad;
          const minY = Math.min(ay, by) - rad;
          const maxY = Math.max(ay, by) + rad;

          const minCol = Math.max(0, (minX / gridCellSize) | 0);
          const maxCol = Math.min(gridCols - 1, (maxX / gridCellSize) | 0);
          const minRow = Math.max(0, (minY / gridCellSize) | 0);
          const maxRow = Math.min(gridRows - 1, (maxY / gridCellSize) | 0);

          const abx = bx - ax;
          const aby = by - ay;
          const abLen2 = abx * abx + aby * aby;

          const mvLen = Math.sqrt(mvx * mvx + mvy * mvy);
          const mvNx  = mvLen > 0.001 ? mvx / mvLen : 0;
          const mvNy  = mvLen > 0.001 ? mvy / mvLen : 0;
          const impulseStrength = Math.min(mvLen * 0.22, fs * 1.5);

          // 1. Local cursor repulsion evaluated ONLY in candidate spatial grid cells
          for (let r = minRow; r <= maxRow; r++) {
            const rowOffset = r * gridCols;
            for (let c = minCol; c <= maxCol; c++) {
              let i = gridHead[rowOffset + c];
              while (i !== -1) {
                const px = ptPosX[i];
                const py = ptPosY[i];

                let cx: number, cy: number;
                if (abLen2 < 0.01) {
                  cx = ax; cy = ay;
                } else {
                  let t = ((px - ax) * abx + (py - ay) * aby) / abLen2;
                  if (t < 0) t = 0;
                  else if (t > 1) t = 1;
                  cx = ax + t * abx;
                  cy = ay + t * aby;
                }

                const dx = px - cx;
                const dy = py - cy;
                const d2 = dx * dx + dy * dy;

                if (d2 < rad2 && d2 > 0.01) {
                  const d = Math.sqrt(d2);
                  const scale = fs / Math.max(1, d);
                  ptVelX[i] += (dx / d) * scale;
                  ptVelY[i] += (dy / d) * scale;

                  if (impulseStrength > 0.1) {
                    const falloff = 1 - d / rad;
                    ptVelX[i] += mvNx * impulseStrength * falloff;
                    ptVelY[i] += mvNy * impulseStrength * falloff;
                  }

                  // Near-cursor subtle binary flip activity
                  if (Math.random() < 0.03) {
                    ptBinary[i] ^= 1;
                  }
                }
                i = gridNext[i];
              }
            }
          }

          // 2. Linear spring restore & friction update for displaced particles
          for (let i = 0; i < ptCount; i++) {
            let vx = ptVelX[i];
            let vy = ptVelY[i];
            const px = ptPosX[i];
            const py = ptPosY[i];
            const ox = ptOrigX[i];
            const oy = ptOrigY[i];
            const dx = ox - px;
            const dy = oy - py;

            // Only compute when particle is active or displaced
            if (vx * vx + vy * vy > 0.0001 || dx * dx + dy * dy > 0.001) {
              ptVelX[i] += (ox - ptPosX[i]) * rs;
              ptVelY[i] += (oy - ptPosY[i]) * rs;
              ptVelX[i] *= fr;
              ptVelY[i] *= fr;
              ptPosX[i] += ptVelX[i];
              ptPosY[i] += ptVelY[i];
            }
          }
        }

        // ─── Draw loop ────────────────────────────────────────────────────────────
        p.draw = () => {
          if (!img) {
            if (originalImg) {
              processImage();
              generatePalette(propsRef.current.hue, propsRef.current.saturation);
              binaryAtlas = buildBinaryAtlas(palette);
              generatePoints();
            }
            return;
          }

          p.background(0);

          const props = propsRef.current;

          // Regenerate palette / atlas on prop changes
          if (props.hue !== lastHue || props.saturation !== lastSaturation) {
            generatePalette(props.hue, props.saturation);
            binaryAtlas = buildBinaryAtlas(palette);
            lastHue = props.hue;
            lastSaturation = props.saturation;
          }
          if (props.invertImage !== lastInvertImage) {
            processImage();
          }
          if (
            props.spacing !== lastSpacing ||
            props.noiseScale !== lastNoiseScale ||
            props.density !== lastDensity
          ) {
            generatePoints();
          }

          // ── Timing & Physics Delta ────────────────────────────────────────────
          const nowMs = performance.now();
          const nextInteractiveFrameRate = pointerState.lastActivityMs > 0 && nowMs - pointerState.lastActivityMs < 1500;
          if (nextInteractiveFrameRate !== interactiveFrameRate) {
            interactiveFrameRate = nextInteractiveFrameRate;
            p.frameRate(interactiveFrameRate ? 60 : 30);
          }
          let deltaMs = nowMs - lastPhysicsTime;
          lastPhysicsTime = nowMs;

          // ── Fast Cursor Tracking (zero lag) ───────────────────────────────────
          let rawX = p.mouseX;
          let rawY = p.mouseY;

          if (pointerState.active) {
            rawX = pointerState.x;
            rawY = pointerState.y;
            hasUserInteracted = true;
          }

          // Touch support
          if (p.touches && p.touches.length > 0) {
            const t = p.touches[0] as { x?: number; y?: number };
            if (t && typeof t.x === 'number' && typeof t.y === 'number') {
              rawX = t.x;
              rawY = t.y;
              hasUserInteracted = true;
            }
          }

          if (rawX !== 0 || rawY !== 0) hasUserInteracted = true;

          // Idle gentle oscillation before user interaction
          if (!hasUserInteracted) {
            const t = p.millis() * 0.001;
            rawX = p.width  / 2 + Math.cos(t)       * (p.width  * 0.25);
            rawY = p.height / 2 + Math.sin(t * 1.5) * (p.height * 0.2);
          }

          // Detect resume from pause, background tab, or frame lag spike
          const isResume = isResumePendingRef.current || deltaMs > 100;
          if (isResume) {
            isResumePendingRef.current = false;
            deltaMs = FIXED_DT;
            physicsAccumulator = 0;

            // On resume from pause/background, synchronize prevX = curX = rawX so no stale pointer vector is calculated
            prevX = curX = rawX;
            prevY = curY = rawY;

            // Re-stagger ptFlipTime across 1.5–4.0s when resume is detected
            const nowSec = p.millis() * 0.001;
            for (let i = 0; i < ptCount; i++) {
              ptFlipTime[i] = nowSec + 1.5 + Math.random() * 2.5;
            }
          }

          // Fast, near-direct cursor response (>=0.95 = direct tracking)
          const inertia = props.magnifierInertia ?? 0.96;
          if (inertia >= 0.95) {
            curX = rawX;
            curY = rawY;
          } else {
            curX = curX + (rawX - curX) * inertia;
            curY = curY + (rawY - curY) * inertia;
          }

          let mvx = curX - prevX;
          let mvy = curY - prevY;

          // Clamp maximum displacement step per frame (Math.hypot(mvx, mvy) > 120)
          const mvDist = Math.hypot(mvx, mvy);
          if (mvDist > 120) {
            const clampScale = 120 / mvDist;
            mvx *= clampScale;
            mvy *= clampScale;
            curX = prevX + mvx;
            curY = prevY + mvy;
          }

          // ── Fixed 60Hz Physics Accumulator (dt = 16.667ms) ─────────────────────
          physicsAccumulator += Math.min(deltaMs, 100);
          let subSteps = 0;
          while (physicsAccumulator >= FIXED_DT && subSteps < 5) {
            applyForceField(prevX, prevY, curX, curY, mvx, mvy);
            prevX = curX;
            prevY = curY;
            mvx = 0;
            mvy = 0;
            physicsAccumulator -= FIXED_DT;
            subSteps++;
          }
          if (subSteps > 0) {
            prevX = curX;
            prevY = curY;
          }

          // ── Binary Flip Cadence ───────────────────────────────────────────────
          const nowSec = p.millis() * 0.001;
          if (!isReducedMotion) {
            // Check flip timers across particles
            for (let i = 0; i < ptCount; i++) {
              if (nowSec > ptFlipTime[i]) {
                ptBinary[i] ^= 1;
                ptFlipTime[i] = nowSec + 1.5 + Math.random() * 2.5;
              }
            }
          }

          // ── Blit Binary Digits via Unified Texture Atlas ──────────────────────
          const ctx = (p as unknown as { drawingContext: CanvasRenderingContext2D }).drawingContext;
          if (!ctx || !binaryAtlas) return;

          const atlasCanvas = binaryAtlas.canvas;
          const atlasGlyphs = binaryAtlas.glyphs;
          const canvasW = p.width;
          const canvasH = p.height;

          const mRad = props.magnifierRadius || 175;
          const mRadSq = mRad * mRad;
          const innerRadSq = mRadSq * 0.25;

          for (let i = 0; i < ptCount; i++) {
            if (!ptVisible[i]) continue;

            const x = ptPosX[i];
            const y = ptPosY[i];

            // Squared distance to cursor determines size bucket (0: normal, 1: mid, 2: near glow)
            const ddx = x - curX;
            const ddy = y - curY;
            const d2 = ddx * ddx + ddy * ddy;

            const sizeBucket = (d2 < innerRadSq) ? 2 : (d2 < mRadSq) ? 1 : 0;
            const digit = ptBinary[i];
            const shade = ptShadeIdx[i];

            const glyph = atlasGlyphs[digit]?.[shade]?.[sizeBucket];
            if (glyph) {
              const hw = glyph.hw;
              const hh = glyph.hh;
              const drawX = (x - hw) | 0;
              const drawY = (y - hh) | 0;

              // Viewport culling: do not draw particles outside the visible canvas
              if (drawX + glyph.sw < 0 || drawX > canvasW || drawY + glyph.sh < 0 || drawY > canvasH) {
                continue;
              }

              // Direct blit from unified atlas texture: zero font parsing, single texture bind
              ctx.drawImage(
                atlasCanvas,
                glyph.sx,
                glyph.sy,
                glyph.sw,
                glyph.sh,
                drawX,
                drawY,
                glyph.sw,
                glyph.sh
              );
            }
          }
        };
      };

      const container = containerRef.current;
      let handlePointerMove: ((e: MouseEvent | TouchEvent) => void) | null = null;
      let updateCachedRect: (() => void) | null = null;

      const handleVisibilityChange = () => {
        if (!document.hidden) {
          isResumePendingRef.current = true;
        }
      };
      if (typeof document !== 'undefined') {
        document.addEventListener('visibilitychange', handleVisibilityChange);
      }

      if (container) {
        let cachedLeft = 0;
        let cachedTop = 0;

        updateCachedRect = () => {
          if (containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            cachedLeft = rect.left;
            cachedTop = rect.top;
          }
        };

        updateCachedRect();
        window.addEventListener('resize', updateCachedRect, { passive: true });
        window.addEventListener('scroll', updateCachedRect, { passive: true });

        handlePointerMove = (e: MouseEvent | TouchEvent) => {
          if (!propsRef.current.isActive) return;
          pointerState.lastActivityMs = performance.now();
          if ('touches' in e && e.touches.length > 0) {
            pointerState.x = e.touches[0].clientX - cachedLeft;
            pointerState.y = e.touches[0].clientY - cachedTop;
            pointerState.active = true;
          } else if ('clientX' in e) {
            pointerState.x = (e as MouseEvent).clientX - cachedLeft;
            pointerState.y = (e as MouseEvent).clientY - cachedTop;
            pointerState.active = true;
          }
        };

        window.addEventListener('mousemove', handlePointerMove, { passive: true });
        window.addEventListener('touchmove', handlePointerMove, { passive: true });
        window.addEventListener('touchstart', handlePointerMove, { passive: true });
      }

      const myP5 = new p5(sketch, p5ContainerRef.current);
      p5InstanceRef.current = myP5;

      return () => {
        if (handlePointerMove) {
          window.removeEventListener('mousemove', handlePointerMove);
          window.removeEventListener('touchmove', handlePointerMove);
          window.removeEventListener('touchstart', handlePointerMove);
        }
        if (updateCachedRect) {
          window.removeEventListener('resize', updateCachedRect);
          window.removeEventListener('scroll', updateCachedRect);
        }
        if (typeof document !== 'undefined') {
          document.removeEventListener('visibilitychange', handleVisibilityChange);
        }
        if (p5InstanceRef.current) {
          try {
            p5InstanceRef.current.remove();
          } catch (err) {
            console.warn('ForceFieldBackground: Error removing p5 instance', err);
          }
          p5InstanceRef.current = null;
        }
      };
    }, [imageUrl]);

    return (
      <div
        className={`relative w-full h-full overflow-hidden bg-transparent dark:bg-black ${className}`}
        ref={containerRef}
        style={{
          opacity: typeof opacity === 'number' ? Math.max(0, Math.min(1, opacity)) : 1.0,
          pointerEvents: isActive && (opacity === undefined || opacity > 0.05) ? 'auto' : 'none',
          transition: 'opacity 0.2s ease-out',
        }}
      >
        <div ref={p5ContainerRef} className="absolute inset-0 pointer-events-none" />
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center text-white/50 text-xs tracking-widest uppercase font-mono">
            Initializing Binary Core...
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center text-red-500/50 text-xs tracking-widest uppercase font-mono">
            {error}
          </div>
        )}
      </div>
    );
  }
);

ForceFieldBackground.displayName = 'ForceFieldBackground';

export default ForceFieldBackground;

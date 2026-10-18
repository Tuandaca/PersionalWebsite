import React, { useEffect, useRef, useState } from 'react';
import p5 from 'p5';

export interface ForceFieldBackgroundProps {
  /**
   * URL of the image to use as the base for the particle field
   * @default "https://cdn.pixabay.com/photo/2024/12/13/20/29/alps-9266131_1280.jpg"
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
   * @default 10
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
   * @default 150
   */
  magnifierRadius?: number;
  /**
   * Strength of the force pushing particles away
   * @default 10
   */
  forceStrength?: number;
  /**
   * Friction factor for particle movement (0-1)
   * @default 0.9
   */
  friction?: number;
  /**
   * Speed at which particles return to original position
   * @default 0.05
   */
  restoreSpeed?: number;
  /**
   * Cursor follow responsiveness (0 to 1, higher = faster/snappier, 1 = instant)
   * @default 0.85
   */
  magnifierInertia?: number;
  /**
   * Additional CSS class names
   */
  className?: string;
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

/**
 * ForceFieldBackground
 *
 * An interactive, particle-based background that reacts to mouse movement.
 * It uses an underlying image to determine particle color and size, creating
 * a "force field" effect where particles are pushed away by the cursor.
 *
 * Physics engine v2:
 * - Trail-based segment distance for smooth fast-swipe effect
 * - Mouse velocity impulse (particles fly in direction of swipe)
 * - Zero-allocation physics (no per-frame Vector allocation)
 * - loadPixels() called only when image changes, not every frame
 */
export function ForceFieldBackground({
  imageUrl = "https://cdn.pixabay.com/photo/2024/12/13/20/29/alps-9266131_1280.jpg",
  hue = 210,
  saturation = 100,
  threshold = 255,
  minStroke = 2,
  maxStroke = 6,
  spacing = 10,
  noiseScale = 0,
  density = 2.0,
  invertImage = true,
  invertWireframe = true,
  magnifierEnabled = true,
  magnifierRadius = 150,
  forceStrength = 10,
  friction = 0.9,
  restoreSpeed = 0.05,
  magnifierInertia = 0.85,
  className = "",
}: ForceFieldBackgroundProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const p5InstanceRef = useRef<p5 | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Keep latest props in ref to access inside p5 closure without re-instantiating
  const propsRef = useRef({
    hue, saturation, threshold, minStroke, maxStroke, spacing, noiseScale,
    density, invertImage, invertWireframe, magnifierEnabled, magnifierRadius,
    forceStrength, friction, restoreSpeed, magnifierInertia
  });

  useEffect(() => {
    propsRef.current = {
      hue, saturation, threshold, minStroke, maxStroke, spacing, noiseScale,
      density, invertImage, invertWireframe, magnifierEnabled, magnifierRadius,
      forceStrength, friction, restoreSpeed, magnifierInertia
    };
  }, [hue, saturation, threshold, minStroke, maxStroke, spacing, noiseScale, density, invertImage, invertWireframe, magnifierEnabled, magnifierRadius, forceStrength, friction, restoreSpeed, magnifierInertia]);

  useEffect(() => {
    if (!containerRef.current) return;

    // Cleanup previous instance if exists
    if (p5InstanceRef.current) {
      p5InstanceRef.current.remove();
    }

    const sketch = (p: p5) => {
      let originalImg: p5.Image;
      let img: p5.Image;
      let imgPixels: Uint8ClampedArray | null = null; // cached pixel array
      let palette: p5.Color[] = [];

      // Use flat typed arrays for particle data — zero GC, cache-friendly
      // Layout: [posX, posY, origX, origY, velX, velY]
      let ptPosX: Float32Array = new Float32Array(0);
      let ptPosY: Float32Array = new Float32Array(0);
      let ptOrigX: Float32Array = new Float32Array(0);
      let ptOrigY: Float32Array = new Float32Array(0);
      let ptVelX: Float32Array = new Float32Array(0);
      let ptVelY: Float32Array = new Float32Array(0);
      let ptCount = 0;

      // Internal state tracking to detect prop changes
      let lastHue = -1;
      let lastSaturation = -1;
      let lastSpacing = -1;
      let lastNoiseScale = -1;
      let lastDensity = -1;
      let lastInvertImage: boolean | null = null;

      // Cursor tracking: current + previous for trail/velocity
      let curX = 0;
      let curY = 0;
      let prevX = 0;
      let prevY = 0;
      let hasUserInteracted = false;

      // ─── Image loading ────────────────────────────────────────────────────────

      p.preload = () => {
        p.loadImage(
          imageUrl,
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
        p.createCanvas(cw, ch);

        curX = prevX = p.width / 2;
        curY = prevY = p.height / 2;

        if (originalImg) {
          processImage();
          generatePalette(propsRef.current.hue, propsRef.current.saturation);
          generatePoints();
        }
      };

      p.windowResized = () => {
        if (!containerRef.current) return;
        const cw = containerRef.current.clientWidth || window.innerWidth;
        const ch = containerRef.current.clientHeight || window.innerHeight;
        if (cw > 0 && ch > 0) {
          p.resizeCanvas(cw, ch);
          if (originalImg) { processImage(); generatePoints(); }
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
          const lightness = p.map(i, 0, 11, 95, 5);
          palette.push(p.color(h, s, lightness));
        }
        p.pop();
      }

      // ─── Point generation ─────────────────────────────────────────────────────

      function generatePoints() {
        if (!img) return;
        const { spacing: sp, density: den, noiseScale: ns } = propsRef.current;
        const safeSpacing = Math.max(4, sp);

        // Count first to allocate typed arrays exactly once
        let count = 0;
        for (let y = 0; y < img.height; y += safeSpacing)
          for (let x = 0; x < img.width; x += safeSpacing)
            if (p.random() <= den) count++;

        ptPosX  = new Float32Array(count);
        ptPosY  = new Float32Array(count);
        ptOrigX = new Float32Array(count);
        ptOrigY = new Float32Array(count);
        ptVelX  = new Float32Array(count);
        ptVelY  = new Float32Array(count);
        ptCount = 0;

        // Re-seed random to match the first pass (reproducible grid)
        p.randomSeed(42);
        for (let y = 0; y < img.height; y += safeSpacing) {
          for (let x = 0; x < img.width; x += safeSpacing) {
            const skip = p.random() > den;
            if (skip) continue;
            const nx = ns > 0 ? (p.noise(x * ns, y * ns) - 0.5) * safeSpacing : 0;
            const ny = ns > 0 ? (p.noise((x + 500) * ns, (y + 500) * ns) - 0.5) * safeSpacing : 0;
            ptOrigX[ptCount] = ptPosX[ptCount] = x + nx;
            ptOrigY[ptCount] = ptPosY[ptCount] = y + ny;
            ptVelX[ptCount]  = 0;
            ptVelY[ptCount]  = 0;
            ptCount++;
          }
        }
        p.randomSeed(Date.now()); // restore truly random seed

        lastSpacing   = sp;
        lastNoiseScale = ns;
        lastDensity   = den;
      }

      // ─── Physics ──────────────────────────────────────────────────────────────
      //
      // Key upgrade: apply force based on CLOSEST DISTANCE to the line-segment
      // swept by the cursor between the previous and current frame.
      // This means even at 30–60fps, a fast swipe creates a continuous wake of
      // displaced particles along the full swept path — no more "teleport hole".
      //
      // Additionally, we inject mouse velocity as a lateral impulse so particles
      // fly in the direction the cursor was swiped (like water displaced by a hand).

      function applyForceField(
        ax: number, ay: number,  // previous cursor pos
        bx: number, by: number,  // current cursor pos
        mvx: number, mvy: number // mouse velocity
      ) {
        const props = propsRef.current;
        if (!props.magnifierEnabled) return;

        const fr  = props.friction;
        const rs  = props.restoreSpeed;
        const fs  = props.forceStrength;
        const rad = props.magnifierRadius;
        const rad2 = rad * rad;

        // Precompute segment AB length²
        const abx = bx - ax;
        const aby = by - ay;
        const abLen2 = abx * abx + aby * aby;

        // Normalised mouse velocity for impulse direction
        const mvLen = Math.sqrt(mvx * mvx + mvy * mvy);
        const mvNx  = mvLen > 0.001 ? mvx / mvLen : 0;
        const mvNy  = mvLen > 0.001 ? mvy / mvLen : 0;
        // Impulse strength scales with swipe speed (capped to avoid explosion)
        const impulseStrength = Math.min(mvLen * 0.18, fs * 1.2);

        for (let i = 0; i < ptCount; i++) {
          const px = ptPosX[i];
          const py = ptPosY[i];

          // ── Find closest point on segment AB to particle P ──────────────────
          let cx: number, cy: number;
          if (abLen2 < 0.01) {
            // Degenerate segment (cursor not moving) — fall back to point
            cx = ax; cy = ay;
          } else {
            // t is the projection parameter, clamped to [0,1]
            let t = ((px - ax) * abx + (py - ay) * aby) / abLen2;
            if (t < 0) t = 0;
            if (t > 1) t = 1;
            cx = ax + t * abx;
            cy = ay + t * aby;
          }

          const dx = px - cx;
          const dy = py - cy;
          const d2 = dx * dx + dy * dy;

          if (d2 < rad2 && d2 > 0.01) {
            const d = Math.sqrt(d2);

            // Radial repulsion (push away from trail)
            const scale = fs / Math.max(1, d);
            ptVelX[i] += (dx / d) * scale;
            ptVelY[i] += (dy / d) * scale;

            // Lateral impulse (swipe momentum) — only when cursor is fast
            if (impulseStrength > 0.1) {
              const falloff = 1 - d / rad; // stronger near center
              ptVelX[i] += mvNx * impulseStrength * falloff;
              ptVelY[i] += mvNy * impulseStrength * falloff;
            }
          }

          // ── Spring restore ──────────────────────────────────────────────────
          const ox = ptOrigX[i];
          const oy = ptOrigY[i];
          ptVelX[i] += (ox - ptPosX[i]) * rs;
          ptVelY[i] += (oy - ptPosY[i]) * rs;

          // ── Friction ────────────────────────────────────────────────────────
          ptVelX[i] *= fr;
          ptVelY[i] *= fr;

          // ── Integrate ───────────────────────────────────────────────────────
          ptPosX[i] += ptVelX[i];
          ptPosY[i] += ptVelY[i];
        }
      }

      // ─── Draw loop ────────────────────────────────────────────────────────────

      p.draw = () => {
        if (!img) {
          if (originalImg) {
            processImage();
            generatePalette(propsRef.current.hue, propsRef.current.saturation);
            generatePoints();
          }
          return;
        }

        p.background(0);

        const props = propsRef.current;

        // Regenerate palette / image / points on prop changes
        if (props.hue !== lastHue || props.saturation !== lastSaturation) {
          generatePalette(props.hue, props.saturation);
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

        // ── Cursor position ────────────────────────────────────────────────────
        prevX = curX;
        prevY = curY;

        let rawX = p.mouseX;
        let rawY = p.mouseY;

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

        // Idle gentle oscillation when no mouse input yet
        if (!hasUserInteracted) {
          const t = p.millis() * 0.001;
          rawX = p.width  / 2 + Math.cos(t)       * (p.width  * 0.25);
          rawY = p.height / 2 + Math.sin(t * 1.5) * (p.height * 0.2);
        }

        // Lerp for smooth cursor following (inertia prop)
        const inertia = props.magnifierInertia ?? 0.85;
        if (inertia >= 0.98) {
          curX = rawX;
          curY = rawY;
        } else {
          curX = curX + (rawX - curX) * inertia;
          curY = curY + (rawY - curY) * inertia;
        }

        // Mouse velocity vector (pixels per frame)
        const mvx = curX - prevX;
        const mvy = curY - prevY;

        // ── Apply force field using line-segment trail ─────────────────────────
        applyForceField(prevX, prevY, curX, curY, mvx, mvy);

        // ── Render particles ───────────────────────────────────────────────────
        if (!imgPixels) return;
        p.noFill();

        const imgW = img.width;
        const imgH = img.height;
        const thr  = props.threshold;
        const invert = props.invertWireframe;
        const palLen = palette.length;
        const minSt  = props.minStroke;
        const maxSt  = props.maxStroke;
        const mEnabled = props.magnifierEnabled;
        const mRad     = props.magnifierRadius;

        for (let i = 0; i < ptCount; i++) {
          const x = ptPosX[i];
          const y = ptPosY[i];

          const pixX = x < 0 ? 0 : x >= imgW ? imgW - 1 : x | 0;
          const pixY = y < 0 ? 0 : y >= imgH ? imgH - 1 : y | 0;
          const brightness = imgPixels[(pixX + pixY * imgW) * 4];

          const visible = invert ? brightness < thr : brightness > thr;
          if (!visible) continue;

          let shadeIdx = ((brightness / 255) * (palLen - 1)) | 0;
          if (shadeIdx < 0) shadeIdx = 0;
          if (shadeIdx >= palLen) shadeIdx = palLen - 1;

          let strokeSz = minSt + (brightness / 255) * (maxSt - minSt);

          if (mEnabled) {
            const ddx = x - curX;
            const ddy = y - curY;
            const d   = Math.sqrt(ddx * ddx + ddy * ddy);
            if (d < mRad) {
              strokeSz *= 1 + (1 - d / mRad); // up to 2× at center
            }
          }

          if (palette[shadeIdx]) {
            p.stroke(palette[shadeIdx]);
            p.strokeWeight(strokeSz);
            p.point(x, y);
          }
        }
      };
    };

    const myP5 = new p5(sketch, containerRef.current);
    p5InstanceRef.current = myP5;

    return () => {
      myP5.remove();
    };
  }, [imageUrl]);

  return (
    <div
      className={`relative w-full h-full overflow-hidden bg-black ${className}`}
      ref={containerRef}
    >
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center text-white/50 text-xs tracking-widest uppercase">
          Initializing Force Field...
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center text-red-500/50 text-xs tracking-widest uppercase">
          {error}
        </div>
      )}
    </div>
  );
}

export default ForceFieldBackground;

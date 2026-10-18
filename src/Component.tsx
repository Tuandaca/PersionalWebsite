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
    forceStrength, friction, restoreSpeed
  });

  useEffect(() => {
    propsRef.current = {
      hue, saturation, threshold, minStroke, maxStroke, spacing, noiseScale,
      density, invertImage, invertWireframe, magnifierEnabled, magnifierRadius,
      forceStrength, friction, restoreSpeed
    };
  }, [hue, saturation, threshold, minStroke, maxStroke, spacing, noiseScale, density, invertImage, invertWireframe, magnifierEnabled, magnifierRadius, forceStrength, friction, restoreSpeed]);

  useEffect(() => {
    if (!containerRef.current) return;

    // Cleanup previous instance if exists
    if (p5InstanceRef.current) {
      p5InstanceRef.current.remove();
    }

    const sketch = (p: p5) => {
      let originalImg: p5.Image;
      let img: p5.Image;
      let palette: p5.Color[] = [];
      let points: {
        pos: p5.Vector;
        originalPos: p5.Vector;
        vel: p5.Vector;
      }[] = [];
      
      // Internal state tracking to detect changes
      let lastHue = -1;
      let lastSaturation = -1;
      let lastSpacing = -1;
      let lastNoiseScale = -1;
      let lastDensity = -1;
      let lastInvertImage: boolean | null = null;
      let magnifierX = 0;
      let magnifierY = 0;
      let magnifierInertia = 0.1;
      let hasUserInteracted = false;

      p.preload = () => {
        // Attempt loading image with fallback for CORS or offline
        p.loadImage(
          imageUrl,
          (loadedImg) => {
            originalImg = loadedImg;
            setIsLoading(false);
          },
          (err) => {
            console.warn("Failed to load primary image, generating procedural fallback pattern:", err);
            const fallbackUrl = createFallbackImagePattern();
            if (fallbackUrl) {
              p.loadImage(
                fallbackUrl,
                (fbImg) => {
                  originalImg = fbImg;
                  setIsLoading(false);
                },
                () => {
                  setError("Failed to load image");
                  setIsLoading(false);
                }
              );
            } else {
              setError("Failed to load image");
              setIsLoading(false);
            }
          }
        );
      };

      p.setup = () => {
        if (!containerRef.current) return;
        
        // Create canvas to fill parent
        const clientWidth = containerRef.current.clientWidth || window.innerWidth;
        const clientHeight = containerRef.current.clientHeight || window.innerHeight;
        p.createCanvas(clientWidth, clientHeight);
        
        // Initialize magnifier position in the center
        magnifierX = p.width / 2;
        magnifierY = p.height / 2;

        if (originalImg) {
          processImage();
          generatePalette(propsRef.current.hue, propsRef.current.saturation);
          generatePoints();
        }
      };

      p.windowResized = () => {
        if (!containerRef.current) return;
        const clientWidth = containerRef.current.clientWidth || window.innerWidth;
        const clientHeight = containerRef.current.clientHeight || window.innerHeight;
        if (clientWidth > 0 && clientHeight > 0) {
          p.resizeCanvas(clientWidth, clientHeight);
          if (originalImg) {
            processImage();
            generatePoints();
          }
        }
      };

      function processImage() {
        if (!originalImg) return;
        img = originalImg.get();
        // Resize image to match canvas for 1:1 pixel mapping
        if (p.width > 0 && p.height > 0) {
          img.resize(p.width, p.height);
        }
        img.filter(p.GRAY);

        if (propsRef.current.invertImage) {
          img.loadPixels();
          for (let i = 0; i < img.pixels.length; i += 4) {
            img.pixels[i] = 255 - img.pixels[i];
            img.pixels[i + 1] = 255 - img.pixels[i + 1];
            img.pixels[i + 2] = 255 - img.pixels[i + 2];
          }
          img.updatePixels();
        }
        lastInvertImage = propsRef.current.invertImage;
      }

      function generatePalette(h: number, s: number) {
        palette = [];
        p.push();
        p.colorMode(p.HSL);
        for (let i = 0; i < 12; i++) {
          let lightness = p.map(i, 0, 11, 95, 5);
          palette.push(p.color(h, s, lightness));
        }
        p.pop();
      }

      function generatePoints() {
        if (!img) return;
        points = [];
        const { spacing, density, noiseScale } = propsRef.current;
        
        // Guard against excessive points for smooth 60fps
        const safeSpacing = Math.max(4, spacing); 

        for (let y = 0; y < img.height; y += safeSpacing) {
          for (let x = 0; x < img.width; x += safeSpacing) {
            if (p.random() > density) continue;
            
            let nx = noiseScale > 0 ? (p.noise(x * noiseScale, y * noiseScale) - 0.5) : 0;
            let ny = noiseScale > 0 ? (p.noise((x + 500) * noiseScale, (y + 500) * noiseScale) - 0.5) : 0;
            let px = x + nx * safeSpacing;
            let py = y + ny * safeSpacing;
            
            points.push({
              pos: p.createVector(px, py),
              originalPos: p.createVector(px, py),
              vel: p.createVector(0, 0)
            });
          }
        }
        
        lastSpacing = spacing;
        lastNoiseScale = noiseScale;
        lastDensity = density;
      }

      function applyForceField(mx: number, my: number) {
        const props = propsRef.current;
        if (!props.magnifierEnabled) return;

        for (let pt of points) {
          // Repel force
          let dir = p5.Vector.sub(pt.pos, p.createVector(mx, my));
          let d = dir.mag();
          
          if (d < props.magnifierRadius) {
            dir.normalize();
            let force = dir.mult(props.forceStrength / Math.max(1, d)); // Avoid div by zero
            pt.vel.add(force);
          }
          
          // Friction
          pt.vel.mult(props.friction);
          
          // Restore force (spring back to original)
          let restore = p5.Vector.sub(pt.pos, pt.originalPos).mult(-props.restoreSpeed);
          pt.vel.add(restore);
          
          // Update position
          pt.pos.add(pt.vel);
        }
      }

      p.draw = () => {
        if (!img) {
          // If loaded after setup
          if (originalImg && !img) {
            processImage();
            generatePalette(propsRef.current.hue, propsRef.current.saturation);
            generatePoints();
          }
          return;
        }

        p.background(0);

        const props = propsRef.current;

        // Check for prop changes that require regeneration
        if (props.hue !== lastHue || props.saturation !== lastSaturation) {
          generatePalette(props.hue, props.saturation);
          lastHue = props.hue;
          lastSaturation = props.saturation;
        }

        if (props.invertImage !== lastInvertImage) {
          processImage(); // This sets lastInvertImage
        }

        if (props.spacing !== lastSpacing || props.noiseScale !== lastNoiseScale || props.density !== lastDensity) {
          generatePoints();
        }

        // Support mouse and touch
        let targetX = p.mouseX;
        let targetY = p.mouseY;

        // Touch handling fallback
        if (p.touches && p.touches.length > 0) {
          const t = p.touches[0] as { x?: number; y?: number };
          if (t && typeof t.x === 'number' && typeof t.y === 'number') {
            targetX = t.x;
            targetY = t.y;
            hasUserInteracted = true;
          }
        }

        // Track user interaction
        if (p.mouseX !== 0 || p.mouseY !== 0) {
          hasUserInteracted = true;
        }

        // Idle gentle oscillation if no interaction yet
        if (!hasUserInteracted) {
          const t = p.millis() * 0.001;
          targetX = p.width / 2 + Math.cos(t) * (p.width * 0.25);
          targetY = p.height / 2 + Math.sin(t * 1.5) * (p.height * 0.2);
        }

        // Lerp for smooth movement of the 'magnifier' center
        magnifierX = p.lerp(magnifierX, targetX, magnifierInertia);
        magnifierY = p.lerp(magnifierY, targetY, magnifierInertia);

        applyForceField(magnifierX, magnifierY);

        img.loadPixels();
        p.noFill();

        for (let pt of points) {
          let x = pt.pos.x;
          let y = pt.pos.y;
          let d = p.dist(x, y, magnifierX, magnifierY);
          
          let px = p.constrain(p.floor(x), 0, img.width - 1);
          let py = p.constrain(p.floor(y), 0, img.height - 1);
          
          // Access pixel data (RGBA)
          let index = (px + py * img.width) * 4;
          let brightness = img.pixels[index]; 
          
          if (brightness === undefined) continue;

          let condition = props.invertWireframe
            ? brightness < props.threshold
            : brightness > props.threshold;

          if (condition) {
            let shadeIndex = Math.floor(p.map(brightness, 0, 255, 0, palette.length - 1));
            shadeIndex = p.constrain(shadeIndex, 0, palette.length - 1);
            
            let strokeSize = p.map(brightness, 0, 255, props.minStroke, props.maxStroke);
            
            if (props.magnifierEnabled && d < props.magnifierRadius) {
              let factor = p.map(d, 0, props.magnifierRadius, 2, 1); // 2x size at center
              strokeSize *= factor;
            }
            
            if (palette[shadeIndex]) {
              p.stroke(palette[shadeIndex]);
              p.strokeWeight(strokeSize);
              p.point(x, y);
            }
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

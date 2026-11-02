import React, { useRef, useEffect, useState, useImperativeHandle, forwardRef } from 'react';
import { DigitalCoreScene, SceneTransform } from './DigitalCoreScene';
import { FallbackBackground } from './FallbackBackground';
import { interpolateStoryKeyframes } from '../../hooks/useScrollStoryteller';
import type { QualityConfig, QualityTier } from '../../hooks/useAdaptiveQuality';

export interface DevNetworkCanvasProps {
  className?: string;
  onSceneReady?: (scene: DigitalCoreScene) => void;
  showFallbackWhenUnsupported?: boolean;
  scrollProgress?: number;
  targetTransform?: SceneTransform;
  isActive?: boolean;
  opacity?: number;
  qualityPreset?: QualityConfig | QualityTier;
  onFrame?: (delta: number) => void;
}

export interface DevNetworkCanvasHandle {
  getScene: () => DigitalCoreScene | null;
}

/**
 * DevNetworkCanvas
 *
 * Fixed full-viewport WebGL background layer rendering the 6-layer procedural Digital Core.
 * Features:
 * - Instantaneous non-blocking initial paint (initialization deferred via RAF).
 * - Automatic WebGL context capability detection.
 * - Automatic fallback to FallbackBackground on WebGL failure or prefers-reduced-motion.
 * - Tab visibility listener pausing RAF to prevent unnecessary GPU draw when hidden.
 * - Robust cleanup on unmount disposing all Three.js resources.
 * - Marked aria-hidden="true" and pointer-events-none for accessibility.
 */
export const DevNetworkCanvas = forwardRef<DevNetworkCanvasHandle, DevNetworkCanvasProps>(
  (
    {
      className = '',
      onSceneReady,
      showFallbackWhenUnsupported = true,
      scrollProgress,
      targetTransform,
      isActive = true,
      opacity,
      qualityPreset,
      onFrame,
    },
    ref
  ) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const sceneRef = useRef<DigitalCoreScene | null>(null);
    const ecoModeRef = useRef(false);
    const [hasWebGL, setHasWebGL] = useState<boolean>(true);
    const [isReducedMotion, setIsReducedMotion] = useState<boolean>(false);

    useImperativeHandle(ref, () => ({
      getScene: () => sceneRef.current,
    }));

    // Forward target transforms to DigitalCoreScene on scroll / transform changes
    useEffect(() => {
      if (!sceneRef.current) return;
      if (typeof scrollProgress === 'number') {
        sceneRef.current.setScrollProgress(scrollProgress);
      }
      if (targetTransform) {
        sceneRef.current.setTargetTransform(targetTransform);
      } else if (typeof scrollProgress === 'number') {
        const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
        const computed = interpolateStoryKeyframes(scrollProgress, isMobile);
        sceneRef.current.setTargetTransform({
          position: computed.position,
          rotation: computed.rotation,
          scale: computed.scale,
          opacity: typeof opacity === 'number' ? opacity : computed.opacity,
        });
      } else if (typeof opacity === 'number') {
        sceneRef.current.setTargetTransform({ opacity });
      }
    }, [scrollProgress, targetTransform, opacity]);

    // External pause / resume control
    useEffect(() => {
      if (!sceneRef.current) return;
      if (isActive === false) {
        sceneRef.current.pause();
      } else if (isActive === true && !document.hidden) {
        sceneRef.current.resume();
      }
    }, [isActive]);

    // Dynamically adjust quality preset
    useEffect(() => {
      if (sceneRef.current && qualityPreset) {
        sceneRef.current.setQualityPreset(qualityPreset);
      }
    }, [qualityPreset]);

    // One inactivity timer controls the existing Core loop; pointer events only update refs.
    useEffect(() => {
      if (!hasWebGL || isReducedMotion) return;
      let lastActivityAt = performance.now();
      let idleTimer: number | null = null;
      const checkIdle = () => {
        idleTimer = null;
        const remaining = 2500 - (performance.now() - lastActivityAt);
        if (remaining > 0) {
          idleTimer = window.setTimeout(checkIdle, remaining);
        } else {
          ecoModeRef.current = true;
          sceneRef.current?.setEcoMode(true);
        }
      };
      const noteActivity = () => {
        lastActivityAt = performance.now();
        if (ecoModeRef.current) {
          ecoModeRef.current = false;
          sceneRef.current?.setEcoMode(false);
        }
        if (idleTimer === null) idleTimer = window.setTimeout(checkIdle, 2500);
      };
      idleTimer = window.setTimeout(checkIdle, 2500);
      window.addEventListener('mousemove', noteActivity, { passive: true });
      window.addEventListener('scroll', noteActivity, { passive: true });
      window.addEventListener('keydown', noteActivity, { passive: true });
      window.addEventListener('touchstart', noteActivity, { passive: true });
      return () => {
        if (idleTimer !== null) window.clearTimeout(idleTimer);
        window.removeEventListener('mousemove', noteActivity);
        window.removeEventListener('scroll', noteActivity);
        window.removeEventListener('keydown', noteActivity);
        window.removeEventListener('touchstart', noteActivity);
      };
    }, [hasWebGL, isReducedMotion]);

    // Detect prefers-reduced-motion
    useEffect(() => {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      setIsReducedMotion(mediaQuery.matches);

      const handleMotionChange = (e: MediaQueryListEvent) => {
        setIsReducedMotion(e.matches);
      };

      if (typeof mediaQuery.addEventListener === 'function') {
        mediaQuery.addEventListener('change', handleMotionChange);
        return () => mediaQuery.removeEventListener('change', handleMotionChange);
      } else {
        mediaQuery.addListener(handleMotionChange);
        return () => mediaQuery.removeListener(handleMotionChange);
      }
    }, []);

    // Check basic WebGL support prior to mounting scene
    useEffect(() => {
      try {
        const testCanvas = document.createElement('canvas');
        const gl = testCanvas.getContext('webgl2') || testCanvas.getContext('webgl');
        if (!gl) {
          setHasWebGL(false);
        }
      } catch {
        setHasWebGL(false);
      }
    }, []);

    // Initialize Three.js scene deferred to ensure non-blocking initial DOM paint
    useEffect(() => {
      if (!hasWebGL || isReducedMotion) return;

      let isCancelled = false;
      let rafId: number | null = null;

      // Defer instantiation by one animation frame for instant first paint
      rafId = requestAnimationFrame(() => {
        if (isCancelled || !canvasRef.current) return;

        try {
          const scene = new DigitalCoreScene({
            canvas: canvasRef.current,
            qualityPreset,
            scrollProgress,
            onFrameTick: onFrame,
            onContextLost: () => {
              console.warn('DevNetworkCanvas: Context lost detected');
            },
            onContextRestored: () => {
              console.info('DevNetworkCanvas: Context restored');
            },
          });

          sceneRef.current = scene;
          scene.setEcoMode(ecoModeRef.current);

          // Apply initial scroll transform
          const initialMobile = typeof window !== 'undefined' && window.innerWidth < 768;
          if (targetTransform) {
            scene.setTargetTransform(targetTransform);
          } else if (typeof scrollProgress === 'number') {
            const computed = interpolateStoryKeyframes(scrollProgress, initialMobile);
            scene.setTargetTransform({
              position: computed.position,
              rotation: computed.rotation,
              scale: computed.scale,
              opacity: computed.opacity,
            });
          }

          onSceneReady?.(scene);
        } catch (err) {
          console.warn('DevNetworkCanvas: WebGL context creation failed, falling back', err);
          setHasWebGL(false);
        }
      });

      // Window resize listener
      const handleResize = () => {
        if (!sceneRef.current || !canvasRef.current) return;
        const width = window.innerWidth;
        const height = window.innerHeight;
        sceneRef.current.onResize(width, height);
      };

      // Visibility change listener (pause RAF when tab hidden)
      const handleVisibilityChange = () => {
        if (!sceneRef.current) return;
        if (document.hidden) {
          sceneRef.current.pause();
        } else if (isActive !== false) {
          sceneRef.current.resume();
        }
      };

      window.addEventListener('resize', handleResize, { passive: true });
      document.addEventListener('visibilitychange', handleVisibilityChange);

      return () => {
        isCancelled = true;
        if (rafId !== null) {
          cancelAnimationFrame(rafId);
        }
        window.removeEventListener('resize', handleResize);
        document.removeEventListener('visibilitychange', handleVisibilityChange);

        if (sceneRef.current) {
          sceneRef.current.dispose();
          sceneRef.current = null;
        }
      };
    }, [hasWebGL, isReducedMotion, onSceneReady]);

    // Render fallback background if WebGL is unavailable or user requests reduced motion
    if ((!hasWebGL || isReducedMotion) && showFallbackWhenUnsupported) {
      return <FallbackBackground className={className} />;
    }

    return (
      <div
        className={`fixed inset-0 pointer-events-none select-none overflow-hidden z-0 ${className}`}
        aria-hidden="true"
        role="presentation"
      >
        <canvas
          ref={canvasRef}
          className="w-full h-full block pointer-events-none"
          tabIndex={-1}
          aria-hidden="true"
        />
      </div>
    );
  }
);

DevNetworkCanvas.displayName = 'DevNetworkCanvas';

export default DevNetworkCanvas;

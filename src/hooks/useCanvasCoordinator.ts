import { useState, useEffect, useCallback, useMemo } from 'react';
import type { ForceFieldBackgroundHandle } from '../Component';
import type { DevNetworkCanvasHandle } from '../components/DevNetwork/DevNetworkCanvas';

export interface CanvasCoordinatorOptions {
  /**
   * Normalized scroll progress (0.0 to 1.0).
   * If omitted, the hook attaches a scroll listener and calculates it from window metrics.
   */
  scrollProgress?: number;
  /**
   * Threshold where hero mode ends and p5 particle loop is paused (noLoop).
   * @default 0.15
   */
  heroEndThreshold?: number;
  /**
   * Threshold where crossfade from p5 to Three.js begins.
   * @default 0.05
   */
  crossfadeStartThreshold?: number;
  /**
   * Ambient opacity for Three.js WebGL canvas during pure Hero mode (Sp in [0.0, 0.05]).
   * @default 0.40
   */
  webglAmbientOpacity?: number;
  /**
   * Opacity for Three.js WebGL canvas at completion of crossfade zone (Sp = 0.15).
   * @default 0.85
   */
  webglCrossfadeTargetOpacity?: number;
  /**
   * Optional target opacity from scroll storyteller (used past hero if provided).
   */
  targetWebglOpacity?: number;
  /**
   * Optional ref to ForceFieldBackground handle for imperative control.
   */
  p5HandleRef?: React.RefObject<ForceFieldBackgroundHandle | null>;
  /**
   * Optional ref to DevNetworkCanvas handle for imperative control.
   */
  devNetworkRef?: React.RefObject<DevNetworkCanvasHandle | null>;
}

export interface CanvasCoordinatorState {
  /**
   * Normalized scroll progress (0.0 to 1.0).
   */
  scrollProgress: number;
  /**
   * Whether p5.js ForceField draw loop is active (calls p.loop()).
   * False when scrolled past hero (Sp >= 0.15) or tab is hidden (calls p.noLoop()).
   */
  isP5Active: boolean;
  /**
   * Opacity for p5.js ForceField canvas:
   * - Sp in [0.0, 0.05]: 1.0
   * - Sp in [0.05, 0.15]: smoothly fades 1.0 -> 0.0
   * - Sp >= 0.15: 0.0
   */
  p5Opacity: number;
  /**
   * Whether Three.js WebGL RAF loop is active.
   * False when tab is hidden.
   */
  isWebglActive: boolean;
  /**
   * Calculated opacity for Three.js WebGL canvas:
   * - Sp in [0.0, 0.05]: ambient (~0.40)
   * - Sp in [0.05, 0.15]: ramps 0.40 -> 0.85
   * - Sp >= 0.15: full fidelity (0.85 -> 1.0)
   */
  webglOpacity: number;
  /**
   * Document visibility state (true when active tab, false when hidden).
   */
  isTabVisible: boolean;
}

/**
 * Pure calculation helper to evaluate canvas coordination states.
 * Fully deterministic, reversible, and suitable for unit testing.
 */
export function calculateCanvasCoordination(
  sp: number,
  isTabVisible: boolean,
  options?: {
    heroEndThreshold?: number;
    crossfadeStartThreshold?: number;
    webglAmbientOpacity?: number;
    webglCrossfadeTargetOpacity?: number;
    targetWebglOpacity?: number;
  }
): {
  isP5Active: boolean;
  p5Opacity: number;
  isWebglActive: boolean;
  webglOpacity: number;
} {
  const heroEnd = options?.heroEndThreshold ?? 0.15;
  const crossfadeStart = options?.crossfadeStartThreshold ?? 0.05;
  const webglAmbient = options?.webglAmbientOpacity ?? 0.40;
  const webglCrossfadeTarget = options?.webglCrossfadeTargetOpacity ?? 0.85;
  const targetWebglOpacity = options?.targetWebglOpacity;

  const clampedSp = Math.max(0, Math.min(1, sp));

  let p5Opacity: number;
  let isP5Active: boolean;
  let webglOpacity: number;

  if (clampedSp <= crossfadeStart) {
    // 1. Hero Zone (Sp in [0.0, 0.05]): p5 at full opacity, WebGL ambient
    p5Opacity = 1.0;
    isP5Active = isTabVisible;
    webglOpacity = webglAmbient;
  } else if (clampedSp < heroEnd) {
    // 2. Crossfade Zone (Sp in [0.05, 0.15]): smooth fade 1.0 -> 0.0, WebGL ramps 0.40 -> 0.85
    const t = (clampedSp - crossfadeStart) / (heroEnd - crossfadeStart);
    p5Opacity = Math.max(0, Math.min(1, 1.0 - t));
    isP5Active = isTabVisible;
    webglOpacity = webglAmbient + t * (webglCrossfadeTarget - webglAmbient);
  } else {
    // 3. Past Hero Zone (Sp >= 0.15): p5 stopped completely (noLoop), WebGL full fidelity (0.85 -> 1.0)
    p5Opacity = 0.0;
    isP5Active = false;

    const pastT = Math.min(1.0, (clampedSp - heroEnd) / (1.0 - heroEnd));
    const baseFullFidelity = webglCrossfadeTarget + pastT * (1.0 - webglCrossfadeTarget);

    webglOpacity = typeof targetWebglOpacity === 'number'
      ? Math.max(webglCrossfadeTarget, Math.min(1.0, targetWebglOpacity))
      : baseFullFidelity;
  }

  // Global tab visibility suspension
  const isWebglActive = isTabVisible;
  if (!isTabVisible) {
    isP5Active = false;
  }

  return {
    isP5Active,
    p5Opacity,
    isWebglActive,
    webglOpacity,
  };
}

/**
 * useCanvasCoordinator
 *
 * Coordinates crossfade and mutual exclusion between p5.js (ForceFieldBackground)
 * and Three.js (DevNetworkCanvas) based on normalized scroll progress and tab visibility:
 *
 * - Hero (Sp in [0.0, 0.05]): p5Opacity = 1.0, isP5Active = true, WebGL at ambient opacity (~0.40)
 * - Crossfade zone (Sp in [0.05, 0.15]): p5Opacity smoothly fades from 1.0 -> 0.0, WebGL ramps to 0.85
 * - Past Hero (Sp >= 0.15): p5Opacity = 0.0, isP5Active = false (triggers p5.noLoop()), WebGL at full fidelity (0.85 -> 1.0)
 * - Reversible: scrolling up resumes p5 loop and restores opacity seamlessly
 * - Global tab visibility management: pauses both p5 and Three.js when tab is hidden, resumes active canvas loops on return
 */
export function useCanvasCoordinator(
  options: CanvasCoordinatorOptions = {}
): CanvasCoordinatorState {
  const {
    scrollProgress: externalScrollProgress,
    heroEndThreshold = 0.15,
    crossfadeStartThreshold = 0.05,
    webglAmbientOpacity = 0.40,
    webglCrossfadeTargetOpacity = 0.85,
    targetWebglOpacity,
    p5HandleRef,
    devNetworkRef,
  } = options;

  // Track document visibility state
  const [isTabVisible, setIsTabVisible] = useState<boolean>(() => {
    return typeof document !== 'undefined' ? !document.hidden : true;
  });

  // Track internal scroll progress if not supplied externally
  const [internalScrollProgress, setInternalScrollProgress] = useState<number>(0);

  const computeScrollProgress = useCallback((): number => {
    if (typeof window === 'undefined') return 0;
    const docEl = document.documentElement;
    const maxScroll = Math.max(1, docEl.scrollHeight - window.innerHeight);
    const currentScroll = window.scrollY || window.pageYOffset || 0;
    return Math.max(0, Math.min(1, currentScroll / maxScroll));
  }, []);

  // Listen to visibilitychange event
  useEffect(() => {
    if (typeof document === 'undefined') return;

    const handleVisibilityChange = () => {
      setIsTabVisible(!document.hidden);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // If external scrollProgress is not provided, attach passive scroll listener
  useEffect(() => {
    if (externalScrollProgress !== undefined || typeof window === 'undefined') return;

    let maxScroll = 1;
    const updateDimensions = () => {
      const docEl = document.documentElement;
      maxScroll = Math.max(1, docEl.scrollHeight - window.innerHeight);
    };

    updateDimensions();

    let rafId: number | null = null;
    const handleScroll = () => {
      if (rafId !== null) return;
      rafId = requestAnimationFrame(() => {
        const currentScroll = window.scrollY || window.pageYOffset || 0;
        const p = Math.max(0, Math.min(1, currentScroll / maxScroll));
        setInternalScrollProgress(p);
        rafId = null;
      });
    };

    const handleResize = () => {
      updateDimensions();
      handleScroll();
    };

    const currentScroll = window.scrollY || window.pageYOffset || 0;
    setInternalScrollProgress(Math.max(0, Math.min(1, currentScroll / maxScroll)));

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleResize, { passive: true });

    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
    };
  }, [externalScrollProgress]);

  const activeProgress = externalScrollProgress !== undefined
    ? externalScrollProgress
    : internalScrollProgress;

  // Compute coordinator state
  const coordination = useMemo(() => {
    return calculateCanvasCoordination(activeProgress, isTabVisible, {
      heroEndThreshold,
      crossfadeStartThreshold,
      webglAmbientOpacity,
      webglCrossfadeTargetOpacity,
      targetWebglOpacity,
    });
  }, [
    activeProgress,
    isTabVisible,
    heroEndThreshold,
    crossfadeStartThreshold,
    webglAmbientOpacity,
    webglCrossfadeTargetOpacity,
    targetWebglOpacity,
  ]);

  // Imperative handle synchronization if refs are provided
  useEffect(() => {
    if (!p5HandleRef?.current) return;
    if (coordination.isP5Active) {
      p5HandleRef.current.resume();
    } else {
      p5HandleRef.current.pause();
    }
  }, [coordination.isP5Active, p5HandleRef]);

  useEffect(() => {
    const scene = devNetworkRef?.current?.getScene();
    if (!scene) return;
    if (coordination.isWebglActive) {
      scene.resume();
    } else {
      scene.pause();
    }
  }, [coordination.isWebglActive, devNetworkRef]);

  return {
    scrollProgress: activeProgress,
    isP5Active: coordination.isP5Active,
    p5Opacity: coordination.p5Opacity,
    isWebglActive: coordination.isWebglActive,
    webglOpacity: coordination.webglOpacity,
    isTabVisible,
  };
}

export default useCanvasCoordinator;

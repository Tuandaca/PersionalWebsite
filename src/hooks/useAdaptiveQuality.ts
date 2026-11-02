/**
 * Adaptive Rendering System & Anti-Oscillation Hysteresis
 *
 * Provides:
 * 1. 5 Tiered Quality Presets:
 *    - 'ultra': DPR 1.5, 1400 particles, continuousRotation: true
 *    - 'high': DPR 1.25, 1000 particles, continuousRotation: true
 *    - 'medium': DPR 1.0, 600 particles, continuousRotation: true
 *    - 'low': DPR 0.75, 250 particles, continuousRotation: true
 *    - 'reduced-motion': DPR 1.0, 250 particles, continuousRotation: false (0 continuous rotation, static camera/presentation)
 *
 * 2. Dynamic FPS Monitoring with 60-Frame EMA Filter:
 *    - alpha = 2 / (60 + 1)
 *    - Downgrade trigger: average FPS < 45 for 60 consecutive frames
 *    - Upgrade trigger: average FPS > 58 sustained for 600 frames (~10s)
 *    - Cooldown timer: 15 seconds (15000ms) after any preset adjustment
 *    - Downgrade limit: maximum 2 downgrades per session
 *
 * 3. Device Capability Heuristics:
 *    - Mobile initial preset ('medium') based on touch, small screen, or low hardware concurrency
 *    - Desktop initial preset ('high' or 'ultra') based on high hardware concurrency and viewport width
 *
 * 4. prefers-reduced-motion Compliance:
 *    - Media query listener for '(prefers-reduced-motion: reduce)'
 *    - Immediately switches to 'reduced-motion' preset, disables continuous rotation
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';

export type QualityTier = 'ultra' | 'high' | 'medium' | 'low' | 'reduced-motion';

export interface QualityConfig {
  tier: QualityTier;
  dpr: number;
  particles: number;
  continuousRotation: boolean;
}

export const QUALITY_PRESETS: Record<QualityTier, QualityConfig> = {
  'ultra': {
    tier: 'ultra',
    dpr: 1.5,
    particles: 1400,
    continuousRotation: true,
  },
  'high': {
    tier: 'high',
    dpr: 1.25,
    particles: 1000,
    continuousRotation: true,
  },
  'medium': {
    tier: 'medium',
    dpr: 1.0,
    particles: 600,
    continuousRotation: true,
  },
  'low': {
    tier: 'low',
    dpr: 0.75,
    particles: 250,
    continuousRotation: true,
  },
  'reduced-motion': {
    tier: 'reduced-motion',
    dpr: 1.0,
    particles: 250,
    continuousRotation: false,
  },
};

export const DOWNGRADE_FPS_THRESHOLD = 45;
export const DOWNGRADE_FRAME_COUNT = 60;
export const UPGRADE_FPS_THRESHOLD = 58;
export const UPGRADE_FRAME_COUNT = 600;
export const COOLDOWN_MS = 15000; // 15 seconds
export const MAX_DOWNGRADES = 2;
export const EMA_ALPHA = 2 / (60 + 1); // 60-frame Exponential Moving Average factor (~0.032787)

const TIER_ORDER_DOWNGRADE: QualityTier[] = ['ultra', 'high', 'medium', 'low'];
const TIER_ORDER_UPGRADE: QualityTier[] = ['low', 'medium', 'high', 'ultra'];

export interface HeuristicOptions {
  isTouch?: boolean;
  innerWidth?: number;
  hardwareConcurrency?: number;
  prefersReducedMotion?: boolean;
}

/**
 * Calculates initial quality preset based on device capability heuristics.
 */
export function calculateInitialPreset(options?: HeuristicOptions): QualityTier {
  if (options?.prefersReducedMotion) {
    return 'reduced-motion';
  }

  const isTouch = options?.isTouch ?? (
    typeof window !== 'undefined' &&
    ('ontouchstart' in window || (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0))
  );

  const width = options?.innerWidth ?? (
    typeof window !== 'undefined' ? window.innerWidth : 1024
  );

  const concurrency = options?.hardwareConcurrency ?? (
    typeof navigator !== 'undefined' && navigator.hardwareConcurrency ? navigator.hardwareConcurrency : 4
  );

  // Mobile / constrained device heuristics -> 'medium'
  if (isTouch || width < 768 || concurrency < 4) {
    return 'medium';
  }

  // High-performance desktop heuristics (high concurrency >= 8, large display >= 1440px) -> 'ultra'
  if (concurrency >= 8 && width >= 1440) {
    return 'ultra';
  }

  // Standard desktop -> 'high'
  return 'high';
}

export interface AdaptiveQualityEngineOptions {
  initialTier?: QualityTier;
  prefersReducedMotion?: boolean;
  cooldownMs?: number;
  maxDowngrades?: number;
  onPresetChange?: (config: QualityConfig) => void;
}

/**
 * Pure TypeScript adaptive quality governor class.
 * Handles frame recording, 60-frame EMA smoothing, cooldown hysteresis,
 * downgrade limits, and reduced-motion transitions.
 */
export class AdaptiveQualityEngine {
  private currentTier: QualityTier;
  private previousStandardTier: QualityTier;
  private emaFps: number = 60;
  private isInitialized: boolean = false;
  private consecutiveLowFrames: number = 0;
  private consecutiveHighFrames: number = 0;
  private lastAdjustmentTimestamp: number = -1;
  private downgradeCount: number = 0;
  private isReducedMotion: boolean = false;

  private cooldownMs: number;
  private maxDowngrades: number;
  private onPresetChange?: (config: QualityConfig) => void;

  constructor(options: AdaptiveQualityEngineOptions = {}) {
    this.cooldownMs = options.cooldownMs ?? COOLDOWN_MS;
    this.maxDowngrades = options.maxDowngrades ?? MAX_DOWNGRADES;
    this.onPresetChange = options.onPresetChange;

    const initial = options.initialTier || 'high';
    this.currentTier = initial;
    this.previousStandardTier = initial === 'reduced-motion' ? 'high' : initial;

    if (options.prefersReducedMotion) {
      this.setReducedMotion(true);
    }
  }

  public getCurrentTier(): QualityTier {
    return this.currentTier;
  }

  public getCurrentPreset(): QualityConfig {
    return QUALITY_PRESETS[this.currentTier];
  }

  public getEmaFps(): number {
    return this.emaFps;
  }

  public getDowngradeCount(): number {
    return this.downgradeCount;
  }

  public getConsecutiveLowFrames(): number {
    return this.consecutiveLowFrames;
  }

  public getConsecutiveHighFrames(): number {
    return this.consecutiveHighFrames;
  }

  public getLastAdjustmentTimestamp(): number {
    return this.lastAdjustmentTimestamp;
  }

  public getCooldownRemaining(now: number = (typeof performance !== 'undefined' ? performance.now() : Date.now())): number {
    if (this.lastAdjustmentTimestamp < 0) return 0;
    const elapsed = now - this.lastAdjustmentTimestamp;
    return Math.max(0, this.cooldownMs - elapsed);
  }

  public isInCooldown(now: number = (typeof performance !== 'undefined' ? performance.now() : Date.now())): boolean {
    if (this.lastAdjustmentTimestamp < 0) return false;
    return (now - this.lastAdjustmentTimestamp) < this.cooldownMs;
  }

  /**
   * Set reduced motion mode dynamically (e.g. from media query listener).
   */
  public setReducedMotion(enabled: boolean, timestamp?: number): void {
    const now = timestamp ?? (typeof performance !== 'undefined' ? performance.now() : Date.now());

    if (enabled && !this.isReducedMotion) {
      this.isReducedMotion = true;
      if (this.currentTier !== 'reduced-motion') {
        this.previousStandardTier = this.currentTier;
        this.currentTier = 'reduced-motion';
        this.lastAdjustmentTimestamp = now;
        this.consecutiveLowFrames = 0;
        this.consecutiveHighFrames = 0;
        this.onPresetChange?.(QUALITY_PRESETS['reduced-motion']);
      }
    } else if (!enabled && this.isReducedMotion) {
      this.isReducedMotion = false;
      this.currentTier = this.previousStandardTier || 'high';
      this.lastAdjustmentTimestamp = now;
      this.consecutiveLowFrames = 0;
      this.consecutiveHighFrames = 0;
      this.onPresetChange?.(QUALITY_PRESETS[this.currentTier]);
    }
  }

  /**
   * Directly record instantaneous FPS value (useful for unit testing).
   */
  public setFps(fps: number, timestamp?: number): void {
    const now = timestamp ?? (typeof performance !== 'undefined' ? performance.now() : Date.now());

    if (!this.isInitialized) {
      this.emaFps = fps;
      this.isInitialized = true;
    } else {
      this.emaFps = (EMA_ALPHA * fps) + ((1 - EMA_ALPHA) * this.emaFps);
    }

    this.evaluateAdjustment(now);
  }

  /**
   * Record a frame render time delta (in seconds) from animation loop.
   */
  public recordFrame(deltaSeconds: number = 0.016667, timestamp?: number): void {
    if (deltaSeconds <= 0) return;
    const instantaneousFps = Math.min(240, 1 / deltaSeconds);
    this.setFps(instantaneousFps, timestamp);
  }

  /**
   * Evaluate whether a downgrade or upgrade condition is satisfied.
   */
  private evaluateAdjustment(now: number): void {
    if (this.isReducedMotion || this.currentTier === 'reduced-motion') {
      return;
    }

    // 1. Check Downgrade Condition
    if (this.emaFps < DOWNGRADE_FPS_THRESHOLD) {
      this.consecutiveLowFrames++;
      this.consecutiveHighFrames = 0;

      if (this.consecutiveLowFrames >= DOWNGRADE_FRAME_COUNT) {
        this.tryDowngrade(now);
      }
    } else if (this.emaFps > UPGRADE_FPS_THRESHOLD) {
      // 2. Check Upgrade Condition
      this.consecutiveHighFrames++;
      this.consecutiveLowFrames = 0;

      if (this.consecutiveHighFrames >= UPGRADE_FRAME_COUNT) {
        this.tryUpgrade(now);
      }
    } else {
      // In comfortable neutral zone (45 <= emaFps <= 58)
      this.consecutiveLowFrames = 0;
      this.consecutiveHighFrames = 0;
    }
  }

  private tryDowngrade(now: number): boolean {
    // Check cooldown
    if (this.isInCooldown(now)) {
      return false;
    }

    // Check downgrade limit
    if (this.downgradeCount >= this.maxDowngrades) {
      return false;
    }

    const currentIndex = TIER_ORDER_DOWNGRADE.indexOf(this.currentTier);
    if (currentIndex === -1 || currentIndex >= TIER_ORDER_DOWNGRADE.length - 1) {
      // Already at lowest tier ('low')
      return false;
    }

    const nextTier = TIER_ORDER_DOWNGRADE[currentIndex + 1];
    this.currentTier = nextTier;
    this.previousStandardTier = nextTier;
    this.downgradeCount++;
    this.lastAdjustmentTimestamp = now;
    this.consecutiveLowFrames = 0;
    this.consecutiveHighFrames = 0;

    this.onPresetChange?.(QUALITY_PRESETS[this.currentTier]);
    return true;
  }

  private tryUpgrade(now: number): boolean {
    // Check cooldown
    if (this.isInCooldown(now)) {
      return false;
    }

    const currentIndex = TIER_ORDER_UPGRADE.indexOf(this.currentTier);
    if (currentIndex === -1 || currentIndex >= TIER_ORDER_UPGRADE.length - 1) {
      // Already at highest tier ('ultra')
      return false;
    }

    const nextTier = TIER_ORDER_UPGRADE[currentIndex + 1];
    this.currentTier = nextTier;
    this.previousStandardTier = nextTier;
    this.lastAdjustmentTimestamp = now;
    this.consecutiveLowFrames = 0;
    this.consecutiveHighFrames = 0;

    this.onPresetChange?.(QUALITY_PRESETS[this.currentTier]);
    return true;
  }

  public reset(initialTier?: QualityTier): void {
    const tier = initialTier || 'high';
    this.currentTier = tier;
    this.previousStandardTier = tier === 'reduced-motion' ? 'high' : tier;
    this.emaFps = 60;
    this.isInitialized = false;
    this.consecutiveLowFrames = 0;
    this.consecutiveHighFrames = 0;
    this.lastAdjustmentTimestamp = -1;
    this.downgradeCount = 0;
    this.isReducedMotion = false;
  }
}

export interface UseAdaptiveQualityOptions {
  initialPreset?: QualityTier;
  enableFpsMonitoring?: boolean;
  cooldownMs?: number;
  maxDowngrades?: number;
}

export interface AdaptiveQualityState {
  preset: QualityConfig;
  tier: QualityTier;
  dpr: number;
  particles: number;
  continuousRotation: boolean;
  fps: number;
  downgradesRemaining: number;
  isReducedMotion: boolean;
  recordFrame: (deltaSeconds?: number) => void;
  setReducedMotion: (enabled: boolean) => void;
}

/**
 * React hook connecting AdaptiveQualityEngine to browser lifecycle.
 */
export function useAdaptiveQuality(options: UseAdaptiveQualityOptions = {}): AdaptiveQualityState {
  const {
    initialPreset,
    cooldownMs = COOLDOWN_MS,
    maxDowngrades = MAX_DOWNGRADES,
  } = options;

  // Determine initial tier via device heuristics if not explicitly specified
  const initialTier = useMemo(() => {
    if (initialPreset) return initialPreset;
    const reduced = typeof window !== 'undefined'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false;
    return calculateInitialPreset({ prefersReducedMotion: reduced });
  }, [initialPreset]);

  const [currentConfig, setCurrentConfig] = useState<QualityConfig>(() => QUALITY_PRESETS[initialTier]);
  const fpsRef = useRef<number>(60);
  const [downgradesUsed, setDowngradesUsed] = useState<number>(0);
  const [isReducedMotion, setIsReducedMotion] = useState<boolean>(initialTier === 'reduced-motion');

  // Stable engine instance across renders
  const engineRef = useRef<AdaptiveQualityEngine | null>(null);
  if (!engineRef.current) {
    engineRef.current = new AdaptiveQualityEngine({
      initialTier,
      cooldownMs,
      maxDowngrades,
      onPresetChange: (config) => {
        setCurrentConfig(config);
        if (engineRef.current) {
          setDowngradesUsed(engineRef.current.getDowngradeCount());
        }
      },
    });
  }

  // Media query listener for prefers-reduced-motion
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updateMotion = (matches: boolean) => {
      setIsReducedMotion(matches);
      engineRef.current?.setReducedMotion(matches);
      if (matches) {
        setCurrentConfig(QUALITY_PRESETS['reduced-motion']);
      } else {
        const current = engineRef.current?.getCurrentPreset();
        if (current) setCurrentConfig(current);
      }
    };

    updateMotion(mediaQuery.matches);

    const listener = (e: MediaQueryListEvent) => updateMotion(e.matches);
    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', listener);
      return () => mediaQuery.removeEventListener('change', listener);
    } else {
      mediaQuery.addListener(listener);
      return () => mediaQuery.removeListener(listener);
    }
  }, []);

  const recordFrame = useCallback((deltaSeconds?: number) => {
    const engine = engineRef.current;
    if (!engine) return;

    engine.recordFrame(deltaSeconds);
    fpsRef.current = Math.round(engine.getEmaFps());
  }, []);

  const setManualReducedMotion = useCallback((enabled: boolean) => {
    setIsReducedMotion(enabled);
    engineRef.current?.setReducedMotion(enabled);
    if (enabled) {
      setCurrentConfig(QUALITY_PRESETS['reduced-motion']);
    } else {
      const current = engineRef.current?.getCurrentPreset();
      if (current) setCurrentConfig(current);
    }
  }, []);

  return {
    preset: currentConfig,
    tier: currentConfig.tier,
    dpr: currentConfig.dpr,
    particles: currentConfig.particles,
    continuousRotation: currentConfig.continuousRotation,
    fps: fpsRef.current,
    downgradesRemaining: Math.max(0, maxDowngrades - downgradesUsed),
    isReducedMotion,
    recordFrame,
    setReducedMotion: setManualReducedMotion,
  };
}

export default useAdaptiveQuality;

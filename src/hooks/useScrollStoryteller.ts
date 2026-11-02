import { useState, useEffect } from 'react';

export type SectionId = 'hero' | 'about' | 'skills' | 'experience' | 'projects' | 'contact';

export interface Transform3D {
  position: [number, number, number];
  rotation: [number, number, number];
  scale: number;
  opacity: number;
}

export interface StorytellerKeyframe {
  id: SectionId;
  progress: number;
  transform: Transform3D;
  mobilePosition?: [number, number, number];
  mobileScale?: number;
}

/**
 * 6-Section 3D Transformation Keyframe Matrix
 *
 * Section Anchors:
 * - Hero ($S_p \approx 0.0$): Centered, deep space presence behind hero canvas.
 * - About ($S_p \approx 0.2$): Shifted right to complement left text column.
 * - Skills ($S_p \approx 0.4$): Shifted left-back to frame the 3-column bento card grid.
 * - Experience ($S_p \approx 0.6$): Shifted right to balance left-aligned timeline.
 * - Projects ($S_p \approx 0.8$): Shifted left-center with subtle scale to showcase 2-column cards.
 * - Contact ($S_p \approx 1.0$): Small, calm background accent behind the form.
 */
export const STORY_KEYFRAMES: StorytellerKeyframe[] = [
  {
    id: 'hero',
    progress: 0.0,
    transform: {
      position: [0.0, 0.0, 0.0],
      rotation: [0.0, 0.0, 0.0],
      scale: 1.0,
      opacity: 0.9,
    },
    mobilePosition: [0.0, 0.2, -0.4],
    mobileScale: 0.75,
  },
  {
    id: 'about',
    progress: 0.2,
    transform: {
      position: [3.1, -0.1, -0.9],
      rotation: [0.3, 0.8, -0.1],
      scale: 0.6,
      opacity: 0.44,
    },
    mobilePosition: [0.6, 0.1, -0.9],
    mobileScale: 0.48,
  },
  {
    id: 'skills',
    progress: 0.4,
    transform: {
      position: [-2.2, 0.1, -0.6],
      rotation: [-0.3, 1.7, 0.2],
      scale: 0.7,
      opacity: 0.62,
    },
    mobilePosition: [-0.5, 0.0, -0.8],
    mobileScale: 0.55,
  },
  {
    id: 'experience',
    progress: 0.6,
    transform: {
      position: [2.5, -0.2, -0.9],
      rotation: [0.4, 2.5, -0.3],
      scale: 0.7,
      opacity: 0.5,
    },
    mobilePosition: [0.6, -0.1, -1.0],
    mobileScale: 0.5,
  },
  {
    id: 'projects',
    progress: 0.8,
    transform: {
      position: [-2.4, -0.2, -0.8],
      rotation: [0.2, 3.4, 0.4],
      scale: 0.72,
      opacity: 0.58,
    },
    mobilePosition: [-0.4, -0.1, -0.7],
    mobileScale: 0.54,
  },
  {
    id: 'contact',
    progress: 1.0,
    transform: {
      position: [0.0, 0.0, -1.2],
      rotation: [0.1, 4.2, 0.0],
      scale: 0.55,
      opacity: 0.28,
    },
    mobilePosition: [0.0, -0.2, -1.5],
    mobileScale: 0.42,
  },
];

/**
 * Piecewise linear interpolation between keyframes.
 * Guarantees 100% deterministic bidirectional reversibility:
 * For any given progress $S_p \in [0, 1]$, the output values are identical
 * whether moving forwards or backwards through the scroll range.
 */
export function interpolateStoryKeyframes(
  progress: number,
  isMobile: boolean = false
): Transform3D {
  const p = Math.max(0, Math.min(1, progress));
  const keyframes = STORY_KEYFRAMES;

  if (p <= keyframes[0].progress) {
    const k = keyframes[0];
    return {
      position: isMobile && k.mobilePosition ? [...k.mobilePosition] : [...k.transform.position],
      rotation: [...k.transform.rotation],
      scale: isMobile && k.mobileScale ? k.mobileScale : k.transform.scale,
      opacity: k.transform.opacity,
    };
  }

  if (p >= keyframes[keyframes.length - 1].progress) {
    const k = keyframes[keyframes.length - 1];
    return {
      position: isMobile && k.mobilePosition ? [...k.mobilePosition] : [...k.transform.position],
      rotation: [...k.transform.rotation],
      scale: isMobile && k.mobileScale ? k.mobileScale : k.transform.scale,
      opacity: k.transform.opacity,
    };
  }

  // Find active segment
  let i = 0;
  while (i < keyframes.length - 1 && p > keyframes[i + 1].progress) {
    i++;
  }

  const kA = keyframes[i];
  const kB = keyframes[i + 1];
  const range = kB.progress - kA.progress;
  const t = range > 0 ? (p - kA.progress) / range : 0;

  const posA = isMobile && kA.mobilePosition ? kA.mobilePosition : kA.transform.position;
  const posB = isMobile && kB.mobilePosition ? kB.mobilePosition : kB.transform.position;
  const scaleA = isMobile && kA.mobileScale ? kA.mobileScale : kA.transform.scale;
  const scaleB = isMobile && kB.mobileScale ? kB.mobileScale : kB.transform.scale;

  return {
    position: [
      posA[0] + (posB[0] - posA[0]) * t,
      posA[1] + (posB[1] - posA[1]) * t,
      posA[2] + (posB[2] - posA[2]) * t,
    ],
    rotation: [
      kA.transform.rotation[0] + (kB.transform.rotation[0] - kA.transform.rotation[0]) * t,
      kA.transform.rotation[1] + (kB.transform.rotation[1] - kA.transform.rotation[1]) * t,
      kA.transform.rotation[2] + (kB.transform.rotation[2] - kA.transform.rotation[2]) * t,
    ],
    scale: scaleA + (scaleB - scaleA) * t,
    opacity: kA.transform.opacity + (kB.transform.opacity - kA.transform.opacity) * t,
  };
}

export function getCurrentSectionId(progress: number): SectionId {
  const p = Math.max(0, Math.min(1, progress));
  if (p < 0.1) return 'hero';
  if (p < 0.3) return 'about';
  if (p < 0.5) return 'skills';
  if (p < 0.7) return 'experience';
  if (p < 0.9) return 'projects';
  return 'contact';
}

export interface ScrollStorytellerState {
  scrollProgress: number;
  currentSection: SectionId;
  targetTransform: Transform3D;
  isMobile: boolean;
}

/**
 * useScrollStoryteller Hook
 *
 * Provides:
 * - High-precision normalized scroll progress $S_p \in [0, 1]$ via native passive scroll listener.
 * - Deterministic, bidirectionally reversible 3D transformation matrix across 6 sections.
 * - One scroll rAF publishes target changes; DigitalCoreScene handles smoothing.
 * - Zero virtual scroll-jacking: 100% native compositor scrolling at 120Hz/60Hz.
 */
export function useScrollStoryteller(): ScrollStorytellerState {
  const [state, setState] = useState<ScrollStorytellerState>(() => {
    return {
      scrollProgress: 0,
      currentSection: 'hero',
      targetTransform: interpolateStoryKeyframes(0, false),
      isMobile: false,
    };
  });

  useEffect(() => {
    let maxScroll = 1;
    const updateDimensions = () => {
      maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    };
    let scrollRafId: number | null = null;
    const publishScroll = () => {
      scrollRafId = null;
      const mobile = window.innerWidth < 768;
      const progress = Math.max(0, Math.min(1, window.scrollY / maxScroll));
      setState((previous) => {
        if (Math.abs(previous.scrollProgress - progress) < 1e-5 && previous.isMobile === mobile) return previous;
        return {
          scrollProgress: progress,
          currentSection: getCurrentSectionId(progress),
          targetTransform: interpolateStoryKeyframes(progress, mobile),
          isMobile: mobile,
        };
      });
    };
    const handleScroll = () => {
      if (scrollRafId !== null) return;
      scrollRafId = requestAnimationFrame(publishScroll);
    };
    const handleLayoutChange = () => {
      updateDimensions();
      handleScroll();
    };
    const layoutObserver = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(handleLayoutChange)
      : null;
    layoutObserver?.observe(document.body);
    handleLayoutChange();
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleLayoutChange, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleLayoutChange);
      layoutObserver?.disconnect();
      if (scrollRafId !== null) {
        cancelAnimationFrame(scrollRafId);
        scrollRafId = null;
      }
    };
  }, []);

  return state;
}

export default useScrollStoryteller;

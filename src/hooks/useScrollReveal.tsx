import React, { useEffect, useRef, useState } from 'react';

export interface ScrollRevealProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  threshold?: number;
  direction?: 'up' | 'none' | 'left' | 'right';
}

/**
 * ScrollReveal Component
 *
 * Lightweight, GPU-accelerated viewport reveal wrapper.
 * Features:
 * - Native IntersectionObserver with automatic cleanup.
 * - Compositor-only transform & opacity transitions (zero layout shift).
 * - Full `prefers-reduced-motion` compliance.
 * - Configurable staggered transition delay.
 */
export function ScrollReveal({
  children,
  className = '',
  delay = 0,
  threshold = 0.12,
  direction = 'up',
}: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  // Deterministic first render keeps the build-time HTML and hydration identical.
  const [isVisible, setIsVisible] = useState(false);
  const [isReducedMotion, setIsReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => {
      setIsReducedMotion(mediaQuery.matches);
      if (mediaQuery.matches) setIsVisible(true);
    };
    update();
    mediaQuery.addEventListener('change', update);
    return () => mediaQuery.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    if (isReducedMotion) {
      setIsVisible(true);
      return;
    }

    if (!ref.current || typeof IntersectionObserver === 'undefined') {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold,
        rootMargin: '0px 0px -40px 0px',
      }
    );

    observer.observe(ref.current);

    return () => {
      observer.disconnect();
    };
  }, [threshold, isReducedMotion]);

  const getTransformClass = () => {
    if (isVisible || isReducedMotion) return 'opacity-100 translate-y-0 translate-x-0 scale-100';
    switch (direction) {
      case 'up':
        return 'opacity-0 translate-y-4';
      case 'left':
        return 'opacity-0 -translate-x-4';
      case 'right':
        return 'opacity-0 translate-x-4';
      case 'none':
        return 'opacity-0';
      default:
        return 'opacity-0 translate-y-4';
    }
  };

  return (
    <div
      ref={ref}
      style={{
        transitionDelay: isReducedMotion ? '0ms' : `${Math.min(500, Math.max(0, delay))}ms`,
      }}
      className={`scroll-reveal transition-[transform,opacity] duration-[520ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${getTransformClass()} ${className}`}
    >
      {children}
    </div>
  );
}

export default ScrollReveal;

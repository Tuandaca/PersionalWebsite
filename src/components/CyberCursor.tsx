import React, { useEffect, useRef, useState } from 'react';

/**
 * CyberCursor Component
 *
 * Restrained futuristic neon-green cyber cursor active exclusively on fine pointer devices.
 * - Tiny 5px bright green inner dot tracking pointer immediately.
 * - Soft 26px outer ring following with smooth damped lerp.
 * - Expands to ~48px with cyber glow over interactive elements (a, button, .bento-card, etc.).
 * - Non-blocking pointer-events-none, strictly zero interference with text selection.
 * - Auto-disabled on touch, coarse pointer, and reduced-motion devices.
 */
export function CyberCursor() {
  const [enabled, setEnabled] = useState<boolean>(false);
  const dotRef = useRef<HTMLDivElement | null>(null);
  const ringRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Only activate on fine pointers with hover capability
    const mql = window.matchMedia('(pointer: fine) and (hover: hover)');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updateEnabled = () => {
      setEnabled(mql.matches && !reducedMotion.matches);
    };
    updateEnabled();

    if (mql.addEventListener) {
      mql.addEventListener('change', updateEnabled);
      reducedMotion.addEventListener('change', updateEnabled);
    } else {
      (mql as any).addListener(updateEnabled);
      (reducedMotion as any).addListener(updateEnabled);
    }

    return () => {
      if (mql.removeEventListener) {
        mql.removeEventListener('change', updateEnabled);
        reducedMotion.removeEventListener('change', updateEnabled);
      } else {
        (mql as any).removeListener(updateEnabled);
        (reducedMotion as any).removeListener(updateEnabled);
      }
    };
  }, []);

  useEffect(() => {
    if (!enabled) {
      document.body.classList.remove('has-custom-cursor');
      return;
    }

    document.body.classList.add('has-custom-cursor');

    let targetX = -100;
    let targetY = -100;
    let ringX = -100;
    let ringY = -100;
    let isVisible = false;
    let isHovering = false;
    let isMouseDown = false;
    let isRunning = false;
    let rafId: number | null = null;

    const stopLoop = () => {
      isRunning = false;
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    };

    // Smooth animation loop for outer ring
    const render = () => {
      if (!isVisible) {
        stopLoop();
        return;
      }

      // Immediate inner dot tracking
      if (dotRef.current) {
        dotRef.current.style.transform = `translate3d(${targetX}px, ${targetY}px, 0) translate(-50%, -50%)`;
      }

      // Smooth trailing lerp for outer ring (lerp factor 0.22)
      const lerpFactor = 0.22;
      ringX += (targetX - ringX) * lerpFactor;
      ringY += (targetY - ringY) * lerpFactor;

      if (ringRef.current) {
        // Scale for hover / click
        const scale = isMouseDown ? 0.85 : isHovering ? 1.85 : 1.0;
        ringRef.current.style.transform = `translate3d(${ringX}px, ${ringY}px, 0) translate(-50%, -50%) scale(${scale})`;
      }

      if (Math.abs(targetX - ringX) < 0.35 && Math.abs(targetY - ringY) < 0.35) {
        ringX = targetX;
        ringY = targetY;
        stopLoop();
      } else {
        rafId = requestAnimationFrame(render);
      }
    };

    const startLoop = () => {
      if (!isRunning && isVisible && !document.hidden) {
        isRunning = true;
        rafId = requestAnimationFrame(render);
      }
    };

    const onPointerMove = (e: MouseEvent) => {
      targetX = e.clientX;
      targetY = e.clientY;
      if (dotRef.current) {
        dotRef.current.style.transform = `translate3d(${targetX}px, ${targetY}px, 0) translate(-50%, -50%)`;
      }

      if (!isVisible) {
        isVisible = true;
        ringX = targetX;
        ringY = targetY;
        if (dotRef.current) dotRef.current.style.opacity = '1';
        if (ringRef.current) ringRef.current.style.opacity = '0.35';
        startLoop();
      }

      // Check if hovering over interactive element
      const target = e.target as HTMLElement | null;
      const interactiveEl = target?.closest(
        'a, button, [role="button"], .bento-card, .skill-pill, input, textarea, select, .interactive'
      );
      const nextHovering = !!interactiveEl;
      if (nextHovering !== isHovering) {
        isHovering = nextHovering;
        if (ringRef.current) {
          ringRef.current.classList.toggle('is-hovering', isHovering);
          ringRef.current.style.opacity = isHovering ? '1' : '0.35';
        }
      }
      startLoop();
    };

    const onMouseDown = () => {
      isMouseDown = true;
      startLoop();
    };

    const onMouseUp = () => {
      isMouseDown = false;
      startLoop();
    };

    const onMouseLeave = () => {
      isVisible = false;
      if (dotRef.current) dotRef.current.style.opacity = '0';
      if (ringRef.current) {
        ringRef.current.style.opacity = '0';
        ringRef.current.classList.remove('is-hovering');
      }
      isHovering = false;
      stopLoop();
    };

    const onMouseEnter = () => {
      if (targetX < 0) return;
      isVisible = true;
      if (dotRef.current) dotRef.current.style.opacity = '1';
      if (ringRef.current) ringRef.current.style.opacity = isHovering ? '1' : '0.35';
      startLoop();
    };

    const onVisibilityChange = () => {
      if (document.hidden) stopLoop();
    };

    window.addEventListener('mousemove', onPointerMove, { passive: true });
    window.addEventListener('mousedown', onMouseDown, { passive: true });
    window.addEventListener('mouseup', onMouseUp, { passive: true });
    document.addEventListener('mouseleave', onMouseLeave);
    document.addEventListener('mouseenter', onMouseEnter);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      stopLoop();
      window.removeEventListener('mousemove', onPointerMove);
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
      document.removeEventListener('mouseleave', onMouseLeave);
      document.removeEventListener('mouseenter', onMouseEnter);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      document.body.classList.remove('has-custom-cursor');
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none select-none z-[9999] overflow-hidden"
    >
      <style>{`
        .cyber-cursor-ring {
          border-color: rgba(0, 255, 135, 0.85);
          background-color: transparent;
          box-shadow: 0 0 10px rgba(0, 255, 135, 0.2);
        }
        .cyber-cursor-ring.is-hovering {
          border-color: rgba(0, 255, 135, 0.95);
          background-color: rgba(0, 255, 135, 0.08);
          box-shadow: 0 0 24px rgba(0, 255, 135, 0.45);
        }
      `}</style>
      {/* Outer glowing ring (26px, expands to ~48px on hover) */}
      <div
        ref={ringRef}
        style={{
          width: '26px',
          height: '26px',
          opacity: 0,
          transition: 'opacity 0.25s ease-out, border-color 0.2s ease, background-color 0.2s ease, box-shadow 0.2s ease',
        }}
        className="cyber-cursor-ring fixed top-0 left-0 rounded-full border will-change-transform"
      />

      {/* Inner pinpoint dot (~5px, bright #00FF87) */}
      <div
        ref={dotRef}
        style={{
          width: '5px',
          height: '5px',
          opacity: 0,
          transition: 'opacity 0.25s ease-out',
        }}
        className="fixed top-0 left-0 rounded-full bg-[#00ff87] shadow-[0_0_8px_#00ff87] will-change-transform"
      />
    </div>
  );
}

export default CyberCursor;

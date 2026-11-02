import React, { useMemo } from 'react';

export interface FallbackBackgroundProps {
  className?: string;
  showParticles?: boolean;
}

interface ParticleNode {
  id: number;
  cx: number;
  cy: number;
  r: number;
  opacity: number;
  duration: number;
  delay: number;
}

/**
 * FallbackBackground
 *
 * High-fidelity procedural SVG/CSS dark cyber-minimalism background.
 * Active when WebGL is unsupported or when reduced motion is requested.
 * Zero external assets or 3D models.
 * Pure vector geometries, emerald glows (#00ff87, #10b981, #020704), and floating nodes.
 */
export const FallbackBackground: React.FC<FallbackBackgroundProps> = ({
  className = '',
  showParticles = true,
}) => {
  // Deterministic procedural particles for consistent server/client hydration
  const particles = useMemo<ParticleNode[]>(() => {
    const nodes: ParticleNode[] = [];
    const count = 36;
    for (let i = 0; i < count; i++) {
      // Deterministic pseudo-random distribution
      const seed = i + 1;
      const x = ((seed * 9301 + 49297) % 233280) / 233280;
      const y = (((seed * 7 + 13) * 9301 + 49297) % 233280) / 233280;
      const r = 1 + (seed % 3) * 0.75;
      const opacity = 0.25 + (seed % 5) * 0.15;
      const duration = 4 + (seed % 6) * 1.2;
      const delay = (seed % 7) * 0.7;

      nodes.push({
        id: i,
        cx: Math.round(x * 1000) / 10, // percentage 0-100%
        cy: Math.round(y * 1000) / 10,
        r,
        opacity,
        duration,
        delay,
      });
    }
    return nodes;
  }, []);

  return (
    <div
      className={`fixed inset-0 pointer-events-none select-none overflow-hidden z-0 ${className}`}
      aria-hidden="true"
    >
      <style>{`
        @keyframes cyber-pulse {
          0%, 100% { opacity: 0.35; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.05); }
        }
        @keyframes grid-drift {
          0% { stroke-dashoffset: 0; }
          100% { stroke-dashoffset: 60; }
        }
        @keyframes ring-spin-slow {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes ring-spin-reverse {
          0% { transform: rotate(360deg); }
          100% { transform: rotate(0deg); }
        }
        @keyframes particle-float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-12px); }
        }

        .cyber-grid-line {
          stroke: rgba(0, 255, 135, 0.08);
          stroke-width: 1;
        }
        .cyber-grid-accent {
          stroke: rgba(16, 185, 129, 0.2);
          stroke-width: 1.5;
          stroke-dasharray: 6 14;
          animation: grid-drift 20s linear infinite;
        }
        .cyber-orbit-ring {
          transform-origin: 50% 45%;
          animation: ring-spin-slow 70s linear infinite;
        }
        .cyber-orbit-ring-rev {
          transform-origin: 50% 45%;
          animation: ring-spin-reverse 90s linear infinite;
        }
        .cyber-glow-ambient {
          animation: cyber-pulse 8s ease-in-out infinite;
        }
        .cyber-particle {
          animation: particle-float ease-in-out infinite;
        }

        @media (prefers-reduced-motion: reduce) {
          .cyber-grid-accent,
          .cyber-orbit-ring,
          .cyber-orbit-ring-rev,
          .cyber-glow-ambient,
          .cyber-particle {
            animation: none !important;
            transform: none !important;
          }
        }
      `}</style>

      {/* SVG Canvas for precision vector cyber-space */}
      <svg
        className="absolute inset-0 w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          {/* Ambient radial emerald glows */}
          <radialGradient id="emerald-glow-primary" cx="50%" cy="42%" r="55%">
            <stop offset="0%" stopColor="#00ff87" stopOpacity="0.14" />
            <stop offset="45%" stopColor="#10b981" stopOpacity="0.06" />
            <stop offset="80%" stopColor="#021c0e" stopOpacity="0.02" />
            <stop offset="100%" stopColor="#020704" stopOpacity="0" />
          </radialGradient>

          <radialGradient id="emerald-glow-secondary" cx="80%" cy="20%" r="40%">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.12" />
            <stop offset="60%" stopColor="#00ff87" stopOpacity="0.03" />
            <stop offset="100%" stopColor="#020704" stopOpacity="0" />
          </radialGradient>

          <radialGradient id="emerald-glow-bottom" cx="20%" cy="85%" r="45%">
            <stop offset="0%" stopColor="#00ff87" stopOpacity="0.09" />
            <stop offset="65%" stopColor="#022a14" stopOpacity="0.03" />
            <stop offset="100%" stopColor="#020704" stopOpacity="0" />
          </radialGradient>

          {/* Coordinate grid pattern */}
          <pattern id="cyber-grid-pattern" width="60" height="60" patternUnits="userSpaceOnUse">
            <path d="M 60 0 L 0 0 0 60" fill="none" stroke="rgba(0, 255, 135, 0.04)" strokeWidth="1" />
            <circle cx="0" cy="0" r="1.5" fill="rgba(0, 255, 135, 0.25)" />
          </pattern>
        </defs>

        {/* Ambient radial glows */}
        <rect width="100%" height="100%" fill="url(#emerald-glow-primary)" className="cyber-glow-ambient" />
        <rect width="100%" height="100%" fill="url(#emerald-glow-secondary)" />
        <rect width="100%" height="100%" fill="url(#emerald-glow-bottom)" />

        {/* Procedural cyber-grid overlay */}
        <rect width="100%" height="100%" fill="url(#cyber-grid-pattern)" />

        {/* Perspective / Radial Orbital Rings reminiscent of DEV.NETWORK core */}
        <g className="cyber-orbit-ring" opacity="0.6">
          <ellipse
            cx="50%"
            cy="45%"
            rx="320"
            ry="190"
            fill="none"
            stroke="rgba(0, 255, 135, 0.16)"
            strokeWidth="1.2"
            strokeDasharray="8 12"
          />
          <ellipse
            cx="50%"
            cy="45%"
            rx="460"
            ry="270"
            fill="none"
            stroke="rgba(16, 185, 129, 0.1)"
            strokeWidth="1"
            strokeDasharray="4 18"
          />
        </g>

        <g className="cyber-orbit-ring-rev" opacity="0.45">
          <ellipse
            cx="50%"
            cy="45%"
            rx="240"
            ry="140"
            fill="none"
            stroke="rgba(0, 255, 135, 0.22)"
            strokeWidth="1"
            strokeDasharray="16 10"
          />
          <ellipse
            cx="50%"
            cy="45%"
            rx="560"
            ry="330"
            fill="none"
            stroke="rgba(0, 255, 135, 0.06)"
            strokeWidth="1"
          />
        </g>

        {/* Accent network rays & crosshairs */}
        <g opacity="0.5">
          <line x1="50%" y1="0" x2="50%" y2="100%" className="cyber-grid-accent" />
          <line x1="0" y1="45%" x2="100%" y2="45%" className="cyber-grid-accent" />
          <circle cx="50%" cy="45%" r="6" fill="none" stroke="#00ff87" strokeWidth="1.5" opacity="0.7" />
          <circle cx="50%" cy="45%" r="2" fill="#00ff87" opacity="0.9" />
        </g>

        {/* Floating particle nodes */}
        {showParticles &&
          particles.map((p) => (
            <circle
              key={p.id}
              cx={`${p.cx}%`}
              cy={`${p.cy}%`}
              r={p.r}
              fill="#00ff87"
              opacity={p.opacity}
              className="cyber-particle"
              style={{
                animationDuration: `${p.duration}s`,
                animationDelay: `${p.delay}s`,
              }}
            />
          ))}
      </svg>
    </div>
  );
};

export default FallbackBackground;

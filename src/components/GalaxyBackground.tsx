import React from 'react';
import type { QualityTier } from '../hooks/useAdaptiveQuality';

type StarLayer = { name: string; count: number; seed: number; color: string; radius: number };

const STAR_LAYERS: StarLayer[] = [
  { name: 'dust-a', count: 28, seed: 11, color: '#90e1b5', radius: 0.55 },
  { name: 'dust-b', count: 28, seed: 29, color: '#00ff87', radius: 0.55 },
  { name: 'dust-c', count: 28, seed: 47, color: '#c3f4d5', radius: 0.55 },
  { name: 'stars', count: 30, seed: 73, color: '#b1ffd3', radius: 0.9 },
  { name: 'bright', count: 6, seed: 97, color: '#e0ffeb', radius: 1.4 },
];

function seededRandom(seed: number): () => number {
  let value = seed;
  return () => {
    value = (value * 16807) % 2147483647;
    return (value - 1) / 2147483646;
  };
}

const STAR_POSITIONS = STAR_LAYERS.map(({ count, seed, name }) => {
  const random = seededRandom(seed);
  return Array.from({ length: count }, () => {
    const x = 4 + random() * 92;
    // The secondary dust layers gather loosely around the existing diagonal band.
    const bandDust = name === 'dust-b' || name === 'dust-c';
    const y = bandDust
      ? Math.max(4, Math.min(96, 78 - x * 0.56 + (random() - random()) * 29))
      : 4 + random() * 92;
    return {
      x: `${x.toFixed(2)}%`,
      y: `${y.toFixed(2)}%`,
      opacity: 0.52 + random() * 0.48,
    };
  });
});

const STREAM_DUST = (() => {
  const random = seededRandom(131);
  return Array.from({ length: 24 }, () => {
    const x = 12 + random() * 76;
    return {
      x: `${x.toFixed(2)}%`,
      y: `${Math.max(7, Math.min(93, 76 - x * 0.52 + (random() - random()) * 15)).toFixed(2)}%`,
      radius: Number((0.42 + random() * 0.37).toFixed(2)),
      opacity: Number((0.3 + random() * 0.4).toFixed(2)),
    };
  });
})();

export const GalaxyBackground = React.memo(function GalaxyBackground({ tier }: { tier: QualityTier }) {
  return (
    <div className="galaxy-background" data-quality={tier} aria-hidden="true">
      <div className="galaxy-band" />
      <div className="galaxy-lanes" />
      <svg className="galaxy-starfield" width="100%" height="100%" aria-hidden="true">
        {STAR_LAYERS.map((layer, index) => (
          <g key={layer.name} className={`galaxy-points galaxy-${layer.name}`} fill={layer.color}>
            {STAR_POSITIONS[index].map((star, starIndex) => (
              <circle key={starIndex} cx={star.x} cy={star.y} r={layer.radius} opacity={star.opacity * (index < 3 ? 0.55 : 0.8)} />
            ))}
          </g>
        ))}
      </svg>
      <svg className="galaxy-stream" width="100%" height="100%" aria-hidden="true">
        <g fill="#87d9ad">
          {STREAM_DUST.map((point, pointIndex) => (
            <circle key={pointIndex} cx={point.x} cy={point.y} r={point.radius} opacity={point.opacity} />
          ))}
        </g>
      </svg>
      {[12, 31, 47, 68, 81, 92].map((left, index) => (
        <span
          key={left}
          className="galaxy-twinkle"
          style={{ left: `${left}%`, top: `${[27, 71, 44, 82, 19, 56][index]}%`, animationDuration: `${3.4 + index * 0.7}s`, animationDelay: `${-index * 1.3}s` }}
        />
      ))}
    </div>
  );
});

# ForceFieldBackground Reference

The hero background is a p5.js particle field of binary glyphs suspended in digital space. Particles are pushed away from the pointer and pulled back by spring restoration, with uniform spatial-grid partitioning so each frame only tests nearby cells.

Source: [`src/Component.tsx`](../src/Component.tsx)

## Behaviour

- Binary digits only (`0` / `1`), drawn through a pre-rendered glyph atlas and blitted as a texture.
- Repulsion force plus friction damping and a restoration spring; particles return to their origin after the pointer leaves.
- Binary flip cadence of roughly 1.5–4.0 s, with faster flips near the pointer.
- Brightness-mapped placement from an optional source image; falls back to a procedural landscape when no image is supplied or loading fails.
- Renders a single static frame when `isActive` is false, when the tab is hidden, or when `prefers-reduced-motion: reduce` is set.

## Props

Defaults below are the runtime defaults from the component's parameter destructuring.

| Prop | Type | Default | Description |
|---|---|---|---|
| `imageUrl` | `string` | `""` | Source image for brightness mapping. Empty or failed loads use the procedural fallback pattern. |
| `hue` | `number` | `135` | Base hue of the generated palette (0–360). |
| `saturation` | `number` | `95` | Palette saturation (0–100). |
| `threshold` | `number` | `255` | Brightness threshold for particle visibility (0–255). |
| `minStroke` | `number` | `1.5` | Minimum glyph stroke weight. |
| `maxStroke` | `number` | `5` | Maximum glyph stroke weight. |
| `spacing` | `number` | `22` | Grid spacing; lower values produce denser particles. |
| `noiseScale` | `number` | `0` | Irregularity of particle placement. |
| `density` | `number` | `2.0` | Spawn probability factor. |
| `invertImage` | `boolean` | `true` | Invert source-image brightness mapping. |
| `invertWireframe` | `boolean` | `true` | Invert the particle visibility condition. |
| `magnifierEnabled` | `boolean` | `true` | Enable pointer repulsion. |
| `magnifierRadius` | `number` | `175` | Pointer interaction radius in pixels. |
| `forceStrength` | `number` | `18` | Magnitude of the repulsion force. |
| `friction` | `number` | `0.86` | Velocity damping factor (0–1). |
| `restoreSpeed` | `number` | `0.14` | Spring restoration speed. |
| `magnifierInertia` | `number` | `0.96` | Pointer follow responsiveness (0–1). |
| `className` | `string` | `""` | Additional container classes. |
| `isActive` | `boolean` | `true` | Drives `p.loop()` / `p.noLoop()` for the physics simulation. |
| `opacity` | `number` | `1.0` | External opacity multiplier used for crossfading with the WebGL scene. |
| `qualityPreset` | `QualityConfig \| QualityTier` | — | Adaptive quality tier from `useAdaptiveQuality`. |

## Imperative handle

```ts
export interface ForceFieldBackgroundHandle {
  pause: () => void;
  resume: () => void;
  getP5: () => p5 | null;
}
```

`pause()` and `resume()` are used by `useCanvasCoordinator` when ownership of the hero viewport switches between the p5 canvas and the Three.js scene.

## Usage

```tsx
import { ForceFieldBackground } from './Component';

<ForceFieldBackground
  isActive={isHeroVisible}
  opacity={heroOpacity}
  qualityPreset={quality}
  hue={135}
  spacing={22}
  forceStrength={18}
/>
```

## Related

- [`src/hooks/useCanvasCoordinator.ts`](../src/hooks/useCanvasCoordinator.ts) — scroll-driven crossfade and visibility handling.
- [`src/hooks/useAdaptiveQuality.ts`](../src/hooks/useAdaptiveQuality.ts) — quality tiers and FPS-based adjustment.

# ForceFieldBackground Integration

A high-performance, interactive particle system background that reacts to mouse movement with a magnetic "force field" effect. Built with **p5.js**, **React**, and **Tailwind CSS**.

## Features

- **Interactive Force Field**: Particles disperse smoothly as the cursor or finger moves through them with fluid physics.
- **Image-Based Brightness Mapping**: Particles are placed and sized based on grayscale brightness sampling of an underlying source image.
- **Dynamic Spring Physics**: Inertial lerping, friction dampening, and Hooke's restoration forces keep motion fluid and stable.
- **Live React Props Sync**: Custom `propsRef` synchronization enables 60 FPS slider tweaking without tearing down the canvas context.
- **Touch & Mobile Support**: Automatically handles pointer and touch events, plus graceful fallback patterns if external images fail.
- **Production Ready**: Responsive canvas resizing, proper p5 instance cleanup, and TypeScript definitions.

## Project Structure

```
├── index.html              # HTML shell with Inter typography & viewport settings
├── package.json            # Vite, React, p5, Lucide-react, Tailwind dependencies
├── tailwind.config.js      # Design tokens and font families
├── src/
│   ├── Component.tsx       # Core ForceFieldBackground p5.js React component
│   ├── App.tsx             # State-of-the-art interactive Hero showcase & HUD
│   ├── main.tsx            # React root mount
│   └── index.css           # Tailwind base styles and custom range input rules
└── README.md
```

## Quick Start

```bash
npm install
npm run dev
```

## Component API & Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `imageUrl` | string | Pixabay Alps image | Source image for brightness mapping (with automatic procedural fallback) |
| `hue` | number | 210 | Color hue (0–360) |
| `saturation` | number | 100 | Color saturation (0–100) |
| `spacing` | number | 10 | Grid resolution (lower = denser particles) |
| `density` | number | 2.0 | Random spawn probability factor |
| `minStroke` | number | 2 | Minimum particle stroke weight |
| `maxStroke` | number | 6 | Maximum particle stroke weight |
| `forceStrength` | number | 10 | Magnitude of cursor repulsion force |
| `magnifierRadius` | number | 150 | Interaction radius in pixels |
| `friction` | number | 0.9 | Kinetic friction multiplier (0.5–0.99) |
| `restoreSpeed` | number | 0.05 | Spring restoration speed |
| `className` | string | `""` | Container styling classes |

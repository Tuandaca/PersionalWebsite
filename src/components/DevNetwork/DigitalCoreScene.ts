import * as THREE from 'three';
import {
  createFresnelCoreMaterial,
  createAtmosphericHaloMaterial,
} from './shaders/fresnelGlow';
import {
  type QualityConfig,
  type QualityTier,
  QUALITY_PRESETS,
} from '../../hooks/useAdaptiveQuality';

export interface SceneTransform {
  position?: THREE.Vector3 | [number, number, number];
  rotation?: THREE.Euler | [number, number, number];
  scale?: number;
  opacity?: number;
}

export interface PulseNodeData {
  basePos: THREE.Vector3;
  phase: number;
  freq: number;
}

export interface SynapticStream {
  curve: THREE.QuadraticBezierCurve3;
  speed: number;
  progress: number;
}

export interface DigitalCoreSceneOptions {
  canvas: HTMLCanvasElement;
  width?: number;
  height?: number;
  pixelRatio?: number;
  qualityPreset?: QualityTier | QualityConfig;
  scrollProgress?: number;
  onFrameTick?: (delta: number) => void;
  onContextLost?: () => void;
  onContextRestored?: () => void;
}

/**
 * DigitalCoreScene
 *
 * Vanilla Three.js orchestrator encapsulating the 6 procedural geometry layers:
 * 1. Wireframe Shell: Geodesic emerald icosahedron.
 * 2. Instanced Pulse Nodes: Glowing spheres at vertices with rhythmic scale pulsation.
 * 3. Concentric Gimbal Orbital Rings: 3 thin rings with independent tilt & precession.
 * 4. Synaptic Data Streams: Quadratic Bezier arcs connecting nodes with traveling pulse packets.
 * 5. Fresnel Plasma Inner Core & Atmospheric Halo: Shader-driven rim glow & outer aura.
 * 6. Cosmic Ambient Particle Cloud: Deep space Points field with galactic drift.
 *
 * The decorative Galaxy is rendered by CSS behind this scene.
 */
export class DigitalCoreScene {
  private canvas: HTMLCanvasElement;
  private renderer: THREE.WebGLRenderer | null = null;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;

  // Root container groups for hierarchical animation & scroll storytelling
  private rootGroup: THREE.Group;
  private coreGroup: THREE.Group;
  private gimbalGroup: THREE.Group;
  private streamsGroup: THREE.Group;
  private particlesGroup: THREE.Group;

  private scrollProgress: number = 0;

  // Layer 1: Wireframe Shell
  private shellLineSegments: THREE.LineSegments | null = null;
  private shellInnerSegments: THREE.LineSegments | null = null;

  // Layer 2: Instanced Pulse Nodes
  private instancedNodes: THREE.InstancedMesh | null = null;
  private nodeDataList: PulseNodeData[] = [];
  private dummyMatrix: THREE.Object3D = new THREE.Object3D();

  // Layer 3: Concentric Gimbal Rings
  private gimbalRings: {
    mesh: THREE.Mesh;
    rotationSpeed: THREE.Vector3;
  }[] = [];

  // Layer 4: Synaptic Data Streams
  private synapticStreams: SynapticStream[] = [];
  private instancedPulses: THREE.InstancedMesh | null = null;
  private streamLines: THREE.LineSegments | null = null;

  // Layer 5: Fresnel Core & Halo
  private fresnelCoreMesh: THREE.Mesh | null = null;
  private fresnelHaloMesh: THREE.Mesh | null = null;
  private fresnelCoreMaterial: THREE.ShaderMaterial | null = null;
  private fresnelHaloMaterial: THREE.ShaderMaterial | null = null;

  // Layer 6: Cosmic Particles
  private cosmicParticles: THREE.Points | null = null;
  private particleSprite: THREE.CanvasTexture | null = null;

  // Animation & Lifecycle state
  private rafId: number | null = null;
  private lastTimestamp: number = performance.now();
  private lastRafTimestamp: number = performance.now();
  private elapsedTime: number = 0;
  private isPaused: boolean = false;
  private isDisposed: boolean = false;
  private ecoMode: boolean = false;

  // Smooth scroll transformation targets (for Milestone 3 integration)
  private targetPosition: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  private targetRotation: THREE.Euler = new THREE.Euler(0, 0, 0);
  private targetScale: number = 1.0;
  private currentScale: number = 1.0;
  private targetOpacity: number = 0.9;
  private currentOpacity: number = 0.9;

  // Adaptive Quality & Rotation state
  private continuousRotation: boolean = true;
  private currentQualityPreset: QualityConfig = QUALITY_PRESETS['high'];
  private onFrameTickCb?: (delta: number) => void;

  // Callbacks
  private onContextLostCb?: () => void;
  private onContextRestoredCb?: () => void;

  constructor(options: DigitalCoreSceneOptions) {
    this.canvas = options.canvas;
    this.onContextLostCb = options.onContextLost;
    this.onContextRestoredCb = options.onContextRestored;
    this.onFrameTickCb = options.onFrameTick;

    if (typeof options.scrollProgress === 'number') {
      this.scrollProgress = options.scrollProgress;
    }

    if (options.qualityPreset) {
      const preset = typeof options.qualityPreset === 'string'
        ? QUALITY_PRESETS[options.qualityPreset]
        : options.qualityPreset;
      if (preset) {
        this.currentQualityPreset = preset;
        this.continuousRotation = preset.continuousRotation;
      }
    }

    const width = options.width || this.canvas.clientWidth || window.innerWidth;
    const height = options.height || this.canvas.clientHeight || window.innerHeight;
    const pixelRatio = Math.min(options.pixelRatio ?? (window.devicePixelRatio || 1), this.currentQualityPreset.dpr);

    this.lastTimestamp = performance.now();
    this.lastRafTimestamp = this.lastTimestamp;
    this.elapsedTime = 0;
    this.scene = new THREE.Scene();

    // Distance fog: seamless blending of distant stars into deep space (Layer 0)
    this.scene.fog = new THREE.FogExp2(0x010503, 0.012);

    // Perspective Camera setup
    this.camera = new THREE.PerspectiveCamera(45, width / Math.max(height, 1), 0.1, 100);
    this.camera.position.set(0, 0, 7.5);

    // Initialize WebGLRenderer with modern color management
    try {
      this.renderer = new THREE.WebGLRenderer({
        canvas: this.canvas,
        alpha: true,
        antialias: true,
        powerPreference: 'high-performance',
      });
      this.renderer.setSize(width, height, false);
      this.renderer.setPixelRatio(pixelRatio);

      // Color Management & Tone Mapping specifications
      this.renderer.outputColorSpace = THREE.SRGBColorSpace;
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1.1;
      this.renderer.setClearColor(0x000000, 0); // Transparent canvas over DOM gradients
    } catch (e) {
      console.warn('DigitalCoreScene: Failed to initialize WebGLRenderer', e);
      throw e;
    }

    // Set up hierarchical groups
    this.rootGroup = new THREE.Group();
    this.coreGroup = new THREE.Group();
    this.gimbalGroup = new THREE.Group();
    this.streamsGroup = new THREE.Group();
    this.particlesGroup = new THREE.Group();

    this.rootGroup.add(this.coreGroup);
    this.rootGroup.add(this.gimbalGroup);
    this.rootGroup.add(this.streamsGroup);

    this.scene.add(this.rootGroup);
    this.scene.add(this.particlesGroup);

    // Build the 6 procedural layers
    this.initLayer1WireframeShell();
    this.initLayer2InstancedNodes();
    this.initLayer3GimbalRings();
    this.initLayer4SynapticStreams();
    this.initLayer5FresnelCoreAndHalo();
    this.initLayer6CosmicParticles();

    if (this.currentQualityPreset && this.cosmicParticles?.geometry) {
      const maxCount = 1400;
      const count = Math.max(0, Math.min(maxCount, this.currentQualityPreset.particles));
      this.cosmicParticles.geometry.setDrawRange(0, count);
    }

    // Context loss / restoration listeners
    this.canvas.addEventListener('webglcontextlost', this.handleContextLost, false);
    this.canvas.addEventListener('webglcontextrestored', this.handleContextRestored, false);

    // Start animation loop
    this.startAnimationLoop();
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // LAYER 1: Wireframe Geodesic Shell
  // ─────────────────────────────────────────────────────────────────────────────
  private initLayer1WireframeShell(): void {
    const radius = 2.0;
    const detail = 2; // Rich geodesic structure (320 faces)
    const icosahedronGeo = new THREE.IcosahedronGeometry(radius, detail);
    const wireframeGeo = new THREE.WireframeGeometry(icosahedronGeo);

    // Inner subtle secondary lattice
    const innerGeo = new THREE.IcosahedronGeometry(radius * 0.985, 1);
    const innerWireGeo = new THREE.WireframeGeometry(innerGeo);

    // Consolidate both outer and inner line segments into a single BufferGeometry (1 draw call instead of 2)
    const posOuter = wireframeGeo.attributes.position;
    const posInner = innerWireGeo.attributes.position;
    const totalCount = posOuter.count + posInner.count;

    const combinedPositions = new Float32Array(totalCount * 3);
    const combinedColors = new Float32Array(totalCount * 3);

    combinedPositions.set(posOuter.array as Float32Array, 0);
    combinedPositions.set(posInner.array as Float32Array, posOuter.array.length);

    const colorOuter = new THREE.Color(0x00ff87);
    for (let i = 0; i < posOuter.count; i++) {
      combinedColors[i * 3] = colorOuter.r;
      combinedColors[i * 3 + 1] = colorOuter.g;
      combinedColors[i * 3 + 2] = colorOuter.b;
    }

    // Inner lattice is secondary/dimmer: scale color by (0.22 / 0.50) = 0.44 for additive blending
    const colorInner = new THREE.Color(0x10b981).multiplyScalar(0.44);
    const offset = posOuter.count;
    for (let i = 0; i < posInner.count; i++) {
      combinedColors[(offset + i) * 3] = colorInner.r;
      combinedColors[(offset + i) * 3 + 1] = colorInner.g;
      combinedColors[(offset + i) * 3 + 2] = colorInner.b;
    }

    const combinedGeo = new THREE.BufferGeometry();
    combinedGeo.setAttribute('position', new THREE.BufferAttribute(combinedPositions, 3));
    combinedGeo.setAttribute('color', new THREE.BufferAttribute(combinedColors, 3));

    const wireframeMat = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.shellLineSegments = new THREE.LineSegments(combinedGeo, wireframeMat);
    this.coreGroup.add(this.shellLineSegments);
    this.shellInnerSegments = null;

    icosahedronGeo.dispose();
    wireframeGeo.dispose();
    innerGeo.dispose();
    innerWireGeo.dispose();
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // LAYER 2: Instanced Pulse Nodes
  // ─────────────────────────────────────────────────────────────────────────────
  private initLayer2InstancedNodes(): void {
    const radius = 2.0;
    const detail = 2;
    const icosahedronGeo = new THREE.IcosahedronGeometry(radius, detail);
    const positionsAttr = icosahedronGeo.attributes.position;

    // Deduplicate vertices to get exact unique node positions
    const uniqueMap = new Map<string, THREE.Vector3>();
    for (let i = 0; i < positionsAttr.count; i++) {
      const x = positionsAttr.getX(i);
      const y = positionsAttr.getY(i);
      const z = positionsAttr.getZ(i);
      const key = `${x.toFixed(3)}_${y.toFixed(3)}_${z.toFixed(3)}`;
      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, new THREE.Vector3(x, y, z));
      }
    }

    const uniquePositions = Array.from(uniqueMap.values());
    const count = uniquePositions.length;

    // Instanced sphere geometry for each node
    const sphereGeo = new THREE.SphereGeometry(0.045, 12, 12);
    const nodeMat = new THREE.MeshBasicMaterial({
      color: 0x00ff87,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.instancedNodes = new THREE.InstancedMesh(sphereGeo, nodeMat, count);
    this.nodeDataList = [];

    for (let i = 0; i < count; i++) {
      const pos = uniquePositions[i];
      const phase = (i * 1.37) % (Math.PI * 2);
      const freq = 2.0 + ((i % 5) * 0.4);

      this.nodeDataList.push({
        basePos: pos.clone(),
        phase,
        freq,
      });

      this.dummyMatrix.position.copy(pos);
      this.dummyMatrix.scale.set(1, 1, 1);
      this.dummyMatrix.updateMatrix();
      this.instancedNodes.setMatrixAt(i, this.dummyMatrix.matrix);
    }

    this.instancedNodes.instanceMatrix.needsUpdate = true;
    this.coreGroup.add(this.instancedNodes);

    icosahedronGeo.dispose();
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // LAYER 3: Concentric Gimbal Orbital Rings
  // ─────────────────────────────────────────────────────────────────────────────
  private initLayer3GimbalRings(): void {
    const ringConfigs = [
      {
        radius: 2.45,
        tube: 0.007,
        color: 0x00ff87,
        opacity: 0.65,
        initialRotation: new THREE.Euler(0.45, 0.2, 0),
        rotationSpeed: new THREE.Vector3(0.06, 0.1, 0.03),
      },
      {
        radius: 2.85,
        tube: 0.007,
        color: 0x10b981,
        opacity: 0.55,
        initialRotation: new THREE.Euler(-0.6, 0.7, 0.35),
        rotationSpeed: new THREE.Vector3(-0.04, 0.08, 0.05),
      },
      {
        radius: 3.25,
        tube: 0.006,
        color: 0x00ff87,
        opacity: 0.45,
        initialRotation: new THREE.Euler(0.9, -0.4, 0.7),
        rotationSpeed: new THREE.Vector3(0.05, -0.05, 0.08),
      },
    ];

    this.gimbalRings = [];

    for (const config of ringConfigs) {
      const ringGeo = new THREE.TorusGeometry(config.radius, config.tube, 16, 120);
      const ringMat = new THREE.MeshBasicMaterial({
        color: config.color,
        transparent: true,
        opacity: config.opacity,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });

      const mesh = new THREE.Mesh(ringGeo, ringMat);
      mesh.rotation.copy(config.initialRotation);

      this.gimbalGroup.add(mesh);
      this.gimbalRings.push({
        mesh,
        rotationSpeed: config.rotationSpeed,
      });
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // LAYER 4: Synaptic Data Streams
  // ─────────────────────────────────────────────────────────────────────────────
  private initLayer4SynapticStreams(): void {
    if (this.nodeDataList.length < 10) return;

    const sphereRadius = 2.0;
    const streamCount = 20;
    this.synapticStreams = [];

    const linePoints: THREE.Vector3[] = [];

    for (let s = 0; s < streamCount; s++) {
      // Pick two distinct nodes
      const idxA = (s * 7 + 3) % this.nodeDataList.length;
      let idxB = (s * 13 + 17) % this.nodeDataList.length;
      if (idxA === idxB) idxB = (idxB + 1) % this.nodeDataList.length;

      const pA = this.nodeDataList[idxA].basePos;
      const pB = this.nodeDataList[idxB].basePos;

      // Compute elevated midpoint along great-arc normal
      const mid = new THREE.Vector3().addVectors(pA, pB).multiplyScalar(0.5);
      const midDist = mid.length();
      const lift = 0.35 + (s % 4) * 0.12;
      const midLifted = mid.clone().normalize().multiplyScalar(sphereRadius + lift);

      // Form quadratic Bezier curve
      const curve = new THREE.QuadraticBezierCurve3(pA, midLifted, pB);
      const points = curve.getPoints(24);

      // Record line segment pairs
      for (let p = 0; p < points.length - 1; p++) {
        linePoints.push(points[p]);
        linePoints.push(points[p + 1]);
      }

      this.synapticStreams.push({
        curve,
        speed: 0.35 + (s % 5) * 0.1,
        progress: (s * 0.23) % 1.0,
      });
    }

    // Static synaptic connection paths
    const lineGeo = new THREE.BufferGeometry().setFromPoints(linePoints);
    const lineMat = new THREE.LineBasicMaterial({
      color: 0x00ff87,
      transparent: true,
      opacity: 0.18,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.streamLines = new THREE.LineSegments(lineGeo, lineMat);
    this.streamsGroup.add(this.streamLines);

    // Traveling glowing data pulses
    const pulseCount = streamCount;
    const pulseGeo = new THREE.SphereGeometry(0.04, 8, 8);
    const pulseMat = new THREE.MeshBasicMaterial({
      color: 0x00ff87,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.instancedPulses = new THREE.InstancedMesh(pulseGeo, pulseMat, pulseCount);
    for (let i = 0; i < pulseCount; i++) {
      const pos = this.synapticStreams[i].curve.getPoint(this.synapticStreams[i].progress);
      this.dummyMatrix.position.copy(pos);
      this.dummyMatrix.scale.set(1, 1, 1);
      this.dummyMatrix.updateMatrix();
      this.instancedPulses.setMatrixAt(i, this.dummyMatrix.matrix);
    }
    this.instancedPulses.instanceMatrix.needsUpdate = true;
    this.streamsGroup.add(this.instancedPulses);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // LAYER 5: Fresnel Plasma Inner Core & Atmospheric Halo
  // ─────────────────────────────────────────────────────────────────────────────
  private initLayer5FresnelCoreAndHalo(): void {
    // 5a. Inner Plasma Core
    const coreRadius = 1.25;
    const coreGeo = new THREE.SphereGeometry(coreRadius, 48, 48);
    this.fresnelCoreMaterial = createFresnelCoreMaterial({
      colorCore: new THREE.Color('#01150a'),
      colorRim: new THREE.Color('#00ff87'),
      fresnelPower: 2.6,
      intensity: 2.2,
    });
    this.fresnelCoreMesh = new THREE.Mesh(coreGeo, this.fresnelCoreMaterial);
    this.coreGroup.add(this.fresnelCoreMesh);

    // 5b. Atmospheric Outer Halo
    const haloRadius = 2.45;
    const haloGeo = new THREE.SphereGeometry(haloRadius, 32, 32);
    this.fresnelHaloMaterial = createAtmosphericHaloMaterial({
      color: new THREE.Color('#00ff87'),
      haloPower: 3.2,
      intensity: 1.1,
    });
    this.fresnelHaloMesh = new THREE.Mesh(haloGeo, this.fresnelHaloMaterial);
    this.coreGroup.add(this.fresnelHaloMesh);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // LAYER 6: Cosmic Ambient Particle Cloud
  // ─────────────────────────────────────────────────────────────────────────────
  private initLayer6CosmicParticles(): void {
    const particleCount = 1400;
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    const emeraldColor = new THREE.Color('#00ff87');
    const mintColor = new THREE.Color('#34d399');
    const tealColor = new THREE.Color('#10b981');
    const whiteColor = new THREE.Color('#d1fae5');

    const tempColor = new THREE.Color();

    for (let i = 0; i < particleCount; i++) {
      // Spherical distribution around core (radius 5.0 to 24.0)
      const r = 5.0 + Math.pow(Math.random(), 0.8) * 19.0;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      positions[i * 3 + 0] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);

      // Color variation (emerald / mint / teal / subtle star white)
      const rand = Math.random();
      if (rand < 0.5) {
        tempColor.copy(emeraldColor);
      } else if (rand < 0.75) {
        tempColor.copy(mintColor);
      } else if (rand < 0.9) {
        tempColor.copy(tealColor);
      } else {
        tempColor.copy(whiteColor);
      }

      colors[i * 3 + 0] = tempColor.r;
      colors[i * 3 + 1] = tempColor.g;
      colors[i * 3 + 2] = tempColor.b;
    }

    const particleGeo = new THREE.BufferGeometry();
    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particleGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    // A generated alpha sprite rounds Three.js's otherwise square point primitives.
    const spriteCanvas = document.createElement('canvas');
    spriteCanvas.width = spriteCanvas.height = 32;
    const spriteContext = spriteCanvas.getContext('2d');
    if (!spriteContext) throw new Error('Unable to create Core particle sprite');
    const glow = spriteContext.createRadialGradient(16, 16, 1, 16, 16, 16);
    glow.addColorStop(0, 'rgba(255,255,255,1)');
    glow.addColorStop(.45, 'rgba(255,255,255,.9)');
    glow.addColorStop(1, 'rgba(255,255,255,0)');
    spriteContext.fillStyle = glow;
    spriteContext.fillRect(0, 0, 32, 32);
    this.particleSprite = new THREE.CanvasTexture(spriteCanvas);

    const particleMat = new THREE.PointsMaterial({
      size: 0.065,
      map: this.particleSprite,
      vertexColors: true,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });

    this.cosmicParticles = new THREE.Points(particleGeo, particleMat);
    this.particlesGroup.add(this.cosmicParticles);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Animation Loop & Tick
  // ─────────────────────────────────────────────────────────────────────────────
  private startAnimationLoop = (): void => {
    if (this.isDisposed || this.isPaused) return;

    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }

    const render = () => {
      if (this.isDisposed || this.isPaused) {
        this.rafId = null;
        return;
      }

      const now = performance.now();
      // Sample rAF cadence for adaptive quality independently of our intentional render cap.
      const rafDelta = Math.min(Math.max((now - this.lastRafTimestamp) / 1000, 0), 0.1);
      this.lastRafTimestamp = now;
      this.onFrameTickCb?.(rafDelta);

      const tier = this.currentQualityPreset.tier;
      const targetFps = this.ecoMode ? 20 : tier === 'low' ? 24 : tier === 'medium' ? 30 : 40;
      if (now - this.lastTimestamp < 1000 / targetFps - 1) {
        this.rafId = requestAnimationFrame(render);
        return;
      }
      const rawDelta = (now - this.lastTimestamp) / 1000;
      this.lastTimestamp = now;
      const delta = Math.min(Math.max(rawDelta, 0), 0.1);
      this.elapsedTime += delta;
      const time = this.elapsedTime;

      this.update(delta, time);

      if (this.renderer && this.scene && this.camera) {
        this.renderer.render(this.scene, this.camera);
      }

      if (!this.isPaused && !this.isDisposed) {
        this.rafId = requestAnimationFrame(render);
      } else {
        this.rafId = null;
      }
    };

    this.rafId = requestAnimationFrame(render);
  };

  /**
   * Per-frame procedural animation tick
   */
  public update(delta: number, time: number): void {
    // 1. Core ambient rotation (active only if continuousRotation is enabled)
    if (this.continuousRotation) {
      this.coreGroup.rotation.y += delta * 0.15;
      this.coreGroup.rotation.x = Math.sin(time * 0.3) * 0.08;
    }

    // 2. Animate Instanced Pulse Nodes
    if (this.instancedNodes && this.nodeDataList.length > 0) {
      for (let i = 0; i < this.nodeDataList.length; i++) {
        const node = this.nodeDataList[i];
        const pulse = this.continuousRotation
          ? 1.0 + 0.32 * Math.sin(time * node.freq + node.phase)
          : 1.0;

        this.dummyMatrix.position.copy(node.basePos);
        this.dummyMatrix.scale.set(pulse, pulse, pulse);
        this.dummyMatrix.updateMatrix();
        this.instancedNodes.setMatrixAt(i, this.dummyMatrix.matrix);
      }
      this.instancedNodes.instanceMatrix.needsUpdate = true;
    }

    // 3. Gimbal Rings Precession
    if (this.continuousRotation) {
      for (const ring of this.gimbalRings) {
        ring.mesh.rotation.x += ring.rotationSpeed.x * delta;
        ring.mesh.rotation.y += ring.rotationSpeed.y * delta;
        ring.mesh.rotation.z += ring.rotationSpeed.z * delta;
      }
    }

    // 4. Synaptic Data Stream Pulses
    if (this.instancedPulses && this.synapticStreams.length > 0) {
      for (let i = 0; i < this.synapticStreams.length; i++) {
        const stream = this.synapticStreams[i];
        if (this.continuousRotation) {
          stream.progress = (stream.progress + stream.speed * delta) % 1.0;
        }

        const pos = stream.curve.getPoint(stream.progress);
        const pulseScale = this.continuousRotation
          ? 0.8 + 0.4 * Math.sin(stream.progress * Math.PI)
          : 1.0;

        this.dummyMatrix.position.copy(pos);
        this.dummyMatrix.scale.set(pulseScale, pulseScale, pulseScale);
        this.dummyMatrix.updateMatrix();
        this.instancedPulses.setMatrixAt(i, this.dummyMatrix.matrix);
      }
      this.instancedPulses.instanceMatrix.needsUpdate = true;
    }

    // 5. Update Shader Uniforms
    if (this.fresnelCoreMaterial) {
      this.fresnelCoreMaterial.uniforms.uTime.value = time;
    }
    if (this.fresnelHaloMaterial) {
      this.fresnelHaloMaterial.uniforms.uTime.value = time;
    }

    // 6. Cosmic Particle Galactic Drift
    if (this.cosmicParticles && this.continuousRotation) {
      this.cosmicParticles.rotation.y = time * 0.018;
      this.cosmicParticles.rotation.x = Math.sin(time * 0.01) * 0.03;
    }

    // Smooth interpolation towards scroll target transforms (Milestone 3: lambda = 10.0)
    const lerpFactor = Math.min(1.0, 1.0 - Math.exp(-10.0 * delta));
    this.rootGroup.position.lerp(this.targetPosition, lerpFactor);

    this.rootGroup.rotation.x = THREE.MathUtils.lerp(
      this.rootGroup.rotation.x,
      this.targetRotation.x,
      lerpFactor
    );
    this.rootGroup.rotation.y = THREE.MathUtils.lerp(
      this.rootGroup.rotation.y,
      this.targetRotation.y,
      lerpFactor
    );
    this.rootGroup.rotation.z = THREE.MathUtils.lerp(
      this.rootGroup.rotation.z,
      this.targetRotation.z,
      lerpFactor
    );

    this.currentScale = THREE.MathUtils.lerp(this.currentScale, this.targetScale, lerpFactor);
    this.rootGroup.scale.set(this.currentScale, this.currentScale, this.currentScale);

    this.currentOpacity = THREE.MathUtils.lerp(this.currentOpacity, this.targetOpacity, lerpFactor);
    this.applyOpacity(this.currentOpacity);
  }

  /**
   * Apply dynamically interpolated opacity across all scene layers and materials
   */
  private applyOpacity(opacity: number): void {
    const clamped = Math.max(0, Math.min(1, opacity));

    // Section-aware intensity scaling: in text-heavy sections (About, Skills, Experience, Projects)
    // where the Digital Core shifts laterally (|targetPosition.x| >= 1.0), scale down halo and secondary glow
    // slightly (attenuating by ~0.78 factor) so scene opacity scales into ~0.65 - 0.75 range,
    // giving full visual priority to typography while maintaining smooth transitions.
    const isTextHeavyZone = Math.abs(this.targetPosition.x) >= 1.0;
    const textZoneMultiplier = isTextHeavyZone ? 0.78 : 1.0;

    if (this.shellLineSegments && this.shellLineSegments.material instanceof THREE.LineBasicMaterial) {
      this.shellLineSegments.material.opacity = 0.45 * clamped;
    }
    if (this.shellInnerSegments && this.shellInnerSegments.material instanceof THREE.LineBasicMaterial) {
      this.shellInnerSegments.material.opacity = 0.20 * clamped;
    }
    if (this.instancedNodes && this.instancedNodes.material instanceof THREE.MeshBasicMaterial) {
      this.instancedNodes.material.opacity = 0.85 * clamped;
    }
    if (this.streamLines && this.streamLines.material instanceof THREE.LineBasicMaterial) {
      this.streamLines.material.opacity = 0.16 * clamped * textZoneMultiplier;
    }
    if (this.instancedPulses && this.instancedPulses.material instanceof THREE.MeshBasicMaterial) {
      this.instancedPulses.material.opacity = 0.90 * clamped * textZoneMultiplier;
    }
    for (let i = 0; i < this.gimbalRings.length; i++) {
      const ring = this.gimbalRings[i];
      if (ring.mesh.material instanceof THREE.MeshBasicMaterial) {
        const base = i === 0 ? 0.60 : i === 1 ? 0.50 : 0.40;
        ring.mesh.material.opacity = base * clamped * (isTextHeavyZone ? 0.82 : 1.0);
      }
    }
    if (this.fresnelCoreMaterial) {
      this.fresnelCoreMaterial.uniforms.uIntensity.value = 2.0 * clamped * (isTextHeavyZone ? 0.85 : 1.0);
    }
    if (this.fresnelHaloMaterial) {
      this.fresnelHaloMaterial.uniforms.uIntensity.value = 1.0 * clamped * textZoneMultiplier;
    }
    if (this.cosmicParticles && this.cosmicParticles.material instanceof THREE.PointsMaterial) {
      this.cosmicParticles.material.opacity = 0.60 * clamped * textZoneMultiplier;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Public Control & Integration APIs
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Resize viewport & camera projection
   */
  public onResize(width: number, height: number): void {
    if (!this.renderer || !this.camera) return;
    this.camera.aspect = width / Math.max(height, 1);
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);

  }

  /**
   * Handle resize alias with optional fallback to canvas / window dimensions
   */
  public handleResize(width?: number, height?: number): void {
    const w = width || this.canvas.clientWidth || (typeof window !== 'undefined' ? window.innerWidth : 1920);
    const h = height || this.canvas.clientHeight || (typeof window !== 'undefined' ? window.innerHeight : 1080);
    this.onResize(w, h);
  }

  /**
   * Set dynamic device pixel ratio (for Adaptive Engine in M5)
   */
  public setPixelRatio(dpr: number): void {
    if (!this.renderer) return;
    this.renderer.setPixelRatio(dpr);
  }

  /**
   * Set target transforms for smooth cinematic scroll transitions
   */
  public setTargetTransform(transform: SceneTransform): void {
    if (transform.position) {
      if (Array.isArray(transform.position)) {
        this.targetPosition.set(transform.position[0], transform.position[1], transform.position[2]);
      } else {
        this.targetPosition.copy(transform.position);
      }
    }
    if (transform.rotation) {
      if (Array.isArray(transform.rotation)) {
        this.targetRotation.set(transform.rotation[0], transform.rotation[1], transform.rotation[2]);
      } else {
        this.targetRotation.copy(transform.rotation);
      }
    }
    if (typeof transform.scale === 'number') {
      this.targetScale = transform.scale;
    }
    if (typeof transform.opacity === 'number') {
      this.targetOpacity = transform.opacity;
    }
  }

  /**
   * Set scroll progress for scene storytelling transforms
   */
  public setScrollProgress(progress: number): void {
    this.scrollProgress = progress;
  }

  public getScrollProgress(): number {
    return this.scrollProgress;
  }

  /**
   * Immediately snap transforms without interpolation
   */
  public snapTransform(transform: SceneTransform): void {
    this.setTargetTransform(transform);
    this.rootGroup.position.copy(this.targetPosition);
    this.rootGroup.rotation.copy(this.targetRotation);
    this.currentScale = this.targetScale;
    this.rootGroup.scale.set(this.targetScale, this.targetScale, this.targetScale);
    this.currentOpacity = this.targetOpacity;
    this.applyOpacity(this.currentOpacity);
  }

  /**
   * Pause rendering (e.g. tab hidden or hero scrolled far away)
   */
  public pause(): void {
    this.isPaused = true;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  /**
   * Resume rendering
   */
  public resume(): void {
    if (this.isDisposed) return;
    if (this.isPaused) {
      this.isPaused = false;
      this.lastTimestamp = performance.now();
      this.lastRafTimestamp = this.lastTimestamp;
      if (this.rafId === null) {
        this.startAnimationLoop();
      }
    }
  }

  /** Lower background render cadence after the user stops interacting. */
  public setEcoMode(enabled: boolean): void {
    this.ecoMode = enabled;
    if (!enabled) this.lastTimestamp = performance.now() - 25;
  }

  /** Dynamically adjust Digital Core quality. */
  public setQuality(config: QualityConfig): void {
    this.currentQualityPreset = config;
    this.continuousRotation = config.continuousRotation;

    if (this.renderer) {
      this.renderer.setPixelRatio(config.dpr);
    }

    if (this.cosmicParticles?.geometry) {
      const maxCount = 1400;
      const count = Math.max(0, Math.min(maxCount, config.particles));
      this.cosmicParticles.geometry.setDrawRange(0, count);
    }

  }

  /**
   * Dynamically adjust quality preset (Ultra, High, Medium, Low, Reduced-Motion)
   */
  public setQualityPreset(presetOrTier: QualityConfig | QualityTier): void {
    const preset = typeof presetOrTier === 'string'
      ? QUALITY_PRESETS[presetOrTier]
      : presetOrTier;
    if (!preset) return;
    this.setQuality(preset);
  }

  public getQualityPreset(): QualityConfig {
    return this.currentQualityPreset;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // WebGL Context Lost / Restored Handlers
  // ─────────────────────────────────────────────────────────────────────────────
  private handleContextLost = (event: Event): void => {
    event.preventDefault();
    console.warn('DigitalCoreScene: WebGL context lost');
    this.pause();
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.onContextLostCb?.();
  };

  private handleContextRestored = (): void => {
    console.info('DigitalCoreScene: WebGL context restored');
    this.onContextRestoredCb?.();
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // Complete Resource Disposal
  // ─────────────────────────────────────────────────────────────────────────────
  public dispose(): void {
    if (this.isDisposed) return;
    this.isDisposed = true;

    // 1. Stop animation loop
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }

    // 2. Remove context listeners
    this.canvas.removeEventListener('webglcontextlost', this.handleContextLost);
    this.canvas.removeEventListener('webglcontextrestored', this.handleContextRestored);

    // 3. Traverse and dispose all geometries and materials in the scene
    this.scene.traverse((object) => {
      if (!(object instanceof THREE.Object3D)) return;

      const mesh = object as THREE.Mesh;
      if (mesh.geometry) {
        mesh.geometry.dispose();
      }

      if (mesh.material) {
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((mat) => mat.dispose());
        } else {
          mesh.material.dispose();
        }
      }
    });

    this.particleSprite?.dispose();
    this.particleSprite = null;

    // 4. Dispose renderer
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer.forceContextLoss();
      this.renderer = null;
    }

    // 5. Clear collections
    this.gimbalRings = [];
    this.synapticStreams = [];
    this.nodeDataList = [];

    console.info('DigitalCoreScene: Disposed cleanly');
  }
}

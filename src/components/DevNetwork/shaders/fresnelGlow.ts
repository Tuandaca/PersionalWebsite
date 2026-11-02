import * as THREE from 'three';

/**
 * GLSL Vertex Shader for Fresnel Rim Glow
 * Transforms normals and calculates eye-space view direction
 */
export const fresnelVertexShader = `
  varying vec3 vNormal;
  varying vec3 vViewPosition;
  varying vec2 vUv;

  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vViewPosition = -mvPosition.xyz;
    gl_Position = projectionMatrix * mvPosition;
  }
`;

/**
 * GLSL Fragment Shader for Fresnel Plasma Inner Core
 * Emits intense rim glow using (1.0 - dot(viewDir, normal))^power
 * with animated plasma color shift and subtle energy pulse
 */
export const fresnelFragmentShader = `
  uniform float uTime;
  uniform vec3 uColorCore;
  uniform vec3 uColorRim;
  uniform float uFresnelPower;
  uniform float uIntensity;

  varying vec3 vNormal;
  varying vec3 vViewPosition;
  varying vec2 vUv;

  void main() {
    vec3 normal = normalize(vNormal);
    vec3 viewDir = normalize(vViewPosition);

    // Fresnel rim calculation: intense at grazing angles
    float ndv = clamp(dot(viewDir, normal), 0.0, 1.0);
    float rim = pow(1.0 - ndv, uFresnelPower);

    // Dynamic plasma pulsation
    float pulse = 0.85 + 0.15 * sin(uTime * 2.4 + vUv.y * 6.28318);
    float microGlow = 0.05 * sin(uTime * 5.0 - vUv.x * 12.0);

    // Blend from deep emerald core to radiant neon rim
    vec3 color = mix(uColorCore, uColorRim, rim + microGlow) * (rim * uIntensity * pulse);

    // Soft core baseline so the sphere isn't completely hollow
    float coreAmbience = (1.0 - rim) * 0.06;
    color += uColorCore * coreAmbience;

    gl_FragColor = vec4(color, clamp(rim * uIntensity + coreAmbience, 0.0, 1.0));
  }
`;

/**
 * GLSL Fragment Shader for Atmospheric Outer Halo
 * Creates a soft, glowing atmospheric aura around the Digital Core
 */
export const atmosphericHaloFragmentShader = `
  uniform float uTime;
  uniform vec3 uColor;
  uniform float uHaloPower;
  uniform float uIntensity;

  varying vec3 vNormal;
  varying vec3 vViewPosition;

  void main() {
    vec3 normal = normalize(vNormal);
    vec3 viewDir = normalize(vViewPosition);

    float ndv = clamp(dot(viewDir, normal), 0.0, 1.0);
    // Outer halo peaks at grazing angle and falls off smoothly
    float halo = pow(1.0 - ndv, uHaloPower);

    // Subtle atmospheric shimmer
    float shimmer = 0.92 + 0.08 * sin(uTime * 1.8);
    vec3 finalColor = uColor * halo * uIntensity * shimmer;

    gl_FragColor = vec4(finalColor, clamp(halo * uIntensity, 0.0, 1.0));
  }
`;

/**
 * Helper to construct the Fresnel Inner Core ShaderMaterial
 */
export function createFresnelCoreMaterial(options?: {
  colorCore?: THREE.Color;
  colorRim?: THREE.Color;
  fresnelPower?: number;
  intensity?: number;
}): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uColorCore: { value: options?.colorCore ?? new THREE.Color('#01150a') },
      uColorRim: { value: options?.colorRim ?? new THREE.Color('#00ff87') },
      uFresnelPower: { value: options?.fresnelPower ?? 2.8 },
      uIntensity: { value: options?.intensity ?? 1.8 },
    },
    vertexShader: fresnelVertexShader,
    fragmentShader: fresnelFragmentShader,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.FrontSide,
  });
}

/**
 * Helper to construct the Atmospheric Halo ShaderMaterial
 */
export function createAtmosphericHaloMaterial(options?: {
  color?: THREE.Color;
  haloPower?: number;
  intensity?: number;
}): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: options?.color ?? new THREE.Color('#00ff87') },
      uHaloPower: { value: options?.haloPower ?? 3.5 },
      uIntensity: { value: options?.intensity ?? 1.2 },
    },
    vertexShader: fresnelVertexShader,
    fragmentShader: atmosphericHaloFragmentShader,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.BackSide, // BackSide rendered for atmospheric halo wrapper
  });
}

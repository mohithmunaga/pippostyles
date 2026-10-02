// Studio K95 100% Precise WebGL Engine
// Exact reproduction of K95 ThreeCylinderScene with 3D rosa.glb, atmospheric background shader, 5 cylinder rows, 60 dynamic panels, parabolic arch bending, and smooth Rings <-> Spiral transformation.

import { projects, getAllCards, getCustomImageOverrides, saveCustomImageOverride, resetCustomImageOverrides } from './data.js';

// Global Scene Variables
let scene, camera, renderer, raycaster;
let rows = [];           // Stacked cylinder rows
let allPanels = [];      // Total dynamic panel meshes
let cylinderGridMesh;    // Wireframe atmosphere cylinder
let bgSphereMesh;        // Atmospheric background sphere
let bgSphereMaterial;
let roseGroup = null;    // 3D Rose centerpiece
let roseMeshes = [];
let envMap = null;

// Interaction & Physics state
let isDragging = false;
let previousMouse = { x: 0, y: 0 };
let mouseNDC = new THREE.Vector2(0, 0);
let spinVelocity = 0;       // L
let scrollAccumulator = 0;   // De
let scrollTarget = 0;        // Re
let prevScrollAccum = 0;     // fe
let totalRotation = 0;       // Te
let bendH = 0;               // Be
let bendV = 0;               // Ge
let elapsedAnimTime = 0;     // Ve
let lastFrameTime = performance.now();
let isHoveringPanel = false;
let hoverSlowdown = 1.0;     // W
let hoveredMesh = null;

// Layout state: 0 = Rings, 1 = Spiral
let layoutTarget = 0;        // J
let layoutProgress = 0;      // ee

// Constants and Dynamic Scaling (12 panels per ring rule)
let PANELS_PER_RING = 12;
let numRows = 5;
let totalPanels = PANELS_PER_RING * numRows;
const SCALE_V = 1.1;
const BASE_COLOR_HEX = 0x1500E1;
const DEPTH_COLOR_HEX = 0x2A3688;
const MAX_BEND_H = 0.25;
const MAX_BEND_V = 0.15;

export const isMobileDevice = typeof navigator !== 'undefined' && (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || (typeof window !== 'undefined' && window.innerWidth < 768));

let isWebGLActive = true;
let isModalOpen = false;
let onProjectSelectCallback = null;
let onFocalChangeCallback = null;
let currentFocalIndex = -1;
const _tempWorldPos = new THREE.Vector3();

// ==========================================================================
// SHADER DEFINITIONS (100% Exact from K95)
// ==========================================================================

const linearToSRGBHelper = `
  vec3 linearToSRGB(vec3 c) {
    return pow(max(c, 0.0), vec3(1.0 / 2.2));
  }
`;

// Background Atmosphere Sphere Vertex & Fragment
const bgVertexShader = `
  varying vec3 vWorldPos;
  void main() {
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPos = worldPos.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

const bgFragmentShader = `
  uniform vec3 uBaseColor;
  uniform float uSideDarken;
  uniform float uCenterLift;
  uniform float uOpacity;
  varying vec3 vWorldPos;

  ${linearToSRGBHelper}

  void main() {
    vec3 dir = normalize(vWorldPos - cameraPosition);
    float side = smoothstep(0.18, 0.95, abs(dir.x));
    float lift = 1.0 + (1.0 - side) * uCenterLift;

    vec3 centerCol = uBaseColor * lift;
    vec3 sideCol   = uBaseColor * (1.0 - uSideDarken);
    vec3 col       = mix(centerCol, sideCol, side);

    gl_FragColor = vec4(linearToSRGB(col), uOpacity);
  }
`;

// Panel Vertex Shader with Parabolic Arch Bending and Organic Idle Wave
const panelVertexShader = `
  uniform float uBendH;
  uniform float uBendV;
  uniform float uTime;
  uniform float uPhase;
  uniform float uReveal;
  varying vec2  vUv;
  varying float vViewZ;

  void main() {
    vUv = uv;
    vec3 pos = position;

    // UV-space coordinates centered on 0 (-1 to +1)
    float xn = (uv.x - 0.5) * 2.0;
    float yn = (uv.y - 0.5) * 2.0;

    // Parabolic arch: 1 at center, 0 at edges
    float archX = 1.0 - xn * xn;
    float archY = 1.0 - yn * yn;

    pos.z -= archX * uBendH;   // horizontal arch (spin)
    pos.z -= archY * uBendV;   // vertical arch (scroll)

    // Subtle idle wave per-panel
    pos.z += sin(uv.y * 6.283 + uTime * 0.55 + uPhase)
           * sin(uv.x * 3.14  + uTime * 0.35 + uPhase * 1.3) * 0.016;

    vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
    vViewZ = -mvPos.z;
    gl_Position = projectionMatrix * mvPos;
  }
`;

// Panel Fragment Shader with Depth Color Toning and Face-Safe Aspect Ratio Mapping (100% Exact K95)
const panelFragmentShader = `
  uniform sampler2D uTexture;
  uniform float     uOpacity;
  uniform float     uBlur;
  uniform float     uDepthNear;
  uniform float     uDepthFar;
  uniform vec3      uDepthColor;
  uniform float     uDepthStrength;
  uniform vec2      uUvScale;
  uniform vec2      uUvOffset;
  uniform float     uUvAngle;
  varying vec2      vUv;
  varying float     vViewZ;

  ${linearToSRGBHelper}

  vec4 sampleBlurred(sampler2D tex, vec2 uv, float blur) {
    vec4 col = texture2D(tex, uv);
    if (blur > 0.001) {
      col = col * 0.4
          + texture2D(tex, uv + vec2( blur, 0.0))  * 0.15
          + texture2D(tex, uv + vec2(-blur, 0.0))  * 0.15
          + texture2D(tex, uv + vec2(0.0,   blur))  * 0.15
          + texture2D(tex, uv + vec2(0.0,  -blur))  * 0.15;
    }
    return col;
  }

  void main() {
    // Dynamic image orientation rotation (rotates horizontal/landscape photos upright)
    vec2 baseUv = vUv;
    if (abs(uUvAngle) > 0.001) {
      vec2 c = baseUv - vec2(0.5);
      float cosA = cos(uUvAngle);
      float sinA = sin(uUvAngle);
      baseUv = vec2(c.x * cosA - c.y * sinA, c.x * sinA + c.y * cosA) + vec2(0.5);
    }

    // Exact cover mapped coordinates with uniform card geometry
    vec2 mappedUv = (baseUv - vec2(0.5)) * uUvScale + vec2(0.5);
    vec4 col = sampleBlurred(uTexture, clamp(mappedUv, vec2(0.0001), vec2(0.9999)), uBlur);

    // 100% True Original Photo Quality & Brightness (Zero artificial darkening or color shift)
    col.a *= uOpacity;
    gl_FragColor = col;
  }
`;

// Responsive layout metrics
function getResponsiveMetrics() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const isPortrait = h > w;

  if (w < 768 && !isPortrait) {
    return { fov: 50, cameraZ: 13, radius: 7.8, panelW: 1.4 * SCALE_V, panelH: 1.9 * SCALE_V, rowSpacing: 7 };
  } else if (w < 500) {
    return { fov: 70, cameraZ: 7.5, radius: 4.5, panelW: 1.0 * SCALE_V, panelH: 1.4 * SCALE_V, rowSpacing: 5.5 };
  } else if (w < 768) {
    return { fov: 70, cameraZ: 9.5, radius: 4.6, panelW: 1.0 * SCALE_V, panelH: 1.4 * SCALE_V, rowSpacing: 3.8 };
  } else if (w < 1024 && isPortrait) {
    return { fov: 65, cameraZ: 9, radius: 5.5, panelW: 1.0 * SCALE_V, panelH: 1.4 * SCALE_V, rowSpacing: 6.5 };
  } else if (w < 1024) {
    return { fov: 60, cameraZ: 11, radius: 6.5, panelW: 1.2 * SCALE_V, panelH: 1.6 * SCALE_V, rowSpacing: 4 };
  } else {
    return { fov: 50, cameraZ: 13, radius: 7.8, panelW: 1.4 * SCALE_V, panelH: 1.9 * SCALE_V, rowSpacing: 7 };
  }
}

function getRoseTargetScale() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  if (w < 768 && w > h) return 6.5;
  if (w < 500) return 3.5;
  if (w < 768) return 4.0;
  if (w < 1024) return 4.5;
  return 6.5;
}

// Pseudo-random deterministic PRNG
function createPRNG(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffleArray(arr, seed) {
  const result = [...arr];
  const rand = createPRNG(seed);
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// ==========================================================================
// INITIALIZATION
// ==========================================================================
export function initWebGL(canvasElement, onProjectSelect, onFocalChange) {
  onProjectSelectCallback = onProjectSelect;
  onFocalChangeCallback = onFocalChange;

  const metrics = getResponsiveMetrics();

  // 1. Scene & Camera
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(metrics.fov, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.z = metrics.cameraZ;

  // 2. Renderer
  renderer = new THREE.WebGLRenderer({
    canvas: canvasElement,
    antialias: true,
    alpha: true,
    powerPreference: "high-performance"
  });
  renderer.setClearColor(0x1500E1, 1);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(isMobileDevice ? Math.min(window.devicePixelRatio, 1.25) : Math.min(window.devicePixelRatio, 1.75));
  if (THREE.SRGBColorSpace) {
    renderer.outputColorSpace = THREE.SRGBColorSpace;
  } else if (THREE.sRGBEncoding) {
    renderer.outputEncoding = THREE.sRGBEncoding;
  }

  raycaster = new THREE.Raycaster();

  // 3. Environment Map (PMREM)
  setupEnvironment();

  // 4. Lighting
  setupLights();

  // 5. Background Atmosphere Sphere & Cylindrical Grid
  createBackgroundAtmosphere();
  createCylindricalGrid();

  // 6. 3D Rose Centerpiece
  loadRoseModel();

  // 7. 5 Cylinder Rows of Project Panels
  buildCylinderPanels();

  // Pre-warm and compile shaders to guarantee 0 dropped frames on first frame
  if (renderer && scene && camera) {
    renderer.compile(scene, camera);
  }

  // 8. Event Listeners
  window.addEventListener('resize', onWindowResize);
  setupInteractionListeners(canvasElement);

  // 9. Start Main Render Loop
  lastFrameTime = performance.now();
  animate();

  canvasElement.classList.add('is-revealed');
}

function setupEnvironment() {
  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();

  const envScene = new THREE.Scene();
  const envGeo = new THREE.SphereGeometry(50, 32, 32);
  const envMat = new THREE.MeshBasicMaterial({ color: 0x050088, side: THREE.BackSide });
  envScene.add(new THREE.Mesh(envGeo, envMat));

  // High-intensity white studio reflections for chrome specular highlights
  const spotGeo = new THREE.SphereGeometry(5, 16, 16);
  const brightWhiteMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const softBlueMat = new THREE.MeshBasicMaterial({ color: 0x88aaff });

  [[14, 14, 12], [-14, 8, -10], [0, 18, 8], [8, -10, 12], [-8, 16, -6]].forEach(pos => {
    const s = new THREE.Mesh(spotGeo, brightWhiteMat);
    s.position.set(pos[0], pos[1], pos[2]);
    envScene.add(s);
  });

  [[-15, -10, 8], [12, -8, -10]].forEach(pos => {
    const s = new THREE.Mesh(spotGeo, softBlueMat);
    s.position.set(pos[0], pos[1], pos[2]);
    envScene.add(s);
  });

  const envResult = pmrem.fromScene(envScene, 0.04);
  envMap = envResult.texture;
  scene.environment = envMap;
  pmrem.dispose();
}

function setupLights() {
  const keyLight = new THREE.DirectionalLight(0xffffff, 2.4);
  keyLight.position.set(6, 8, 8);
  scene.add(keyLight);

  const fillLight = new THREE.DirectionalLight(0xccddff, 1.6);
  fillLight.position.set(-8, -2, 6);
  scene.add(fillLight);

  const rimLight = new THREE.DirectionalLight(0xffffff, 1.8);
  rimLight.position.set(0, 12, -6);
  scene.add(rimLight);

  const ambient = new THREE.AmbientLight(0x334488, 0.6);
  scene.add(ambient);
}

function createBackgroundAtmosphere() {
  const baseLinear = new THREE.Color(BASE_COLOR_HEX).convertSRGBToLinear();
  bgSphereMaterial = new THREE.ShaderMaterial({
    uniforms: {
      uBaseColor: { value: baseLinear },
      uSideDarken: { value: 0.38 },
      uCenterLift: { value: 0.06 },
      uOpacity: { value: 1.0 }
    },
    vertexShader: bgVertexShader,
    fragmentShader: bgFragmentShader,
    side: THREE.BackSide,
    depthTest: true,
    depthWrite: false,
    transparent: true,
    toneMapped: false
  });

  bgSphereMesh = new THREE.Mesh(new THREE.SphereGeometry(140, 28, 20), bgSphereMaterial);
  bgSphereMesh.renderOrder = -100;
  scene.add(bgSphereMesh);
}

function createCylindricalGrid() {
  if (cylinderGridMesh) {
    scene.remove(cylinderGridMesh);
    cylinderGridMesh.geometry.dispose();
  }

  const w = window.innerWidth;
  const ratio = window.innerHeight / Math.max(w, 1);
  const isPortrait = ratio > 1;
  const radius = 30;
  const height = isPortrait ? Math.max(30, 22 * Math.min(ratio, 2.2)) : 22;
  const numCircumference = 200;
  const numRings = 80;
  const numVerticalLines = isPortrait ? 22 : 16;
  const vertices = [];

  // Horizontal circular rings
  for (let h = 0; h < numRings; h++) {
    const angle = (h / numRings) * Math.PI * 2;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    vertices.push(x, -height, z, x, height, z);
  }

  // Vertical segment rings
  for (let v = 0; v <= numVerticalLines; v++) {
    const y = -height + (v / numVerticalLines) * height * 2;
    for (let c = 0; c < numCircumference; c++) {
      const a1 = (c / numCircumference) * Math.PI * 2;
      const a2 = ((c + 1) / numCircumference) * Math.PI * 2;
      vertices.push(
        Math.cos(a1) * radius, y, Math.sin(a1) * radius,
        Math.cos(a2) * radius, y, Math.sin(a2) * radius
      );
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  const mat = new THREE.LineBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35, depthWrite: false });

  cylinderGridMesh = new THREE.LineSegments(geo, mat);
  cylinderGridMesh.renderOrder = -10;
  scene.add(cylinderGridMesh);
}

// 3D Rose Centerpiece (/assets/3d/rosa.glb)
function loadRoseModel() {
  const loader = new THREE.GLTFLoader();
  loader.load(
    './assets/3d/rosa.glb',
    (gltf) => {
      const model = gltf.scene;
      
      // Exact Liquid Chrome MeshPhysicalMaterial
      const chromeMaterial = new THREE.MeshPhysicalMaterial({
        color: 0xEEF2FF,
        roughness: 0.035,
        metalness: 0.98,
        envMap: envMap,
        envMapIntensity: 3.2,
        clearcoat: 1.0,
        clearcoatRoughness: 0.018,
        ior: 2.333,
        reflectivity: 1.0,
        side: THREE.DoubleSide
      });

      roseMeshes = [];
      model.traverse((child) => {
        if (child.isMesh) {
          child.material = chromeMaterial;
          roseMeshes.push(child);
        }
      });

      // Center the model in its local box
      const box = new THREE.Box3().setFromObject(model);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);

      model.position.set(-center.x, -center.y, -center.z);
      model.rotation.z = -0.2;

      roseGroup = new THREE.Group();
      roseGroup.add(model);

      // Scale to responsive viewport target
      const scale = getRoseTargetScale() / maxDim;
      roseGroup.scale.set(scale, scale, scale);
      roseGroup.userData = { maxDim, rawMaxDim: maxDim, baseScale: scale };

      scene.add(roseGroup);
    },
    undefined,
    (err) => {
      console.warn('Failed to load rosa.glb:', err);
    }
  );
}

function computeAspectCorrection(tex, panelW, panelH) {
  const img = tex?.image;
  if (!img || !img.width || !img.height) {
    return { scale: new THREE.Vector2(1, 1), offset: new THREE.Vector2(0, 0) };
  }
  const imgAspect = img.width / img.height;
  const panelAspect = panelW / panelH;
  let sx = 1.0;
  let sy = 1.0;
  let ox = 0.0;
  let oy = 0.0;

  if (imgAspect > panelAspect) {
    // Landscape / Horizontal photo (wider than 3:4 panel): fit entire width, center vertically
    sx = 1.0;
    sy = panelAspect / imgAspect;
    ox = 0.0;
    oy = (1.0 - sy) * 0.5;
  } else {
    // Portrait / Vertical photo (taller than 3:4 panel, e.g. 9:16): fit entire height, center horizontally
    sx = imgAspect / panelAspect;
    sy = 1.0;
    ox = (1.0 - sx) * 0.5;
    oy = 0.0;
  }
  return { scale: new THREE.Vector2(1.0 / sx, 1.0 / sy), offset: new THREE.Vector2(-ox / sx, -oy / sy) };
}

function createPlaceholderTexture(label) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 682;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#0a00b0';
  ctx.fillRect(0, 0, 512, 682);

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.lineWidth = 4;
  ctx.strokeRect(20, 20, 472, 642);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.font = '900 64px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('+', 256, 300);

  ctx.fillStyle = '#ffffff';
  ctx.font = '800 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(label || 'ADD PHOTO', 256, 370);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.font = '500 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('Sync from Mobile', 256, 405);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

const textureCache = new Map();
const textureLoader = new THREE.TextureLoader();
textureLoader.crossOrigin = 'anonymous';

function getOrLoadTexture(url, onReady) {
  if (!url) return null;
  if (textureCache.has(url)) {
    const cachedTex = textureCache.get(url);
    if (cachedTex.image && cachedTex.image.width && onReady) {
      onReady(cachedTex);
    }
    return cachedTex;
  }

  const tex = textureLoader.load(
    url,
    (loadedTex) => {
      if (THREE.SRGBColorSpace) {
        loadedTex.colorSpace = THREE.SRGBColorSpace;
      } else if (THREE.sRGBEncoding) {
        loadedTex.encoding = THREE.sRGBEncoding;
      }
      const maxAniso = renderer ? (isMobileDevice ? Math.min(2, renderer.capabilities.getMaxAnisotropy()) : renderer.capabilities.getMaxAnisotropy()) : 16;
      loadedTex.anisotropy = maxAniso;
      loadedTex.generateMipmaps = true;
      loadedTex.minFilter = THREE.LinearMipmapLinearFilter;
      loadedTex.magFilter = THREE.LinearFilter;
      loadedTex.needsUpdate = true;
      if (renderer) {
        renderer.initTexture(loadedTex);
      }
      if (onReady) onReady(loadedTex);
    }
  );

  textureCache.set(url, tex);
  return tex;
}

// Automatically detect actual image dimensions & orientation
// Horizontally/landscape oriented photos are rotated upright to appear straight to the viewer
function applyImageOrientationAndAspect(panelMesh, panelMat, loadedTex, metrics) {
  if (!loadedTex || !loadedTex.image || !loadedTex.image.width || !loadedTex.image.height) return;
  const imgW = loadedTex.image.width;
  const imgH = loadedTex.image.height;

  // Detect actual orientation using pixel dimensions
  const isLandscape = imgW > imgH * 1.02;
  const isPortrait = imgH > imgW * 1.02;

  // Horizontal / Landscape: rotate 90 deg so photograph itself appears straight / upright
  // Vertical / Portrait or Square: preserve existing orientation
  const uvAngle = isLandscape ? (-Math.PI * 0.5) : 0.0;

  if (panelMat && panelMat.uniforms && panelMat.uniforms.uUvAngle) {
    panelMat.uniforms.uUvAngle.value = uvAngle;
  }

  // Calculate cover mapping inside 3:4 panel
  const effectiveAspect = (Math.abs(uvAngle) > 0.001) ? (imgH / imgW) : (imgW / imgH);
  const panelAspect = metrics.panelW / metrics.panelH;

  let uvScaleX = 1.0;
  let uvScaleY = 1.0;

  if (effectiveAspect > panelAspect) {
    // Image is wider than panel: fit height, cover width
    uvScaleX = panelAspect / effectiveAspect;
    uvScaleY = 1.0;
  } else {
    // Image is taller than panel: fit width, cover height
    uvScaleX = 1.0;
    uvScaleY = effectiveAspect / panelAspect;
  }

  // Set uniform scale so every card has the exact identical 3D width and height
  panelMesh.userData.aspectScaleX = 1.0;
  panelMesh.userData.isLandscape = isLandscape;
  panelMesh.userData.isPortrait = isPortrait;
  panelMesh.userData.photoRotationAngle = uvAngle;
  panelMesh.userData.targetScale.set(1, 1, 1);
  panelMesh.scale.set(1, 1, 1);

  if (panelMat && panelMat.uniforms) {
    panelMat.uniforms.uUvScale.value.set(uvScaleX, uvScaleY);
    panelMat.uniforms.uTexture.value = loadedTex;
  }
}

// Build Cylinder Rows of Project Panels (Dynamically scales for 10s to 100s of images)
function buildCylinderPanels() {
  try {
    // Clear previous
    rows.forEach(r => scene.remove(r));
    rows = [];
    allPanels = [];

    const currentCards = getAllCards();
    const count = currentCards.length;
    const isEmpty = (count === 0);

    // Exact 100% K95 Cylinder Geometry: exactly 12 panels per ring and 5 rows
    // Guarantees exact original spacing, radius, and spiral pitch regardless of photo count
    PANELS_PER_RING = 12;
    numRows = 5;
    totalPanels = PANELS_PER_RING * numRows;

  const metrics = getResponsiveMetrics();

  const panelGeo = new THREE.PlaneGeometry(metrics.panelW, metrics.panelH, 12, 8);
  const depthLinear = new THREE.Color(DEPTH_COLOR_HEX).convertSRGBToLinear();

  const near = metrics.cameraZ * 0.58;
  const far = metrics.cameraZ * 1.85;

  // Eye-level ring is rIdx = 2 (center row). Row priority: [2, 1, 3, 0, 4]
  const rowOrder = [2, 1, 3, 0, 4];

  for (let rIdx = 0; rIdx < numRows; rIdx++) {
    const rowGroup = new THREE.Group();
    const rowSeq = rowOrder.indexOf(rIdx);

    for (let pIdx = 0; pIdx < PANELS_PER_RING; pIdx++) {
      const globalIdx = rIdx * PANELS_PER_RING + pIdx;
      const seqIdx = (rowSeq * PANELS_PER_RING + pIdx) % Math.max(1, currentCards.length);
      
      const proj = isEmpty
        ? {
            id: `slot-${seqIdx + 1}`,
            slug: `pic-${seqIdx + 1}`,
            title: `pic${seqIdx + 1}`,
            category: "Moments",
            categories: ["Moments"],
            note: "just another moment.",
            image: null,
            isEmpty: true
          }
        : currentCards[seqIdx];

      const imgSrc = proj.cover || proj.imageSmall || proj.image;
      const uvScale = new THREE.Vector2(1, 1);
      const uvOffset = new THREE.Vector2(0, 0);

      const panelPhase = (pIdx / PANELS_PER_RING) * 0.65 + (Math.abs(rIdx - Math.floor(numRows / 2)) / Math.max(1, numRows / 2)) * 0.35;

      const panelMat = new THREE.ShaderMaterial({
        uniforms: {
          uTexture: { value: null },
          uBendH: { value: 0 },
          uBendV: { value: 0 },
          uTime: { value: 0 },
          uPhase: { value: panelPhase },
          uOpacity: { value: isAppAlreadyRevealed ? 1.0 : 0.0 },
          uBlur: { value: isAppAlreadyRevealed ? 0.0 : 0.035 },
          uDepthNear: { value: near },
          uDepthFar: { value: far },
          uDepthColor: { value: depthLinear },
          uDepthStrength: { value: 0.22 },
          uUvScale: { value: uvScale },
          uUvOffset: { value: uvOffset },
          uUvAngle: { value: 0.0 }
        },
        vertexShader: panelVertexShader,
        fragmentShader: panelFragmentShader,
        side: THREE.DoubleSide,
        transparent: !isAppAlreadyRevealed,
        depthWrite: isAppAlreadyRevealed,
        toneMapped: false
      });

      // 100% Exact K95 Rings and Spiral Math
      const thetaRing = ((pIdx + rIdx * 0.5) / PANELS_PER_RING) * Math.PI * 2;
      const thetaSpiral = (pIdx / PANELS_PER_RING) * Math.PI * 2;
      const ySpiral = (pIdx / PANELS_PER_RING - 0.5) * metrics.rowSpacing;

      const panelMesh = new THREE.Mesh(panelGeo, panelMat);
      panelMesh.frustumCulled = false;
      panelMesh.userData = {
        ...proj,
        thetaRing,
        thetaSpiral,
        ySpiral,
        aspectScaleX: 1.0,
        targetScale: new THREE.Vector3(1, 1, 1),
        currentScale: 1.0,
        rowIndex: rIdx,
        panelIndex: pIdx,
        globalIndex: globalIdx,
        entranceDone: isAppAlreadyRevealed
      };

      if (imgSrc) {
        const tex = getOrLoadTexture(imgSrc, (loadedTex) => {
          applyImageOrientationAndAspect(panelMesh, panelMat, loadedTex, metrics);
        });

        if (tex && tex.image && tex.image.width && tex.image.height) {
          applyImageOrientationAndAspect(panelMesh, panelMat, tex, metrics);
        } else {
          panelMat.uniforms.uTexture.value = tex;
        }
      } else {
        const placeholderTex = createPlaceholderTexture(`pic${pIdx + 1}`);
        panelMat.uniforms.uTexture.value = placeholderTex;
      }

      rowGroup.add(panelMesh);
      allPanels.push(panelMesh);
    }

    rowGroup.position.y = rIdx * metrics.rowSpacing - ((numRows - 1) * metrics.rowSpacing) / 2;
    rows.push(rowGroup);
    scene.add(rowGroup);
  }

  window.allPanels = allPanels;
  window.scene = scene;
  updatePanelsLayout(layoutProgress);
  } catch (err) {
    console.error('buildCylinderPanels ERROR:', err);
  }
}

// Position panels along the cylinder circumference
function updatePanelsLayout(progress) {
  if (isEntranceActive) return;
  const metrics = getResponsiveMetrics();
  const radius = metrics.radius * (1.0 + (0.72 - 1.0) * progress);
  const isMobile = window.innerWidth < 768;
  const isPortrait = window.innerHeight > window.innerWidth;
  const spiralTargetScale = (isMobile && isPortrait) ? 0.88 : 1.26;
  const spiralScale = 1.0 + (spiralTargetScale - 1.0) * progress;

  for (const panel of allPanels) {
    const d = panel.userData;
    const theta = d.thetaRing + (d.thetaSpiral - d.thetaRing) * progress;
    const aspectX = d.aspectScaleX || 1.0;

    panel.position.x = Math.cos(theta) * radius;
    panel.position.z = Math.sin(theta) * radius;
    panel.position.y = d.ySpiral * progress;
    panel.rotation.y = -(theta - Math.PI / 2);
    panel.scale.setScalar(spiralScale * panel.userData.currentScale);
  }
}

// ==========================================================================
// INTERACTION LISTENERS & CONTROLS
// ==========================================================================

// Focus / Detail Mode State
let isFocusMode = false;
let focusedMesh = null;
let focusedParent = null;
let originalLocalPos = new THREE.Vector3();
let originalLocalRot = new THREE.Euler();
let originalLocalScale = new THREE.Vector3();
let focusTl = null;

export function setWebGLLayout(newLayout) {
  layoutTarget = newLayout === 'spiral' ? 1.0 : 0.0;
}

export function handleWebGLScroll(deltaY) {
  if (!isWebGLActive || isModalOpen) return;
  const clampedDelta = THREE.MathUtils.clamp(deltaY, -120, 120);
  scrollTarget += clampedDelta * 0.0055;
  spinVelocity += clampedDelta * 0.0018;
}

let isEntranceActive = false;
let isAppAlreadyRevealed = false;

export function revealScene() {
  if (isAppAlreadyRevealed) return;
  isAppAlreadyRevealed = true;
  isEntranceActive = true;

  const metrics = getResponsiveMetrics();
  const finalCameraZ = metrics.cameraZ;
  const initialCameraZ = finalCameraZ * 0.74;

  if (camera) {
    camera.position.z = initialCameraZ;
  }

  // Smooth cinematic impulse spin on entry
  spinVelocity = 0.24;

  if (roseGroup) {
    const rawDim = roseGroup.userData?.rawMaxDim || roseGroup.userData?.maxDim || 1.0;
    const baseScale = getRoseTargetScale() / rawDim;
    roseGroup.userData.baseScale = baseScale;
    roseGroup.scale.set(0.01, 0.01, 0.01);
    if (typeof gsap !== 'undefined') {
      gsap.killTweensOf(roseGroup.scale);
      gsap.to(roseGroup.scale, {
        x: baseScale,
        y: baseScale,
        z: baseScale,
        duration: 1.8,
        ease: "power3.out",
        delay: 0.3
      });
    } else {
      roseGroup.scale.set(baseScale, baseScale, baseScale);
    }
  }

  if (typeof gsap !== 'undefined') {
    const tl = gsap.timeline({
      onComplete: () => {
        isEntranceActive = false;
        allPanels.forEach(p => {
          p.userData.entranceDone = true;
          if (p.material) {
            if (p.material.uniforms?.uOpacity) p.material.uniforms.uOpacity.value = 1.0;
            if (p.material.uniforms?.uBlur) p.material.uniforms.uBlur.value = 0.0;
            p.material.transparent = false;
            p.material.depthWrite = true;
          }
        });
        updatePanelsLayout(layoutProgress);
      }
    });

    // 1. Camera glides smoothly from close-up to normal position (1.5s - 2.4s)
    tl.to(camera.position, {
      z: finalCameraZ,
      duration: 2.2,
      ease: "power3.out"
    }, 0.15);

    // 2. Controlled editorial stagger for panels:
    // Panels start compact closer to center with scale down and 0 opacity,
    // then progressively reveal and spread outward into the ring formation
    const sortedPanels = [...allPanels].sort((a, b) => {
      const rowDistA = Math.abs(a.userData.rowIndex - Math.floor(numRows / 2));
      const rowDistB = Math.abs(b.userData.rowIndex - Math.floor(numRows / 2));
      if (rowDistA !== rowDistB) return rowDistA - rowDistB;
      return a.userData.panelIndex - b.userData.panelIndex;
    });

    sortedPanels.forEach((panel, i) => {
      const d = panel.userData;
      const aspectX = d.aspectScaleX || 1.0;
      const theta = d.thetaRing + (d.thetaSpiral - d.thetaRing) * layoutProgress;
      const radius = metrics.radius;
      
      const finalX = Math.cos(theta) * radius;
      const finalZ = Math.sin(theta) * radius;
      const finalY = d.ySpiral * layoutProgress;

      // Start closer to center with scale down and opacity 0
      panel.position.x = Math.cos(theta) * (radius * 0.44);
      panel.position.z = Math.sin(theta) * (radius * 0.44);
      panel.position.y = finalY;
      panel.rotation.y = -(theta - Math.PI / 2);
      panel.scale.set(0.32, 0.32, 0.32);

      const u = panel.material?.uniforms;
      if (u) {
        u.uOpacity.value = 0.0;
        u.uBlur.value = 0.035;
      }
      panel.material.transparent = true;
      panel.material.depthWrite = false;

      const staggerDelay = 0.12 + (i / sortedPanels.length) * 0.88;

      // Opacity fade in (0.2s - 1.2s)
      if (u) {
        tl.to(u.uOpacity, {
          value: 1.0,
          duration: 0.85,
          ease: "power2.out"
        }, staggerDelay);

        tl.to(u.uBlur, {
          value: 0.0,
          duration: 0.85,
          ease: "power2.out"
        }, staggerDelay);
      }

      // Position spread outward through depth (0.5s - 1.8s)
      tl.to(panel.position, {
        x: finalX,
        z: finalZ,
        duration: 1.35,
        ease: "power3.out"
      }, staggerDelay);

      // Scale settles to exact final size (0.5s - 1.8s)
      tl.to(panel.scale, {
        x: 1.0,
        y: 1.0,
        z: 1.0,
        duration: 1.35,
        ease: "back.out(1.12)"
      }, staggerDelay);
    });
  } else {
    for (let i = 0; i < allPanels.length; i++) {
      const p = allPanels[i];
      p.userData.entranceDone = true;
      if (p.material?.uniforms?.uOpacity) p.material.uniforms.uOpacity.value = 1.0;
      if (p.material?.uniforms?.uBlur) p.material.uniforms.uBlur.value = 0.0;
      p.material.transparent = false;
      p.material.depthWrite = true;
    }
  }
}

export function focusProjectMesh(panelMesh, onComplete) {
  if (!panelMesh) return;

  // Hide hover pill immediately
  const labelPill = document.getElementById('project-label-pill');
  labelPill?.classList.remove('visible');
  document.getElementById('app-cursor')?.classList.remove('is-hovering');

  if (onProjectSelectCallback) {
    onProjectSelectCallback(panelMesh.userData);
  }
}

export function closeFocusedProject(onComplete) {
  if (!isFocusMode || !focusedMesh || !focusedParent) {
    isModalOpen = false;
    if (onComplete) onComplete();
    return;
  }

  if (focusTl) focusTl.kill();
  focusTl = gsap.timeline({
    defaults: { duration: 0.9, ease: "power3.inOut" },
    onComplete: () => {
      isFocusMode = false;
      isModalOpen = false;
      focusedMesh = null;
      focusedParent = null;
      if (onComplete) onComplete();
    }
  });

  // Re-attach to original row parent
  focusedParent.attach(focusedMesh);

  // Animate back to original local position, rotation, and scale
  focusTl.to(focusedMesh.position, {
    x: originalLocalPos.x,
    y: originalLocalPos.y,
    z: originalLocalPos.z
  }, 0);

  focusTl.to(focusedMesh.rotation, {
    x: originalLocalRot.x,
    y: originalLocalRot.y,
    z: originalLocalRot.z
  }, 0);

  focusTl.to(focusedMesh.scale, {
    x: originalLocalScale.x,
    y: originalLocalScale.y,
    z: originalLocalScale.z
  }, 0);

  // Restore surrounding panels
  allPanels.forEach(p => {
    if (p.material.uniforms) {
      focusTl.to(p.material.uniforms.uOpacity, { value: 1.0 }, 0);
      focusTl.to(p.material.uniforms.uBlur, { value: 0.0 }, 0);
    }
  });

  // Restore Rose centerpiece
  if (roseGroup) {
    const rawDim = roseGroup.userData?.rawMaxDim || roseGroup.userData?.maxDim || 1.0;
    const targetScale = getRoseTargetScale() / rawDim;
    roseGroup.userData.baseScale = targetScale;
    focusTl.to(roseGroup.scale, { x: targetScale, y: targetScale, z: targetScale }, 0);
  }
}

export function focusProjectById(projectId) {
  const targetMesh = allPanels.find(p => p.userData.id === projectId);
  if (targetMesh) {
    if (isFocusMode && focusedMesh) {
      closeFocusedProject(() => {
        focusProjectMesh(targetMesh);
      });
    } else {
      focusProjectMesh(targetMesh);
    }
  }
}

let pointerDownPos = { x: 0, y: 0 };
let hasMouseMoved = true;

function isHomeRoute() {
  const p = window.location.pathname.replace('/en', '').split('?')[0].split('#')[0];
  return p === '' || p === '/' || p === '/index.html';
}

function setupInteractionListeners(canvas) {
  window.addEventListener('pointerdown', (e) => {
    if (!isWebGLActive || isModalOpen || !isHomeRoute()) return;
    if (e.target.closest('button') || e.target.closest('a') || e.target.closest('.nav') || e.target.closest('.layout-switch')) return;
    isDragging = true;
    hasMouseMoved = true;
    previousMouse = { x: e.clientX, y: e.clientY };
    pointerDownPos = { x: e.clientX, y: e.clientY };
  });

  window.addEventListener('pointermove', (e) => {
    mouseNDC.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouseNDC.y = -(e.clientY / window.innerHeight) * 2 + 1;
    hasMouseMoved = true;

    if (isDragging && isWebGLActive && !isModalOpen) {
      const deltaX = e.clientX - previousMouse.x;
      const deltaY = e.clientY - previousMouse.y;

      spinVelocity += deltaX * 0.007;
      scrollTarget += deltaY * 0.0065;

      previousMouse = { x: e.clientX, y: e.clientY };
    }
  });

  window.addEventListener('pointerup', (e) => {
    if (isWebGLActive && !isModalOpen && isHomeRoute()) {
      const dist = Math.hypot(e.clientX - pointerDownPos.x, e.clientY - pointerDownPos.y);
      if (dist < 10) {
        if (e.target.closest('button') || e.target.closest('a') || e.target.closest('.nav') || e.target.closest('.layout-switch')) {
          isDragging = false;
          return;
        }
        mouseNDC.x = (e.clientX / window.innerWidth) * 2 - 1;
        mouseNDC.y = -(e.clientY / window.innerHeight) * 2 + 1;
        raycaster.setFromCamera(mouseNDC, camera);
        const hits = raycaster.intersectObjects(allPanels, false);
        if (hits.length > 0) {
          focusProjectMesh(hits[0].object);
        } else if (hoveredMesh) {
          focusProjectMesh(hoveredMesh);
        }
      }
    }
    isDragging = false;
  });

  window.addEventListener('click', (e) => {
    if (!isWebGLActive || isModalOpen || !isHomeRoute()) return;
    if (e.target.closest('button') || e.target.closest('a') || e.target.closest('.nav') || e.target.closest('.layout-switch')) return;
    mouseNDC.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouseNDC.y = -(e.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouseNDC, camera);
    const hits = raycaster.intersectObjects(allPanels, false);
    if (hits.length > 0) {
      focusProjectMesh(hits[0].object);
    } else if (hoveredMesh) {
      focusProjectMesh(hoveredMesh);
    }
  });
}

export function closeProjectModal() {
  closeFocusedProject();
}

// ==========================================================================
// ANIMATION LOOP & PHYSICS (100% Exact from K95)
// ==========================================================================
function animate() {
  requestAnimationFrame(animate);

  const now = performance.now();
  const delta = Math.min((now - lastFrameTime) / 1000, 0.05);
  lastFrameTime = now;
  elapsedAnimTime += delta;

  if (isWebGLActive) {
    // 1. Smooth layout interpolation (Rings <-> Spiral)
    if (Math.abs(layoutTarget - layoutProgress) > 0.0001) {
      layoutProgress += (layoutTarget - layoutProgress) * (1.0 - Math.exp(-3.2 * delta));
      updatePanelsLayout(layoutProgress);
    }

    if (!isFocusMode) {
      // 2. Momentum and spin dynamics
      hoverSlowdown += ((isHoveringPanel ? 0.4 : 1.0) - hoverSlowdown) * 0.1;
      const timeScaled = delta * hoverSlowdown;

      spinVelocity *= Math.pow(0.95, timeScaled * 60);
      totalRotation += (0.10 + spinVelocity) * timeScaled;

      // 3. Scroll smoothing and row vertical motion
      scrollAccumulator += (scrollTarget - scrollAccumulator) * 0.14;
      const verticalDelta = scrollAccumulator - prevScrollAccum;
      prevScrollAccum = scrollAccumulator;

      // 4. Parabolic bending inertia
      bendH += (THREE.MathUtils.clamp(spinVelocity * 0.1, -MAX_BEND_H, MAX_BEND_H) - bendH) * 0.08;
      bendV += (THREE.MathUtils.clamp(verticalDelta * 6.0, -MAX_BEND_V, MAX_BEND_V) - bendV) * 0.12;

      // 5. Rotate rows and modular wrap vertically (100% glitch-free continuous wrapping in BOTH directions)
      const metrics = getResponsiveMetrics();
      const totalHeight = numRows * metrics.rowSpacing;
      const halfTotalHeight = totalHeight / 2;

      rows.forEach((row) => {
        row.position.y -= verticalDelta;
        while (row.position.y > halfTotalHeight) {
          row.position.y -= totalHeight;
        }
        while (row.position.y < -halfTotalHeight) {
          row.position.y += totalHeight;
        }
        row.rotation.y = totalRotation;
      });

      // Rotate background grid and rose
      if (cylinderGridMesh) {
        cylinderGridMesh.rotation.y = totalRotation * 0.09;
      }
      if (roseGroup) {
        roseGroup.rotation.y = -totalRotation * 2.0;
      }

      // 6. Raycasting & Hover states (throttled to active mouse moves on home route only)
      let closestPanel = null;
      let closestDist = Infinity;

      if (!isHomeRoute() || !isWebGLActive) {
        hoveredMesh = null;
        isHoveringPanel = false;
        const labelPill = document.getElementById('project-label-pill');
        labelPill?.classList.remove('visible');
        document.getElementById('app-cursor')?.classList.remove('is-hovering');
      } else if (hasMouseMoved || hoveredMesh) {
        raycaster.setFromCamera(mouseNDC, camera);
        const hits = raycaster.intersectObjects(allPanels, false);

        if (hits.length > 0) {
          hoveredMesh = hits[0].object;
          isHoveringPanel = true;
        } else {
          hoveredMesh = null;
          isHoveringPanel = false;
        }
        hasMouseMoved = false;
      }

      // Update panel uniforms and hover scales
      const scaleLerp = 1.0 - Math.exp(-8.0 * delta);
      for (let i = 0; i < allPanels.length; i++) {
        const panel = allPanels[i];
        const isHovered = (panel === hoveredMesh);
        const targetScale = isHovered ? 1.08 : 1.0;
        if (Math.abs(targetScale - panel.userData.currentScale) > 0.0005) {
          panel.userData.currentScale += (targetScale - panel.userData.currentScale) * scaleLerp;
        }

        const u = panel.material.uniforms;
        if (u) {
          u.uBendH.value = bendH;
          u.uBendV.value = bendV;
          u.uTime.value = elapsedAnimTime;
        }

        // Track front-center focal project using shared static vector
        panel.getWorldPosition(_tempWorldPos);
        const dist = Math.hypot(_tempWorldPos.x, _tempWorldPos.y * 1.5) + (15.0 - _tempWorldPos.z);
        if (dist < closestDist) {
          closestDist = dist;
          closestPanel = panel;
        }
      }

      // Update Cursor / Label with Custom Note & Context
      const labelPill = document.getElementById('project-label-pill');
      const labelTitle = document.getElementById('project-label-title');
      const labelCategory = document.getElementById('project-label-category');

      if (hoveredMesh) {
        const proj = hoveredMesh.userData;
        if (labelTitle && labelCategory && labelPill) {
          labelTitle.textContent = proj.title;
          labelCategory.textContent = proj.note || (proj.category && proj.category !== 'Branding' ? proj.category : 'Palak Silawat') || 'Palak Silawat';
          labelPill.classList.add('visible');
        }
        document.getElementById('app-cursor')?.classList.add('is-hovering');
      } else {
        labelPill?.classList.remove('visible');
        document.getElementById('app-cursor')?.classList.remove('is-hovering');
      }

      // Notify focal counter
      if (closestPanel && closestPanel.userData.id !== currentFocalIndex && onFocalChangeCallback) {
        currentFocalIndex = closestPanel.userData.id;
        const allCards = getAllCards();
        const pIdx = allCards.findIndex(p => p.id === currentFocalIndex);
        onFocalChangeCallback(pIdx >= 0 ? pIdx : 0, allCards.length, closestPanel.userData);
      }
    } else {
      // Gentle background grid rotation in focus mode
      if (cylinderGridMesh) {
        cylinderGridMesh.rotation.y += delta * 0.02;
      }
    }

    renderer.render(scene, camera);
  }
}

function onWindowResize() {
  if (!camera || !renderer) return;
  const metrics = getResponsiveMetrics();

  camera.fov = metrics.fov;
  camera.position.z = metrics.cameraZ;
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(isMobileDevice ? Math.min(window.devicePixelRatio, 1.25) : Math.min(window.devicePixelRatio, 1.75));

  createCylindricalGrid();

  if (roseGroup) {
    const rawDim = roseGroup.userData?.rawMaxDim || roseGroup.userData?.maxDim || 1.0;
    const scale = getRoseTargetScale() / rawDim;
    roseGroup.userData.baseScale = scale;
    if (typeof gsap !== 'undefined') {
      gsap.killTweensOf(roseGroup.scale);
    }
    roseGroup.scale.set(scale, scale, scale);
  }

  updatePanelsLayout(layoutProgress);
}

// Visibility toggle for SPA routing
export function toggleWebGLVisibility(visible) {
  isWebGLActive = visible;
  const canvas = renderer?.domElement;
  if (!canvas) return;

  if (visible) {
    canvas.style.display = 'block';
    gsap.to(canvas, { opacity: 1, duration: 0.5 });

    // Instantly ensure centerpiece scale is cleanly restored to exact responsive target
    if (roseGroup) {
      const rawDim = roseGroup.userData?.rawMaxDim || roseGroup.userData?.maxDim || 1.0;
      const targetScale = getRoseTargetScale() / rawDim;
      roseGroup.userData.baseScale = targetScale;
      if (typeof gsap !== 'undefined') {
        gsap.killTweensOf(roseGroup.scale);
      }
      roseGroup.scale.set(targetScale, targetScale, targetScale);
    }

    // Reset motion accumulation & distortion uniforms to avoid jumping/warping
    prevScrollAccum = scrollAccumulator = scrollTarget;
    bendH = 0;
    bendV = 0;
    spinVelocity = 0;
  } else {
    gsap.to(canvas, {
      opacity: 0,
      duration: 0.5,
      onComplete: () => { canvas.style.display = 'none'; }
    });

    const labelPill = document.getElementById('project-label-pill');
    labelPill?.classList.remove('visible');
    document.getElementById('app-cursor')?.classList.remove('is-hovering');
  }
}

// ==========================================================================
// LIVE CARD IMAGE REPLACEMENT & RESTORATION (DEVELOPER / DATA API)
// ==========================================================================

/**
 * Dynamically replace the texture image for a specific card across all 3D cylinder/spiral rows.
 * Preserves 100% of the existing card mesh geometry, position, rotation, curvature, animations, and shader effects.
 *
 * @param {number} cardId - Project/Card ID (e.g. 399, 102, etc.)
 * @param {string} newImageUrl - Data URL, relative asset path, or external image URL
 * @param {Function} [onComplete] - Callback executed upon successful texture update
 */
export function updateCardImage(cardId, newImageUrl, onComplete) {
  if (!newImageUrl) return;

  const textureLoader = new THREE.TextureLoader();
  textureLoader.crossOrigin = 'anonymous';

  // Persist override to localStorage
  saveCustomImageOverride(cardId, newImageUrl);

  // Load new texture directly
  textureLoader.load(
    newImageUrl,
    (newTex) => {
      if (THREE.SRGBColorSpace) {
        newTex.colorSpace = THREE.SRGBColorSpace;
      } else if (THREE.sRGBEncoding) {
        newTex.encoding = THREE.sRGBEncoding;
      }
      const maxAniso = renderer ? renderer.capabilities.getMaxAnisotropy() : 16;
      newTex.anisotropy = maxAniso;
      newTex.generateMipmaps = true;
      newTex.minFilter = THREE.LinearMipmapLinearFilter;
      newTex.magFilter = THREE.LinearFilter;
      newTex.needsUpdate = true;

      // Update all panel instances in the 3D cylinder containing this card ID
      const metrics = getResponsiveMetrics();
      const imgAspect = (newTex.image && newTex.image.width && newTex.image.height)
        ? newTex.image.width / newTex.image.height
        : (3 / 4);
      const panelAspect = metrics.panelW / metrics.panelH;
      const scaleX = Math.min(1.8, Math.max(0.55, imgAspect / panelAspect));

      allPanels.forEach(panel => {
        if (panel.userData && panel.userData.id === cardId) {
          if (panel.material && panel.material.uniforms) {
            if (panel.material.uniforms.uTexture) panel.material.uniforms.uTexture.value = newTex;
            if (panel.material.uniforms.uUvScale) panel.material.uniforms.uUvScale.value.set(1, 1);
            if (panel.material.uniforms.uUvOffset) panel.material.uniforms.uUvOffset.value.set(0, 0);
          }
          panel.userData.aspectScaleX = scaleX;
          panel.userData.targetScale.set(scaleX, 1, 1);
          panel.scale.x = scaleX;
          panel.userData.imageSmall = newImageUrl;
          panel.userData.image = newImageUrl;
        }
      });

      if (onComplete) onComplete(true, newTex);
    },
    undefined,
    (err) => {
      console.error('Failed to load updated card texture:', err);
      if (onComplete) onComplete(false, err);
    }
  );
}

/**
 * Revert one or all cards back to the default code-defined images from data.js.
 *
 * @param {number|null} [cardId=null] - Specific card ID to reset, or null to reset all
 * @param {Function} [onComplete] - Callback upon completion
 */
export function resetCardImages(cardId = null, onComplete) {
  resetCustomImageOverrides(cardId);
  const textureLoader = new THREE.TextureLoader();
  textureLoader.crossOrigin = 'anonymous';

  allPanels.forEach(panel => {
    if (cardId === null || panel.userData.id === cardId) {
      const origProj = projects.find(p => p.id === panel.userData.id);
      if (origProj) {
        const defaultSrc = origProj.imageSmall || origProj.image;
        textureLoader.load(defaultSrc, (tex) => {
          if (THREE.SRGBColorSpace) {
            tex.colorSpace = THREE.SRGBColorSpace;
          } else if (THREE.sRGBEncoding) {
            tex.encoding = THREE.sRGBEncoding;
          }
          tex.needsUpdate = true;
          if (panel.material && panel.material.uniforms && panel.material.uniforms.uTexture) {
            panel.material.uniforms.uTexture.value = tex;
          }
          panel.userData.imageSmall = defaultSrc;
          panel.userData.image = defaultSrc;
        });
      }
    }
  });

  if (onComplete) onComplete();
}

/**
 * Live-reconstruct the 3D cylinder rings and spiral with updated card arrays
 */
export function rebuildCylinderPanels() {
  if (scene) {
    buildCylinderPanels();
  }
}


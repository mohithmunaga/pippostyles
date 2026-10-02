// ==========================================================================
// K95 AUTHENTIC 3D STUDIO / STORY SCENE (ThreeStudioScene)
// Replicates 3D metallic totem model on https://k95.it/en/studio (pic1)
// Vertical chrome totem pillar in the center of the hero with ambient rotation,
// mouse parallax tilt, and scroll velocity acceleration.
// ==========================================================================

const THREE = window.THREE;

let renderer = null;
let scene = null;
let camera = null;
let modelGroup = null;
let totemGroup = null;
let rafId = null;
let canvasEl = null;

let isInitialized = false;
let width = 0;
let height = 0;
let lastScrollY = 0;
let lastTime = 0;
let smoothedVelocity = 0;
let smoothedSpinBoost = 0;
let smoothedDir = 1;
let currentRotationY = 0;
let mouseX = 0;
let mouseY = 0;
let targetTiltX = 0;
let targetTiltY = 0;
let currentTiltX = 0;
let currentTiltY = 0;

function getDeviceType() {
  const w = width || window.innerWidth;
  if (w <= 767) return 'mobile';
  if (w <= 1023) return 'tablet';
  return 'desktop';
}

function getModelScale() {
  const type = getDeviceType();
  if (type === 'mobile') return 0.75;
  if (type === 'tablet') return 0.9;
  return 1.12;
}

function createChromeMaterial() {
  return new THREE.MeshPhysicalMaterial({
    color: 0xebf0ff,
    roughness: 0.08,
    metalness: 0.96,
    clearcoat: 1.0,
    clearcoatRoughness: 0.03,
    ior: 2.5,
    reflectivity: 1.0,
    side: THREE.DoubleSide
  });
}

function buildChromeTotem() {
  const group = new THREE.Group();
  const chromeMat = createChromeMaterial();

  // Stack of 13 vertical metallic cushion cubes matching K95 studio (pic1)
  const numBlocks = 13;
  const blockH = 0.52;
  const blockW = 1.08;
  const blockD = 0.96;

  for (let i = 0; i < numBlocks; i++) {
    const geo = new THREE.BoxGeometry(blockW, blockH, blockD, 4, 4, 4);
    // Smooth chamfer/cushion deformation on vertices
    const pos = geo.attributes.position;
    for (let j = 0; j < pos.count; j++) {
      const vx = pos.getX(j);
      const vy = pos.getY(j);
      const vz = pos.getZ(j);
      const r = Math.sqrt(vx * vx + vy * vy + vz * vz);
      const factor = 1.0 - 0.12 * Math.pow(r, 2);
      pos.setXYZ(j, vx * factor, vy * factor, vz * factor);
    }
    geo.computeVertexNormals();

    const mesh = new THREE.Mesh(geo, chromeMat);
    const y = (i - (numBlocks - 1) / 2) * (blockH + 0.08);
    // Subtle alternate indent offsets matching pic1
    const x = (i % 2 === 0 ? 0.05 : -0.05);
    mesh.position.set(x, y, 0);
    mesh.rotation.y = (i * 0.06);
    group.add(mesh);
  }

  return group;
}

export function initStudioScene(canvasContainer) {
  if (isInitialized || !THREE) return;
  isInitialized = true;

  width = window.innerWidth;
  height = window.innerHeight;

  canvasEl = document.createElement('canvas');
  canvasEl.className = 'studio-canvas';
  canvasContainer.appendChild(canvasEl);

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(48, width / height, 0.1, 1000);
  camera.position.z = 10;

  renderer = new THREE.WebGLRenderer({
    canvas: canvasEl,
    antialias: getDeviceType() === 'desktop',
    alpha: true,
    powerPreference: 'high-performance'
  });
  renderer.setSize(width, height);
  const isMobile = getDeviceType() !== 'desktop';
  renderer.setPixelRatio(isMobile ? Math.min(window.devicePixelRatio, 1.25) : Math.min(window.devicePixelRatio, 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace || THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.18;

  // Studio Lighting (Crisp White Key + Sky Blue Fill + Amber Rim + Ambient)
  const frontKey = new THREE.DirectionalLight(0xffffff, 3.0);
  frontKey.position.set(0, 5, 8);
  scene.add(frontKey);

  const topKey = new THREE.DirectionalLight(0xffffff, 2.2);
  topKey.position.set(0, 9, 2);
  scene.add(topKey);

  const blueLight = new THREE.DirectionalLight(0xa5b2ff, 2.6);
  blueLight.position.set(-6, 3, 5);
  scene.add(blueLight);

  const amberLight = new THREE.DirectionalLight(0xffd878, 1.8);
  amberLight.position.set(6, -2, 4);
  scene.add(amberLight);

  const ambient = new THREE.AmbientLight(0xffffff, 1.4);
  scene.add(ambient);

  modelGroup = new THREE.Group();
  scene.add(modelGroup);

  // Build the vertical chrome totem column
  totemGroup = buildChromeTotem();
  totemGroup.scale.setScalar(getModelScale());
  modelGroup.add(totemGroup);

  if (canvasEl) {
    canvasEl.classList.add('is-revealed');
  }

  lastTime = performance.now();
  lastScrollY = window.scrollY;

  window.addEventListener('resize', onWindowResize, { passive: true });
  window.addEventListener('mousemove', onMouseMove, { passive: true });
  window.addEventListener('scroll', onScroll, { passive: true });

  startRenderLoop();
}

function onMouseMove(e) {
  mouseX = (e.clientX / window.innerWidth) * 2 - 1;
  mouseY = -(e.clientY / window.innerHeight) * 2 + 1;
  targetTiltX = mouseY * 0.16;
  targetTiltY = mouseX * 0.22;
}

function onScroll() {
  const currentScroll = window.scrollY;
  const delta = currentScroll - lastScrollY;
  lastScrollY = currentScroll;

  if (Math.abs(delta) > 0.5) {
    smoothedDir = delta > 0 ? 1 : -1;
    smoothedVelocity = Math.min(Math.abs(delta) * 0.085, 2.5);
  }

  // Dynamic Scroll-Up Reveal trigger for STORY letters
  const studioHero = document.querySelector('.studio-hero');
  const studioMain = document.querySelector('.studio');
  if (studioHero && studioMain) {
    const rect = studioHero.getBoundingClientRect();
    if (rect.bottom > 80) {
      studioMain.classList.add('is-revealed');
    } else {
      studioMain.classList.remove('is-revealed');
    }
  }
}

function onWindowResize() {
  if (!camera || !renderer) return;
  width = window.innerWidth;
  height = window.innerHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
  const isMobile = getDeviceType() !== 'desktop';
  renderer.setPixelRatio(isMobile ? Math.min(window.devicePixelRatio, 1.25) : Math.min(window.devicePixelRatio, 1.75));

  if (totemGroup) {
    totemGroup.scale.setScalar(getModelScale());
  }
}

function startRenderLoop() {
  function animate(now) {
    rafId = requestAnimationFrame(animate);
    const dt = Math.min((now - lastTime) / 1000, 0.1);
    lastTime = now;

    // Decay velocity
    smoothedVelocity *= 0.91;
    smoothedSpinBoost = THREE.MathUtils.lerp(smoothedSpinBoost, smoothedVelocity, 0.12);

    // Mouse tilt lerp
    currentTiltX = THREE.MathUtils.lerp(currentTiltX, targetTiltX, 0.08);
    currentTiltY = THREE.MathUtils.lerp(currentTiltY, targetTiltY, 0.08);

    // Angular velocity: ambient (0.08 rad/s) + spin boost
    const baseSpeed = 0.08;
    const effectiveSpeed = (baseSpeed + smoothedSpinBoost * 1.6) * smoothedDir;
    currentRotationY += effectiveSpeed * dt * Math.PI * 2;

    if (modelGroup) {
      modelGroup.rotation.y = currentRotationY + currentTiltY;
      modelGroup.rotation.x = currentTiltX;
      modelGroup.rotation.z = 0;
    }

    renderer.render(scene, camera);
  }

  rafId = requestAnimationFrame(animate);
}

export function destroyStudioScene() {
  if (rafId) cancelAnimationFrame(rafId);
  window.removeEventListener('resize', onWindowResize);
  window.removeEventListener('mousemove', onMouseMove);
  window.removeEventListener('scroll', onScroll);

  if (renderer && renderer.domElement && renderer.domElement.parentNode) {
    renderer.domElement.parentNode.removeChild(renderer.domElement);
    renderer.dispose();
  }

  scene = null;
  camera = null;
  renderer = null;
  modelGroup = null;
  totemGroup = null;
  canvasEl = null;
  isInitialized = false;
}

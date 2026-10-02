// ==========================================================================
// K95 AUTHENTIC WORKS 3D GRID SCENE (WorksScene)
// Extracted and replicated directly from https://k95.it/_nuxt/B0njMRvH.js
// 100% exact 3D curved architectural wall, infinite scrolling, velocity bending,
// category desaturation filter, and raycast interactions.
// ==========================================================================

const THREE = window.THREE;

const ASPECT_RATIO = 3 / 4; // Card aspect ratio (0.75)
const FOV = 52;
const CAMERA_Z = 10;
const BG_COLOR_HEX = 0x1500E1;

// Shaders for Background Sphere
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

  vec3 linearToSRGB(vec3 c) {
    return pow(max(c, 0.0), vec3(1.0 / 2.2));
  }

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

function clamp(val, min, max) {
  return Math.min(Math.max(val, min), max);
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function smoothstep(val, min, max) {
  const x = clamp((val - min) / (max - min), 0, 1);
  return x * x * (3 - 2 * x);
}

// Module State
const isMobileDevice = typeof navigator !== 'undefined' && (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || (typeof window !== 'undefined' && window.innerWidth < 768));
let scene, camera, renderer, raycaster;
let canvasEl = null;
let bgSphere = null;
let bgGrid = null;
let bgGridMat = null;
let panels = []; // Array of { mesh, vRow, col }
let planeGeo = null;
let textureCache = new Map();
let textureLoader = new THREE.TextureLoader();
textureLoader.crossOrigin = 'anonymous';

let currentProjects = [];
let currentFilter = 'all';
let currentViewMode = 'grid';
let isInteractive = true;

// Layout Metrics
let cols = 4;
let cardW = 1;
let cardH = 1.33;
let gapX = 0.2;
let gapY = 0.2;
let rowStep = 1.5;
let visibleHeight = 10;
let baseScale = new THREE.Vector3(1, 1, 1);

// Scroll Physics & Animation
let scrollTarget = 0;
let scrollCurrent = 0;
let scrollVelocity = 0;
let gridLineY = 0;
let gridLineTargetY = 0;
let gridSpacing = 2;
let isScrolling = false;
let touchStartY = 0;
let touchLastY = 0;
let isTouching = false;
let isTouchDrag = false;
let hoveredMesh = null;
let isHovering = false;
let mousePos = new THREE.Vector2(-999, -999);
let rafId = null;
let lastTime = 0;

let onOpenCallback = null;
let onHoverCallback = null;

// Determine columns based on window width
function getColumnCount() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const isPortrait = h > w;
  if (w < 600) return 2; // mobile: 2 cols
  if (isPortrait && w < 1280) return 3; // tablet: 3 cols
  return 4; // desktop: 4 cols
}

function computeMetrics() {
  cols = getColumnCount();
  const fovRad = FOV * Math.PI / 180;
  visibleHeight = 2 * Math.tan(fovRad / 2) * CAMERA_Z;
  const visibleWidth = visibleHeight * camera.aspect;
  const winW = Math.max(window.innerWidth, 1);

  const isMobile = window.innerWidth < 600;
  const isTablet = window.innerWidth >= 600 && window.innerWidth < 1280 && (window.innerHeight > window.innerWidth);

  if (isMobile) {
    const p = 0.3, C = 0.2, Q = 3.4;
    const r = (34 / winW) * visibleWidth;
    const i = visibleWidth - 2 * r;
    const ke = i / (cols + (cols - 1) * p);
    const qt = (visibleHeight / Q / (1 + C)) * ASPECT_RATIO;
    cardW = Math.min(ke, qt);
    cardH = cardW / ASPECT_RATIO;
    gapX = cardW * p;
    gapY = cardH * C;
    rowStep = cardH + gapY;
    return;
  }

  if (isTablet) {
    const p = 0.7, C = 0.24, Q = 4;
    const r = (34 / winW) * visibleWidth;
    const i = visibleWidth - 2 * r;
    const ke = i / (cols + (cols - 1) * p);
    const qt = (visibleHeight / Q / (1 + C)) * ASPECT_RATIO;
    cardW = Math.min(ke, qt);
    cardH = cardW / ASPECT_RATIO;
    gapX = cardW * p;
    gapY = cardH * C;
    rowStep = cardH + gapY;
    return;
  }

  // Desktop (Exact K95 desktop layout)
  const r = (34 / winW) * visibleWidth;
  const i = visibleWidth - 2 * r;
  const x = (72 * 2 / winW) * visibleWidth;
  const w = Math.max(i - x, 1e-4);
  const d = (visibleHeight / (2.2 + (2.2 - 1) * 0.32)) * ASPECT_RATIO;
  const c = w / (cols + (cols - 1) * 1.28);
  cardW = Math.min(d, c);
  cardH = cardW / ASPECT_RATIO;
  gapX = cardW * 1.28;
  gapY = cardH * 0.32;
  rowStep = cardH + gapY;
}

function getColX(rowIdx, colIdx) {
  const totalW = cols * cardW + (cols - 1) * gapX;
  const startX = -totalW / 2 + cardW / 2;
  return startX + colIdx * (cardW + gapX);
}

function getRowY(rowIdx) {
  return rowStep * 0.5 - rowIdx * rowStep;
}

function getProjectAt(rowIdx, colIdx) {
  if (!currentProjects || currentProjects.length === 0) return null;
  const total = currentProjects.length;
  const globalIdx = ((rowIdx * cols + colIdx) % total + total) % total;
  return currentProjects[globalIdx];
}

// Background atmosphere sphere
function createBgSphere() {
  if (bgSphere) {
    scene.remove(bgSphere);
    bgSphere.geometry.dispose();
    bgSphere.material.dispose();
  }

  const baseColLinear = new THREE.Color(BG_COLOR_HEX).convertSRGBToLinear();
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uBaseColor: { value: baseColLinear },
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

  bgSphere = new THREE.Mesh(new THREE.SphereGeometry(140, 28, 20), mat);
  bgSphere.renderOrder = -100;
  scene.add(bgSphere);
}

// Background cylindrical line grid
function createBgGrid() {
  if (bgGrid) {
    scene.remove(bgGrid);
    bgGrid.geometry.dispose();
    bgGrid.material.dispose();
  }

  const w = window.innerWidth;
  const h = window.innerHeight;
  const isPortrait = h > w;
  const radius = isPortrait ? 30 : 34;
  const height = isPortrait ? Math.max(30, 22 * Math.min(h / w, 2.2)) : 22;
  const segments = 200;
  const rings = 80;
  const verticalDivs = isPortrait ? 22 : 16;
  const positions = [];

  for (let p = 0; p < rings; p++) {
    const angle = (p / rings) * Math.PI * 2;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    positions.push(x, -height, z, x, height, z);
  }

  for (let p = 0; p <= verticalDivs; p++) {
    const y = -height + (p / verticalDivs) * height * 2;
    for (let s = 0; s < segments; s++) {
      const a1 = (s / segments) * Math.PI * 2;
      const a2 = ((s + 1) / segments) * Math.PI * 2;
      positions.push(Math.cos(a1) * radius, y, Math.sin(a1) * radius, Math.cos(a2) * radius, y, Math.sin(a2) * radius);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  gridSpacing = (height * 2) / Math.max(verticalDivs, 1);

  bgGridMat = new THREE.LineBasicMaterial({
    color: 0x000000,
    transparent: true,
    opacity: 0.35,
    depthWrite: false
  });

  bgGrid = new THREE.LineSegments(geo, bgGridMat);
  bgGrid.renderOrder = -10;
  bgGrid.position.y = 0;
  scene.add(bgGrid);
}

// Center-cover aspect ratio fit matching K95
function applyTextureCover(tex, targetAspect = ASPECT_RATIO) {
  if (!tex || !tex.image || !tex.image.width || !tex.image.height) return;
  const imgAspect = tex.image.width / tex.image.height;
  tex.repeat.set(1, 1);
  tex.offset.set(0, 0);
  if (imgAspect > targetAspect) {
    const h = targetAspect / imgAspect;
    tex.repeat.x = h;
    tex.offset.x = (1 - h) / 2;
  } else {
    const h = imgAspect / targetAspect;
    tex.repeat.y = h;
    tex.offset.y = (1 - h) / 2;
  }
  tex.needsUpdate = true;
}

// Load and cache texture
function loadTexture(url) {
  if (!url) return null;
  if (textureCache.has(url)) {
    const cached = textureCache.get(url);
    if (cached.image && cached.image.width) {
      applyTextureCover(cached, ASPECT_RATIO);
    }
    return cached;
  }

  const tex = textureLoader.load(url, (loaded) => {
    const maxAniso = renderer ? (isMobileDevice ? Math.min(2, renderer.capabilities.getMaxAnisotropy()) : renderer.capabilities.getMaxAnisotropy()) : 16;
    loaded.anisotropy = maxAniso;
    loaded.generateMipmaps = true;
    loaded.minFilter = THREE.LinearMipmapLinearFilter;
    loaded.magFilter = THREE.LinearFilter;
    applyTextureCover(loaded, ASPECT_RATIO);
    loaded.needsUpdate = true;
    if (renderer) renderer.initTexture(loaded);
  });

  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;

  textureCache.set(url, tex);
  return tex;
}

// Hook vertex and fragment shaders on card materials
function attachCardShaderHooks(material) {
  material.userData.overlayColor = new THREE.Color(0x1500E1);
  material.userData.overlayStrength = 0.0;
  material.userData.overlayTarget = 0.0;
  material.userData.bendV = 0.0;
  material.userData._shader = null;

  material.onBeforeCompile = (shader) => {
    material.userData._shader = shader;
    shader.uniforms.uOverlayColor = { value: material.userData.overlayColor };
    shader.uniforms.uOverlayStr = { value: material.userData.overlayStrength };
    shader.uniforms.uBendV = { value: material.userData.bendV };

    shader.vertexShader = shader.vertexShader.replace(
      '#include <common>',
      `#include <common>
       uniform float uBendV;`
    );

    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `vec3 transformed = vec3(position);
       float yn = (uv.y - 0.5) * 2.0;
       // Soft continuous parabolic arch on scrolling and hovering
       float bendShape = mix(0.60, 1.0, 1.0 - yn * yn);`
    );

    shader.vertexShader = shader.vertexShader.replace(
      '#include <project_vertex>',
      `vec4 mvPosition = vec4(transformed, 1.0);
       #ifdef USE_BATCHING
         mvPosition = batchingMatrix * mvPosition;
       #endif
       #ifdef USE_INSTANCING
         mvPosition = instanceMatrix * mvPosition;
       #endif
       mvPosition = modelViewMatrix * mvPosition;
       mvPosition.z += bendShape * uBendV;
       gl_Position = projectionMatrix * mvPosition;`
    );

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <common>',
      `#include <common>
       uniform vec3  uOverlayColor;
       uniform float uOverlayStr;`
    );

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <map_fragment>',
      `#include <map_fragment>
       float t = clamp(uOverlayStr, 0.0, 1.0);
       if (t > 0.001) {
         float l = dot(diffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722));
         vec3 gray = vec3(l);
         vec3 base = mix(diffuseColor.rgb, gray, t);
         diffuseColor.rgb = mix(base, uOverlayColor, t);
       }`
    );
  };
  material.needsUpdate = true;
}

// Create single card mesh
function createCardMesh(rowIdx, colIdx) {
  const proj = getProjectAt(rowIdx, colIdx);
  if (!proj) return null;

  const imgSrc = proj.image || proj.cover || proj.imageSmall;
  const tex = loadTexture(imgSrc);

  const mat = new THREE.MeshBasicMaterial({
    map: tex,
    side: THREE.FrontSide,
    transparent: true,
    opacity: 1.0
  });
  mat.depthTest = true;
  mat.depthWrite = true;
  attachCardShaderHooks(mat);

  const mesh = new THREE.Mesh(planeGeo, mat);
  mesh.visible = true;
  mesh.userData = {
    ...proj,
    vRow: rowIdx,
    col: colIdx,
    isInteractive: true,
    baseScale: new THREE.Vector3(1.1, 1.1, 1),
    targetScale: new THREE.Vector3(1.1, 1.1, 1),
    homeX: getColX(rowIdx, colIdx),
    homeY: getRowY(rowIdx) + scrollCurrent,
    hoverBend: 0.0
  };

  mesh.position.x = mesh.userData.homeX;
  mesh.position.y = mesh.userData.homeY;
  mesh.position.z = 0;
  mesh.scale.set(1.1, 1.1, 1.0);

  scene.add(mesh);
  return { mesh, vRow: rowIdx, col: colIdx };
}

// 3D Curved Cylindrical Wall Projection (on())
function apply3DCurvature() {
  const isDesktop = window.innerWidth >= 1280;
  const curveRadius = isDesktop ? 7 : 12;

  panels.forEach(({ mesh }) => {
    const ox = mesh.position.x;
    const oy = mesh.position.y;
    const angleX = Math.atan2(ox, curveRadius);

    const normX = isDesktop
      ? clamp(Math.abs(mesh.userData.homeX ?? ox) / Math.max(((cols - 1) * (cardW + gapX)) / 2, 1e-4), 0, 1)
      : 1;

    const smoothStepVal = isDesktop ? smoothstep(normX, 0.22, 1) : 1;
    const weight = isDesktop ? lerp(1, 0.58, smoothStepVal) : 1;
    const rotY = angleX * weight;
    const rotX = isDesktop ? 0 : Math.atan2(oy, 12);

    mesh.rotation.y = -rotY;
    mesh.rotation.x = rotX;

    const posZ = curveRadius * (1 - Math.cos(rotY) * Math.cos(rotX));
    const rowOffsetZ = ((mesh.userData.vRow % 1000 + 1000) % 1000) * 0.0001;
    mesh.position.z = posZ + rowOffsetZ;
    mesh.scale.set(1.1, 1.1, 1.0);
  });
}

// Apply Category Filter Desaturation
function applyCategoryFilter() {
  panels.forEach(({ mesh }) => {
    const proj = mesh.userData;
    const isMatch =
      currentFilter === 'all' ||
      (proj.categories &&
        proj.categories.some(
          (c) => (typeof c === 'string' ? c : c.slug) === currentFilter
        ));

    mesh.userData.isInteractive = isMatch;
    const targetStr = isMatch ? 0.0 : 0.9;
    if (mesh.material.userData) {
      mesh.material.userData.overlayTarget = targetStr;
    }
  });
}

// Infinite Vertical Grid Row Wrapping (Un())
function wrapGridRows() {
  if (panels.length === 0) return;

  const bufferRows = 4;
  const topLimit = visibleHeight / 2 + rowStep * (bufferRows - 1);
  const bottomLimit = -(visibleHeight / 2 + rowStep * (bufferRows - 1));

  let wrapped = true;
  let iterations = 0;
  while (wrapped && iterations < 12) {
    wrapped = false;
    iterations++;

    const rowMap = new Map();
    panels.forEach((item) => {
      const r = item.mesh.userData.vRow;
      if (!rowMap.has(r)) rowMap.set(r, []);
      rowMap.get(r).push(item);
    });

    const sortedRows = Array.from(rowMap.keys()).sort((a, b) => a - b);
    const highestRow = sortedRows[0];
    const lowestRow = sortedRows[sortedRows.length - 1];

    const topRowPanels = rowMap.get(highestRow);
    const bottomRowPanels = rowMap.get(lowestRow);

    if (!topRowPanels || !bottomRowPanels) break;

    // Scrolled down -> top rows moved too far up
    if (topRowPanels[0].mesh.position.y > topLimit) {
      const newRow = lowestRow + 1;
      const refY = bottomRowPanels[0].mesh.userData.homeY - rowStep;

      topRowPanels.forEach((item) => {
        const col = item.mesh.userData.col;
        const proj = getProjectAt(newRow, col);
        if (proj) {
          item.mesh.userData.homeX = getColX(newRow, col);
          item.mesh.userData.homeY = refY;
          item.mesh.position.x = item.mesh.userData.homeX;
          item.mesh.position.y = item.mesh.userData.homeY;

          const imgSrc = proj.imageSmall || proj.image;
          item.mesh.material.map = loadTexture(imgSrc);
          item.mesh.material.needsUpdate = true;

          Object.assign(item.mesh.userData, proj, { vRow: newRow, col });
          item.vRow = newRow;
        }
      });
      wrapped = true;
      applyCategoryFilter();
      continue;
    }

    // Scrolled up -> bottom rows moved too far down
    if (bottomRowPanels[0].mesh.position.y < bottomLimit) {
      const newRow = highestRow - 1;
      const refY = topRowPanels[0].mesh.userData.homeY + rowStep;

      bottomRowPanels.forEach((item) => {
        const col = item.mesh.userData.col;
        const proj = getProjectAt(newRow, col);
        if (proj) {
          item.mesh.userData.homeX = getColX(newRow, col);
          item.mesh.userData.homeY = refY;
          item.mesh.position.x = item.mesh.userData.homeX;
          item.mesh.position.y = item.mesh.userData.homeY;

          const imgSrc = proj.imageSmall || proj.image;
          item.mesh.material.map = loadTexture(imgSrc);
          item.mesh.material.needsUpdate = true;

          Object.assign(item.mesh.userData, proj, { vRow: newRow, col });
          item.vRow = newRow;
        }
      });
      wrapped = true;
      applyCategoryFilter();
    }
  }
}

// Build all card meshes in scene
function buildGridPanels() {
  panels.forEach(({ mesh }) => {
    mesh.material.dispose();
    scene.remove(mesh);
  });
  panels = [];

  computeMetrics();

  if (planeGeo) planeGeo.dispose();
  planeGeo = new THREE.PlaneGeometry(cardW, cardH, 1, 12);

  if (!currentProjects || currentProjects.length === 0) return;

  scrollTarget = 0;
  scrollCurrent = 0;
  scrollVelocity = 0;

  const fovRad = FOV * Math.PI / 180;
  const vH = 2 * Math.tan(fovRad / 2) * CAMERA_Z;
  const numVisibleRows = Math.ceil(vH / rowStep);
  const bufferRows = 4;

  for (let r = -bufferRows; r < numVisibleRows + bufferRows; r++) {
    for (let c = 0; c < cols; c++) {
      const card = createCardMesh(r, c);
      if (card) panels.push(card);
    }
  }

  apply3DCurvature();
  applyCategoryFilter();
}

// Main Render & Animation Loop
function animate(time) {
  rafId = requestAnimationFrame(animate);

  const delta = Math.min((time - lastTime) / 1000, 0.05);
  lastTime = time;

  if (currentViewMode !== 'grid') return;

  // Smooth scroll interpolation (Qo = 0.08)
  const prevScroll = scrollCurrent;
  scrollCurrent += (scrollTarget - scrollCurrent) * 0.08;
  const scrollDelta = scrollCurrent - prevScroll;

  // Velocity clamp and smooth decay
  const targetVelocity = clamp(scrollDelta * 13.5, -0.34, 0.34);
  scrollVelocity += (targetVelocity - scrollVelocity) * 0.12;

  // Move panels vertically
  if (Math.abs(scrollDelta) > 0.00001) {
    panels.forEach(({ mesh }) => {
      mesh.userData.homeY += scrollDelta;
      mesh.position.y += scrollDelta;
    });
    wrapGridRows();
    apply3DCurvature();
    gridLineTargetY -= scrollDelta * 0.18;
  }

  // Animate background grid position
  const gridDiff = gridLineTargetY - gridLineY;
  if (Math.abs(gridDiff) > 0.0001) {
    gridLineY += gridDiff * 0.08;
  } else {
    gridLineY = gridLineTargetY;
  }
  if (bgGrid) bgGrid.position.y = gridLineY % gridSpacing;

  // Raycasting for cursor hover
  if (!isTouching) {
    raycaster.setFromCamera(mousePos, camera);
    const intersects = raycaster.intersectObjects(
      panels.map((p) => p.mesh),
      false
    );
    const hit = intersects.find((i) => i.object?.userData?.isInteractive);
    const hitMesh = hit ? hit.object : null;

    if (hitMesh !== hoveredMesh) {
      hoveredMesh = hitMesh;
      if (hoveredMesh) {
        isHovering = true;
        document.dispatchEvent(new CustomEvent('mesh-hover', { detail: true }));
        if (onHoverCallback) onHoverCallback(hoveredMesh.userData);
      } else {
        isHovering = false;
        document.dispatchEvent(new CustomEvent('mesh-hover', { detail: false }));
        if (onHoverCallback) onHoverCallback(null);
      }
    }
  }

  // Update Shader Uniforms: Overlay transition & BendV
  const lerpFactor = 1 - Math.exp(-8 * delta);
  panels.forEach(({ mesh }) => {
    const mat = mesh.material;
    if (mat && mat.userData) {
      const currentStr = mat.userData.overlayStrength ?? 0;
      const targetStr = mat.userData.overlayTarget ?? 0;
      const diff = targetStr - currentStr;

      if (Math.abs(diff) > 0.001) {
        mat.userData.overlayStrength = currentStr + diff * 0.1;
        if (mat.userData._shader) {
          mat.userData._shader.uniforms.uOverlayStr.value = mat.userData.overlayStrength;
        }
      }

      const isHovered = hoveredMesh === mesh;
      const targetHoverBend = isHovered ? 0.55 : 0.0;
      const currentHoverBend = mesh.userData.hoverBend ?? 0;
      mesh.userData.hoverBend = currentHoverBend + (targetHoverBend - currentHoverBend) * lerpFactor;
      mat.userData.bendV = scrollVelocity + mesh.userData.hoverBend;

      if (mat.userData._shader) {
        mat.userData._shader.uniforms.uBendV.value = mat.userData.bendV;
      }
    }

    // Hover scale expansion
    const isHovered = hoveredMesh === mesh;
    const targetScaleVal = isHovered ? 1.06 : 1.0;
    mesh.scale.lerp(new THREE.Vector3(targetScaleVal, targetScaleVal, 1), lerpFactor);
  });

  renderer.render(scene, camera);
}

// Window resize handler
function onResize() {
  if (!camera || !renderer) return;

  const w = window.innerWidth;
  const h = window.innerHeight;

  camera.aspect = w / h;
  camera.updateProjectionMatrix();

  renderer.setSize(w, h);
  renderer.setPixelRatio(isMobileDevice ? Math.min(window.devicePixelRatio, 1.25) : Math.min(window.devicePixelRatio, 1.75));

  createBgGrid();
  buildGridPanels();
}

// Wheel scroll handler
function onWheel(e) {
  if (currentViewMode !== 'grid') return;
  scrollTarget += e.deltaY * 0.014;
}

// Pointer movement
function onMouseMove(e) {
  if (currentViewMode !== 'grid') return;
  const w = window.innerWidth;
  const h = window.innerHeight;
  mousePos.x = (e.clientX / w) * 2 - 1;
  mousePos.y = -(e.clientY / h) * 2 + 1;
}

// Touch controls for mobile
function onTouchStart(e) {
  if (currentViewMode !== 'grid') return;
  const t = e.touches[0];
  if (!t) return;
  touchStartY = t.clientY;
  touchLastY = t.clientY;
  isTouching = true;
  isTouchDrag = false;
}

function onTouchMove(e) {
  if (currentViewMode !== 'grid' || !isTouching) return;
  const t = e.touches[0];
  if (!t) return;
  const delta = touchLastY - t.clientY;
  touchLastY = t.clientY;
  if (Math.abs(t.clientY - touchStartY) > 10) isTouchDrag = true;
  scrollTarget += delta * 0.013;
}

function onTouchEnd(e) {
  if (currentViewMode !== 'grid') return;
  if (!isTouchDrag && isTouching) {
    const t = e.changedTouches[0];
    if (t) {
      const clickPos = new THREE.Vector2((t.clientX / window.innerWidth) * 2 - 1, -(t.clientY / window.innerHeight) * 2 + 1);
      raycaster.setFromCamera(clickPos, camera);
      const hit = raycaster.intersectObjects(panels.map((p) => p.mesh), false).find((i) => i.object?.userData?.isInteractive);
      if (hit && onOpenCallback) {
        onOpenCallback(hit.object.userData);
      }
    }
  }
  isTouching = false;
  isTouchDrag = false;
}

// Click to open project
function onClick(e) {
  if (currentViewMode !== 'grid') return;
  raycaster.setFromCamera(mousePos, camera);
  const hit = raycaster.intersectObjects(panels.map((p) => p.mesh), false).find((i) => i.object?.userData?.isInteractive);
  if (hit && onOpenCallback) {
    onOpenCallback(hit.object.userData);
  }
}

// ==========================================================================
// PUBLIC API EXPORTS
// ==========================================================================

export function initWorksScene(container, projects, onOpenProject, onHoverProject) {
  if (scene) destroyWorksScene();

  currentProjects = projects || [];
  onOpenCallback = onOpenProject;
  onHoverCallback = onHoverProject;

  const w = window.innerWidth;
  const h = window.innerHeight;

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(FOV, w / h, 0.1, 300);
  camera.position.set(0, 0, CAMERA_Z);

  raycaster = new THREE.Raycaster();

  canvasEl = document.createElement('canvas');
  canvasEl.className = 'works-canvas is-revealed';
  canvasEl.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    z-index: 1;
    touch-action: none;
    opacity: 1;
    pointer-events: auto;
  `;
  container.appendChild(canvasEl);

  renderer = new THREE.WebGLRenderer({
    canvas: canvasEl,
    antialias: true,
    alpha: true
  });
  renderer.setClearColor(new THREE.Color(BG_COLOR_HEX), 1);
  renderer.setSize(w, h);
  renderer.setPixelRatio(isMobileDevice ? Math.min(window.devicePixelRatio, 1.25) : Math.min(window.devicePixelRatio, 1.75));
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;

  createBgSphere();
  createBgGrid();
  buildGridPanels();

  window.addEventListener('resize', onResize);
  window.addEventListener('wheel', onWheel, { passive: true });
  window.addEventListener('mousemove', onMouseMove);
  canvasEl.addEventListener('click', onClick);
  window.addEventListener('touchstart', onTouchStart, { passive: true });
  window.addEventListener('touchmove', onTouchMove, { passive: false });
  window.addEventListener('touchend', onTouchEnd, { passive: true });

  lastTime = performance.now();
  animate(lastTime);
}

export function setWorksFilter(filterSlug) {
  currentFilter = filterSlug;
  applyCategoryFilter();
}

export function setWorksViewMode(mode) {
  currentViewMode = mode;
  if (!canvasEl) return;
  if (mode === 'grid') {
    canvasEl.style.opacity = '1';
    canvasEl.style.pointerEvents = 'auto';
    canvasEl.classList.add('is-revealed');
  } else {
    canvasEl.style.opacity = '0';
    canvasEl.style.pointerEvents = 'none';
    canvasEl.classList.remove('is-revealed');
  }
}

export function updateWorksProjects(projects) {
  currentProjects = projects || [];
  buildGridPanels();
}

export function destroyWorksScene() {
  if (rafId) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }

  window.removeEventListener('resize', onResize);
  window.removeEventListener('wheel', onWheel);
  window.removeEventListener('mousemove', onMouseMove);
  window.removeEventListener('touchstart', onTouchStart);
  window.removeEventListener('touchmove', onTouchMove);
  window.removeEventListener('touchend', onTouchEnd);

  if (canvasEl) {
    canvasEl.removeEventListener('click', onClick);
    if (canvasEl.parentNode) canvasEl.parentNode.removeChild(canvasEl);
    canvasEl = null;
  }

  panels.forEach(({ mesh }) => {
    mesh.material.dispose();
    if (scene) scene.remove(mesh);
  });
  panels = [];

  if (planeGeo) {
    planeGeo.dispose();
    planeGeo = null;
  }

  if (bgSphere) {
    scene.remove(bgSphere);
    bgSphere.geometry.dispose();
    bgSphere.material.dispose();
    bgSphere = null;
  }

  if (bgGrid) {
    scene.remove(bgGrid);
    bgGrid.geometry.dispose();
    bgGrid.material.dispose();
    bgGrid = null;
  }

  if (renderer) {
    renderer.dispose();
    renderer = null;
  }

  scene = null;
  camera = null;
  raycaster = null;
}

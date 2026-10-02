// ==========================================================================
// PROFESSIONAL SMOOTH 3D PAPER WAVE ENGINE
// Critically damped spring physics & smooth hermite-enveloped cylinder wave
// ==========================================================================

let paperElements = [];
let currentVelocity = 0;
let targetVelocity = 0;
let smoothedScrollY = 0;
let targetScrollY = 0;
let isScrolling = false;
let scrollTimeout = null;

export function initScrollComposition(lenisInstance) {
  // Register all page sections, text blocks, and media
  registerElements();

  if (lenisInstance) {
    lenisInstance.on('scroll', (e) => {
      targetScrollY = e.scroll;
      targetVelocity = e.velocity || 0;
      isScrolling = true;

      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        isScrolling = false;
        targetVelocity = 0;
      }, 150);
    });
  }

  // Fallback native scroll listener
  window.addEventListener('scroll', () => {
    targetScrollY = window.scrollY || window.pageYOffset;
  }, { passive: true });

  // 60/120fps Animation ticker
  const tick = (time) => {
    updateSmoothWaves(time);
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

export function refreshScrollComposition() {
  paperElements = [];
  registerElements();
}

function registerElements() {
  const isMobile = window.innerWidth < 768;

  // 1. Background Grid Parallax
  const bgGrid = document.querySelector('.app-bg');
  if (bgGrid) {
    paperElements.push({
      element: bgGrid,
      type: 'grid',
      speed: isMobile ? 0.02 : 0.05
    });
  }

  // 2. Editorial Typography & Headings
  const headings = document.querySelectorAll(`
    .works-hero-h1,
    .project-title,
    .section-text-block__sub,
    .studio-hero h1,
    .contacts-hero h1
  `);
  headings.forEach(heading => {
    heading.classList.add('paper-wave-element');
    paperElements.push({
      element: heading,
      type: 'heading',
      speed: isMobile ? 0.04 : 0.09
    });
  });

  // 3. Case Study Sections & Structural Grids
  const structuralSections = document.querySelectorAll(`
    .project-hero,
    .project-meta-grid,
    .section-media-single,
    .section-media-duo,
    .section-media-trio,
    .section-text-block,
    .works-title-area,
    .works-card,
    .studio-grid,
    .contacts-grid,
    .focus-next-section,
    .site-footer,
    .focus-footer
  `);
  structuralSections.forEach(section => {
    section.classList.add('paper-wave-element');
    paperElements.push({
      element: section,
      type: 'section'
    });
  });

  // 4. Media Elements (Images & Videos)
  const mediaElements = document.querySelectorAll(`
    .project-hero__media,
    .project-hero__media img,
    .section-media-single img,
    .section-media-single video,
    .section-media-duo__left img,
    .section-media-duo__left video,
    .section-media-duo__right img,
    .section-media-duo__right video,
    .section-media-trio__item img,
    .section-media-trio__item video,
    .works-card__img-wrap img
  `);
  mediaElements.forEach((el, index) => {
    el.classList.add('paper-wave-element');
    const isEven = index % 2 === 0;
    paperElements.push({
      element: el,
      type: 'media',
      speed: isMobile ? (0.02 * (isEven ? 1 : -1)) : (0.06 * (isEven ? 1 : -0.7)),
      scaleFactor: isMobile ? 0.01 : 0.025
    });
  });

  // 5. Text Blocks Reveal
  const textBlocks = document.querySelectorAll('.project-desc-p, .section-text-block__content p, .contacts-val, .studio-p-large');
  textBlocks.forEach(text => {
    text.style.opacity = '0';
    text.style.transform = 'translate3d(0, 16px, 0)';
    text.style.transition = 'opacity 0.75s cubic-bezier(0.16, 1, 0.3, 1), transform 0.75s cubic-bezier(0.16, 1, 0.3, 1)';

    paperElements.push({
      element: text,
      type: 'text-reveal',
      revealed: false
    });
  });
}

function updateSmoothWaves(timestamp) {
  const vh = window.innerHeight;
  const isMobile = window.innerWidth < 768;

  // 1. Dual-stage smooth spring interpolation (eliminates snapping & jitter)
  if (isScrolling) {
    currentVelocity += (targetVelocity - currentVelocity) * 0.095;
  } else {
    currentVelocity *= 0.88;
    if (Math.abs(currentVelocity) < 0.001) currentVelocity = 0;
  }
  smoothedScrollY += (targetScrollY - smoothedScrollY) * 0.12;

  // 2. Global Page Smooth Arch (Desktop only to prevent mobile layer crashes)
  const appPage = document.getElementById('app-page');
  const isWorksRoute = window.location.pathname.startsWith('/works');
  if (appPage && !isMobile && Math.abs(currentVelocity) > 0.001 && !isWorksRoute) {
    const pageRotX = clamp(-currentVelocity * 0.012, -1.8, 1.8);
    const pageTransZ = clamp(-Math.abs(currentVelocity) * 0.08, -10, 0);
    appPage.style.transform = `perspective(1400px) rotateX(${pageRotX.toFixed(2)}deg) translateZ(${pageTransZ.toFixed(1)}px)`;
  } else if (appPage && appPage.style.transform && appPage.style.transform !== 'none') {
    appPage.style.transform = 'none';
  }

  // If mobile, or if idle and not scrolling, skip element transform overhead
  if (isMobile || (Math.abs(currentVelocity) < 0.001 && !isScrolling)) {
    return;
  }

  // 3. Smooth Hermite-Enveloped Wave on Individual Elements
  paperElements.forEach(item => {
    const el = item.element;
    if (!el || !el.isConnected) return;

    const rect = el.getBoundingClientRect();
    const elementCenter = rect.top + rect.height * 0.5;
    const normalizedY = elementCenter / vh; // 0 at top, 0.5 at center, 1 at bottom

    // Viewport bounds check
    if (normalizedY < -0.25 || normalizedY > 1.25) return;

    // Hermite sine bell-curve envelope
    const envelope = Math.sin(clamp(normalizedY, 0, 1) * Math.PI);
    const wavePhase = (rect.top * 0.0022) - (smoothedScrollY * 0.0016);

    if (item.type === 'grid') {
      const yOffset = -smoothedScrollY * item.speed;
      el.style.transform = `translate3d(0, ${yOffset.toFixed(1)}px, 0)`;

    } else if (item.type === 'heading') {
      const yOffset = (normalizedY - 0.5) * vh * item.speed;
      if (isMobile) {
        el.style.transform = `translate3d(0, ${yOffset.toFixed(1)}px, 0)`;
      } else {
        const waveY = Math.sin(wavePhase) * currentVelocity * 0.25 * envelope;
        const rotX = Math.cos(wavePhase) * clamp(currentVelocity * 0.04, -3.5, 3.5) * envelope;
        el.style.transform = `perspective(1200px) translate3d(0, ${(yOffset + waveY).toFixed(2)}px, 0) rotateX(${rotX.toFixed(2)}deg)`;
      }

    } else if (item.type === 'section') {
      if (isMobile) {
        const waveY = Math.sin(wavePhase) * currentVelocity * 0.12 * envelope;
        el.style.transform = `translate3d(0, ${waveY.toFixed(1)}px, 0)`;
      } else {
        const waveY = Math.sin(wavePhase) * currentVelocity * 0.28 * envelope;
        const rotX = Math.cos(wavePhase) * clamp(currentVelocity * 0.045, -4.0, 4.0) * envelope;
        el.style.transform = `perspective(1200px) translate3d(0, ${waveY.toFixed(2)}px, 0) rotateX(${rotX.toFixed(2)}deg)`;
      }

    } else if (item.type === 'media') {
      const factor = normalizedY - 0.5;
      const yOffset = factor * 30 * item.speed;
      if (isMobile) {
        el.style.transform = `translate3d(0, ${yOffset.toFixed(1)}px, 0)`;
      } else {
        const waveY = Math.sin(wavePhase) * currentVelocity * 0.3 * envelope;
        const rotX = Math.cos(wavePhase) * clamp(currentVelocity * 0.05, -4.5, 4.5) * envelope;
        el.style.transform = `perspective(1200px) translate3d(0, ${(yOffset + waveY).toFixed(2)}px, 0) rotateX(${rotX.toFixed(2)}deg)`;
      }

    } else if (item.type === 'text-reveal') {
      if (normalizedY < 0.88 && !item.revealed) {
        item.revealed = true;
        el.style.opacity = '1';
        el.style.transform = 'translate3d(0, 0, 0)';
      }
    }
  });
}

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

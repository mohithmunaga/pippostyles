/**
 * K95 Authentic WorksListView
 * Faithful reverse-engineered implementation of K95's typographic list view
 * Includes letter breakdown glyph splitting, touch scatter physics,
 * scroll velocity curves (--row-curve-x, --row-curve-y, --row-curve-r),
 * and dynamic category filtering.
 */

let activeInstance = null;

export function initWorksListView({
  container,
  projects = [],
  filterCategory = 'all',
  onOpenProject,
  onHoverProject
}) {
  if (activeInstance) {
    activeInstance.destroy();
  }

  let currentProjects = [...projects];
  let currentFilter = filterCategory;
  let animId = null;
  let isTouching = false;
  let touchStartPos = { x: 0, y: 0, time: 0 };
  let touchLastY = 0;
  let scrollVelocity = 0;
  let targetVelocity = 0;
  let activeIndex = 0;
  let hoveredIndex = -1;
  let currentPreviewUrl = '';

  // Root elements
  const sectionEl = document.createElement('section');
  sectionEl.className = 'works-list';

  const layoutEl = document.createElement('div');
  layoutEl.className = 'works-list__layout';

  const titlesWrap = document.createElement('div');
  titlesWrap.className = 'works-list__titles';

  const previewAside = document.createElement('aside');
  previewAside.className = 'works-list__preview';
  previewAside.setAttribute('aria-hidden', 'true');

  const previewShell = document.createElement('div');
  previewShell.className = 'works-list__preview-shell is-visible';

  const previewStage = document.createElement('div');
  previewStage.className = 'works-list__preview-stage';

  const previewFrame = document.createElement('div');
  previewFrame.className = 'works-list__preview-frame';

  const previewImg = document.createElement('img');
  previewImg.className = 'works-list__preview-image';
  previewImg.loading = 'eager';
  previewImg.decoding = 'sync';
  previewImg.alt = 'Project preview';

  previewFrame.appendChild(previewImg);
  previewStage.appendChild(previewFrame);
  previewShell.appendChild(previewStage);
  previewAside.appendChild(previewShell);

  layoutEl.appendChild(titlesWrap);
  layoutEl.appendChild(previewAside);
  sectionEl.appendChild(layoutEl);
  container.appendChild(sectionEl);

  // Row state tracking for lerp animations
  let rowItems = [];

  function filterProjects(allList, cat) {
    if (!cat || cat === 'all') return allList;
    return allList.filter((p) => {
      const cats = (p.categories || [p.category || '']).map((c) =>
        (typeof c === 'string' ? c : c?.slug || c?.name || '').toLowerCase()
      );
      return cats.includes(cat.toLowerCase());
    });
  }

  function createGlyphs(title, maxLen) {
    const chars = Array.from(title || '');
    const g = Math.max((maxLen ?? chars.length) - 1, 1);
    return chars.map((char, idx) => {
      const progress = Math.min(idx / g, 1);
      return {
        char: char === ' ' ? '\u00A0' : char,
        isSpace: char === ' ',
        progress,
        bias: progress * progress,
        tail: Math.pow(progress, 1.28),
        drag: Math.pow(progress, 1.85)
      };
    });
  }

  function renderRows() {
    titlesWrap.innerHTML = '';
    rowItems = [];

    const filtered = filterProjects(currentProjects, currentFilter);
    if (filtered.length === 0) {
      titlesWrap.innerHTML = `
        <div class="works-list__item is-active" style="--row-opacity: 0.6; padding: 40px 0;">
          <span class="works-list__title">NO PICS IN THIS CATEGORY</span>
        </div>
      `;
      previewShell.classList.remove('is-visible');
      return;
    }

    previewShell.classList.add('is-visible');

    // Find longest title for uniform glyph spacing ratio
    let maxTitleLen = 1;
    filtered.forEach((p) => {
      const len = Array.from(p.title || '').length;
      if (len > maxTitleLen) maxTitleLen = len;
    });

    filtered.forEach((p, idx) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `works-list__item ${idx === activeIndex ? 'is-active' : ''}`;
      btn.setAttribute('data-index', idx);
      btn.setAttribute('data-slug', p.slug);

      const titleSpan = document.createElement('span');
      titleSpan.className = 'works-list__title';

      const glyphs = createGlyphs(p.title, maxTitleLen);
      const charElements = glyphs.map((g) => {
        const charSpan = document.createElement('span');
        charSpan.className = `works-list__char ${g.isSpace ? 'is-space' : ''}`;
        charSpan.textContent = g.char;
        charSpan.style.setProperty('--char-progress', g.progress.toFixed(4));
        charSpan.style.setProperty('--char-bias', g.bias.toFixed(4));
        charSpan.style.setProperty('--char-tail', g.tail.toFixed(4));
        charSpan.style.setProperty('--char-drag', g.drag.toFixed(4));

        return {
          el: charSpan,
          progress: g.progress,
          touchX: 0,
          touchY: 0,
          touchR: 0
        };
      });

      charElements.forEach((c) => {
        titleSpan.appendChild(c.el);
        c.el.addEventListener('pointerenter', () => {
          c.touchX = (Math.random() - 0.5) * 35;
          c.touchY = -(Math.random() * 25 + 10);
          c.touchR = (Math.random() - 0.5) * 40;
          c.el.style.setProperty('--char-touch-x', `${c.touchX.toFixed(2)}px`);
          c.el.style.setProperty('--char-touch-y', `${c.touchY.toFixed(2)}px`);
          c.el.style.setProperty('--char-touch-r', `${c.touchR.toFixed(2)}deg`);
        });
      });
      btn.appendChild(titleSpan);

      // Category Tag Badge (matches authentic K95 active item badge)
      const catName = (p.categories && p.categories[0]?.name) || p.category || p.note || 'Moment';
      const badge = document.createElement('span');
      badge.className = 'works-list__badge';
      badge.innerHTML = `
        <span class="works-list__badge-circle"></span>
        <span class="works-list__badge-arrow">↗</span>
        <span class="works-list__badge-text">${catName}</span>
      `;
      btn.appendChild(badge);

      titlesWrap.appendChild(btn);

      // Track item state for physics
      const itemState = {
        btn,
        project: p,
        chars: charElements,
        curveX: 0,
        curveY: 0,
        curveR: 0,
        opacity: idx === activeIndex ? 1.0 : 0.3,
        targetOpacity: idx === activeIndex ? 1.0 : 0.3
      };

      btn.style.setProperty('--row-curve-x', '0.00px');
      btn.style.setProperty('--row-curve-y', '0.00px');
      btn.style.setProperty('--row-curve-r', '0.000deg');
      btn.style.setProperty('--row-opacity', itemState.opacity.toFixed(3));

      // Pointer / Hover interaction
      btn.addEventListener('pointerenter', () => {
        hoveredIndex = idx;
        setActiveProject(idx, false);
      });

      btn.addEventListener('pointerleave', () => {
        hoveredIndex = -1;
      });

      // Direct Touch / Pointer Down Letter Breakdown effect
      function triggerLetterBreakdown(clientX, force = 1.0) {
        const rect = btn.getBoundingClientRect();
        const touchProg = Math.max(0, Math.min(1, (clientX - rect.left) / Math.max(rect.width, 1)));

        charElements.forEach((ch) => {
          const dist = Math.abs(ch.progress - touchProg);
          const impact = Math.max(0, 1 - dist * 2.0) * force;
          ch.touchX = (ch.progress - touchProg) * impact * 70;
          ch.touchY = -Math.sin(ch.progress * Math.PI) * impact * 45;
          ch.touchR = (ch.progress - 0.5) * impact * 60;

          ch.el.style.setProperty('--char-touch-x', `${ch.touchX.toFixed(2)}px`);
          ch.el.style.setProperty('--char-touch-y', `${ch.touchY.toFixed(2)}px`);
          ch.el.style.setProperty('--char-touch-r', `${ch.touchR.toFixed(2)}deg`);
        });
      }

      btn.addEventListener('pointerdown', (e) => {
        triggerLetterBreakdown(e.clientX, 1.5);
      });

      btn.addEventListener('pointermove', (e) => {
        if (e.buttons > 0 || isTouching) {
          triggerLetterBreakdown(e.clientX, 1.2);
        }
      });

      btn.addEventListener('touchstart', (e) => {
        const touch = e.touches[0];
        if (touch) {
          triggerLetterBreakdown(touch.clientX, 1.6);
        }
      }, { passive: true });

      btn.addEventListener('touchmove', (e) => {
        const touch = e.touches[0];
        if (touch) {
          triggerLetterBreakdown(touch.clientX, 1.2);
        }
      }, { passive: true });

      // Click to open project detail
      btn.addEventListener('click', () => {
        if (onOpenProject) onOpenProject(p);
      });

      rowItems.push(itemState);
    });

    updateSpacer();
    updateMetricsCache();
    setActiveProject(0, true);
  }

  function updateSpacer() {
    const spacerH = Math.max(window.innerHeight * 0.38, 200);
    titlesWrap.style.setProperty('--works-list-spacer', `${Math.round(spacerH)}px`);
    updateMetricsCache();
  }

  let previousActiveIndex = -1;
  let cachedRowHeight = 60;
  let titlesTop = 0;

  function updateMetricsCache() {
    if (rowItems.length > 0) {
      cachedRowHeight = rowItems[0].btn.offsetHeight || 60;
      titlesTop = titlesWrap.offsetTop;
    }
  }

  function setActiveProject(idx, immediate = false) {
    const filtered = filterProjects(currentProjects, currentFilter);
    if (!filtered[idx]) return;

    activeIndex = idx;
    const targetProject = filtered[idx];

    // O(1) update of only previous and current active item
    if (previousActiveIndex >= 0 && previousActiveIndex !== idx && rowItems[previousActiveIndex]) {
      const prev = rowItems[previousActiveIndex];
      prev.btn.classList.remove('is-active');
      prev.targetOpacity = 0.3;
      prev.opacity = 0.3;
      prev.btn.style.setProperty('--row-opacity', '0.300');
    }

    if (rowItems[idx]) {
      const curr = rowItems[idx];
      curr.btn.classList.add('is-active');
      curr.targetOpacity = 1.0;
      curr.opacity = 1.0;
      curr.btn.style.setProperty('--row-opacity', '1.000');
    }
    previousActiveIndex = idx;

    // Update Preview Image reliably
    const imgSrc = targetProject.image || targetProject.cover || targetProject.imageSmall || '';
    if (imgSrc && currentPreviewUrl !== imgSrc) {
      currentPreviewUrl = imgSrc;
      previewImg.src = imgSrc;
      previewImg.style.opacity = '1';
      previewImg.style.transform = 'scale(1)';
      previewShell.classList.add('is-visible');
    }

    if (onHoverProject) {
      onHoverProject(targetProject);
    }
  }

  // Touch & Scroll Velocity Physics
  function onTouchStart(e) {
    const t = e.touches[0];
    if (!t) return;
    isTouching = true;
    touchStartPos = { x: t.clientX, y: t.clientY, time: performance.now() };
    touchLastY = t.clientY;
  }

  function onTouchMove(e) {
    const t = e.touches[0];
    if (!t) return;
    const dy = touchLastY - t.clientY;
    touchLastY = t.clientY;
    targetVelocity = Math.max(-2.5, Math.min(2.5, targetVelocity + dy * 0.05));
  }

  function onTouchEnd() {
    isTouching = false;
  }

  function onScroll() {
    const scrollY = window.scrollY;
    const centerViewport = window.innerHeight * 0.5;

    // O(1) arithmetic without forced layout reflow
    if (hoveredIndex === -1 && rowItems.length > 0) {
      const approxIdx = Math.max(0, Math.min(rowItems.length - 1, Math.round((scrollY + centerViewport - titlesTop) / cachedRowHeight)));
      if (approxIdx !== activeIndex) {
        setActiveProject(approxIdx, false);
      }
    }
  }

  function onWheel(e) {
    targetVelocity = Math.max(-2.0, Math.min(2.0, targetVelocity + e.deltaY * 0.0035));
  }

  // Animation Loop (60/120fps physics)
  let lastTime = performance.now();
  let previouslyAnimatedIndices = new Set();

  function loop(time) {
    const dt = Math.min((time - lastTime) / 1000, 0.05);
    lastTime = time;

    // Smooth velocity decay
    scrollVelocity += (targetVelocity - scrollVelocity) * 0.15;
    targetVelocity *= 0.88;
    if (Math.abs(scrollVelocity) < 0.0005) scrollVelocity = 0;

    const scrollY = window.scrollY;
    const viewportHeight = window.innerHeight;
    const viewportCenter = viewportHeight * 0.5;
    const maxCurveDist = Math.max(viewportHeight * 0.72, 1);

    // Only compute windowed items within visible bounds (e.g. 25 rows)
    const centerIdx = Math.max(0, Math.min(rowItems.length - 1, Math.round((scrollY + viewportCenter - titlesTop) / cachedRowHeight)));
    const startIdx = Math.max(0, centerIdx - 12);
    const endIdx = Math.min(rowItems.length, centerIdx + 13);

    const currentlyAnimated = new Set();

    for (let idx = startIdx; idx < endIdx; idx++) {
      const row = rowItems[idx];
      if (!row) continue;
      currentlyAnimated.add(idx);

      // Fast estimated position without forced getBoundingClientRect() reflow
      const itemTop = titlesTop + idx * cachedRowHeight - scrollY;
      const distFromCenter = Math.abs(itemTop + cachedRowHeight * 0.5 - viewportCenter);
      const centerFactor = Math.max(0, 1 - distFromCenter / maxCurveDist);

      // K95 Parabolic Letter Distortion formulas
      const targetCurveX = Math.max(-25, Math.min(25, scrollVelocity * -18 * centerFactor));
      const targetCurveY = Math.max(-60, Math.min(60, scrollVelocity * 70 * centerFactor));
      const targetCurveR = Math.max(-32, Math.min(32, scrollVelocity * 38 * centerFactor));

      row.curveX += (targetCurveX - row.curveX) * 0.18;
      row.curveY += (targetCurveY - row.curveY) * 0.18;
      row.curveR += (targetCurveR - row.curveR) * 0.18;

      row.btn.style.setProperty('--row-curve-x', `${row.curveX.toFixed(2)}px`);
      row.btn.style.setProperty('--row-curve-y', `${row.curveY.toFixed(2)}px`);
      row.btn.style.setProperty('--row-curve-r', `${row.curveR.toFixed(3)}deg`);

      // Lerp opacity
      if (Math.abs(row.targetOpacity - row.opacity) > 0.005) {
        row.opacity += (row.targetOpacity - row.opacity) * 0.15;
        row.btn.style.setProperty('--row-opacity', row.opacity.toFixed(3));
      }
    }

    // Reset items that left the visible window
    previouslyAnimatedIndices.forEach((idx) => {
      if (!currentlyAnimated.has(idx) && rowItems[idx]) {
        const row = rowItems[idx];
        if (row.curveX !== 0 || row.curveY !== 0 || row.curveR !== 0) {
          row.curveX = 0;
          row.curveY = 0;
          row.curveR = 0;
          row.btn.style.setProperty('--row-curve-x', '0.00px');
          row.btn.style.setProperty('--row-curve-y', '0.00px');
          row.btn.style.setProperty('--row-curve-r', '0.000deg');
        }
      }
    });
    previouslyAnimatedIndices = currentlyAnimated;

    animId = requestAnimationFrame(loop);
  }

  // Bind Global Listeners
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('wheel', onWheel, { passive: true });
  window.addEventListener('touchstart', onTouchStart, { passive: true });
  window.addEventListener('touchmove', onTouchMove, { passive: true });
  window.addEventListener('touchend', onTouchEnd, { passive: true });
  window.addEventListener('resize', updateSpacer, { passive: true });

  // Initial render
  renderRows();
  animId = requestAnimationFrame(loop);

  activeInstance = {
    setFilter(cat) {
      currentFilter = cat;
      activeIndex = 0;
      renderRows();
    },
    updateProjects(newProjects) {
      currentProjects = [...newProjects];
      renderRows();
    },
    destroy() {
      if (animId) cancelAnimationFrame(animId);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('resize', updateSpacer);
      sectionEl.remove();
      activeInstance = null;
    }
  };

  return activeInstance;
}

export function setWorksListFilter(cat) {
  if (activeInstance) {
    activeInstance.setFilter(cat);
  }
}

export function updateWorksListProjects(projects) {
  if (activeInstance) {
    activeInstance.updateProjects(projects);
  }
}

export function destroyWorksListView() {
  if (activeInstance) {
    activeInstance.destroy();
  }
}

// Studio K95 SPA Main Application entry point
import { projects, getAllCards, setAllCards, addNewCard, studio, contact, translations } from './data.js';
import { initWebGL, setWebGLLayout, handleWebGLScroll, toggleWebGLVisibility, closeProjectModal, focusProjectById, closeFocusedProject, revealScene, rebuildCylinderPanels } from './webgl.js';
import { initScrollComposition, refreshScrollComposition } from './scroll-composition.js';
import { initWorksScene, setWorksFilter, setWorksViewMode, destroyWorksScene, updateWorksProjects } from './works-scene.js';
import { initWorksListView, setWorksListFilter, updateWorksListProjects, destroyWorksListView } from './works-list.js';
import { initContactScene, destroyContactScene } from './contacts-scene.js';
import { initTextReveal, destroyTextReveal } from './text-reveal.js';
import { destroyStudioScene } from './studio-scene.js';
import { PippostylesIntro } from './pippostyles-intro.js';

window.getAllCards = getAllCards;
window.setAllCards = setAllCards;

let lenis;
let appPage;
let cursor = { x: 0, y: 0, targetX: 0, targetY: 0 };
let currentRoute = '/';
export let currentLang = localStorage.getItem('k95_lang') || 'en';

// ==========================================================================
// PIPPOSTYLES CINEMATIC LUXURY ANIMATED LOGO INTRO
// Clean electric blue (#1500E1) digital typewriter & luxury wordmark reveal
// ==========================================================================
function startPreloader() {
  const loaderEl = document.getElementById('boot-loader');
  if (loaderEl) {
    try { loaderEl.remove(); } catch (e) {}
  }
  const patchEl = document.getElementById('boot-patch');
  if (patchEl) {
    try { patchEl.remove(); } catch (e) {}
  }

  // If navigating directly to a subpage (/works, /studio, /contacts, /projects/..., /upload), skip intro
  const currentPath = window.location.pathname;
  if (currentPath !== '/' && currentPath !== '/en' && currentPath !== '' && currentPath !== '/gallery') {
    revealScene();
    onAppReady();
    return;
  }

  document.body.classList.add('has-intro');

  const intro = new PippostylesIntro({
    container: document.body,
    autoTransition: true,
    transitionDelay: 1200,
    soundEnabled: true,
    onComplete: () => {
      revealScene();
      onAppReady();
    }
  });

  window.introInstance = intro;
}

// Initialize components once loading ends
function onAppReady() {
  // Show WebGL switches
  document.getElementById('layout-switch')?.classList.add('is-revealed');
  
  // Start Routing
  handleRoute(window.location.pathname);
  
  // Enable Nav text reveals
  document.getElementById('app-nav')?.classList.add('nav--text-ready');
}

function updateFocalCounter(index, total) {
  const counterEl = document.getElementById('focal-counter');
  if (counterEl) {
    counterEl.textContent = String(index + 1).padStart(2, '0');
  }
}

// ==========================================================================
// CUSTOM LERP CURSOR & FLOATING LABEL
// ==========================================================================
function initCustomCursor() {
  const cursorEl = document.getElementById('app-cursor');
  const labelEl = document.getElementById('project-label');
  
  window.addEventListener('pointermove', (e) => {
    cursor.targetX = e.clientX;
    cursor.targetY = e.clientY;
  });

  document.addEventListener('mesh-hover', (e) => {
    if (cursorEl) cursorEl.classList.toggle('is-hovering', !!e.detail);
  });
  
  function update() {
    // Lerp position for silky smooth movement
    cursor.x += (cursor.targetX - cursor.x) * 0.15;
    cursor.y += (cursor.targetY - cursor.y) * 0.15;
    
    cursorEl.style.transform = `translate3d(${cursor.x}px, ${cursor.y}px, 0) translate(-50%, -50%)`;
    
    // Position project label offsets
    labelEl.style.transform = `translate3d(${cursor.targetX}px, ${cursor.targetY}px, 0)`;
    
    requestAnimationFrame(update);
  }
  update();
}

// ==========================================================================
// SPLIT TEXT CHARACTER HOVER EFFECT
// ==========================================================================
function applySplitTextHovers() {
  const hoverLinks = [
    document.getElementById('nav-link-works'),
    document.getElementById('nav-link-studio'),
    document.getElementById('nav-link-contacts')
  ];
  
  hoverLinks.forEach(el => {
    if (!el) return;
    const text = el.innerText;
    el.innerHTML = text.split('').map((char, index) => {
      if (char === ' ') return `<span class="nav__link-char" style="--i:${index};"><span class="char-top">&nbsp;</span><span class="char-bot" aria-hidden="true">&nbsp;</span></span>`;
      return `<span class="nav__link-char" style="--i:${index};"><span class="char-top">${char}</span><span class="char-bot" aria-hidden="true">${char}</span></span>`;
    }).join('');
  });
}

// ==========================================================================
// LENIS SMOOTH SCROLLER
// ==========================================================================
function initSmoothScroll() {
  lenis = new Lenis({
    duration: 1.2,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
    wheelMultiplier: 1.0
  });

  // Direct wheel listener for infinite homepage virtual scrolling
  window.addEventListener('wheel', (e) => {
    if (currentRoute === '/' || currentRoute === '' || currentRoute === '/en') {
      handleWebGLScroll(e.deltaY);
    }
  }, { passive: true });

  // Direct touch listener for infinite mobile touch scrolling
  let touchStartY = 0;
  window.addEventListener('touchstart', (e) => {
    if (e.touches.length > 0) {
      touchStartY = e.touches[0].clientY;
    }
  }, { passive: true });

  window.addEventListener('touchmove', (e) => {
    if ((currentRoute === '/' || currentRoute === '' || currentRoute === '/en') && e.touches.length > 0) {
      const deltaY = (touchStartY - e.touches[0].clientY) * 1.4;
      touchStartY = e.touches[0].clientY;
      handleWebGLScroll(deltaY);
    }
  }, { passive: true });

  // Initialize scroll-driven composition
  initScrollComposition(lenis);

  function raf(time) {
    lenis.raf(time);
    requestAnimationFrame(raf);
  }
  requestAnimationFrame(raf);
}

// ==========================================================================
// SPA ROUTER & VIEW BUILDERS
// ==========================================================================
appPage = document.getElementById('app-page');

// Handle navigation trigger
export function navigateTo(url) {
  window.navigateTo = navigateTo;
  const transitionLayer = document.getElementById('transition-layer');
  
  // Trigger full screen electric blue slider
  transitionLayer.classList.add('active');
  
  setTimeout(() => {
    window.history.pushState(null, '', url);
    handleRoute(url);
    
    // Scroll page back to top
    window.scrollTo(0, 0);
    lenis?.scrollTo(0, { immediate: true });
    
    setTimeout(() => {
      // Slide transition layer down
      transitionLayer.classList.remove('active');
    }, 400);
  }, 600); // center of transition
}

function handleRoute(path) {
  if (!appPage) appPage = document.getElementById('app-page');
  currentRoute = path;
  
  // Remove slash or language prefixes and query params
  let route = path.replace('/en', '').split('?')[0].split('#')[0];
  if (route === '') route = '/';
  
  // Clean up works 3D scene & list view when leaving works
  if (route !== '/works') {
    destroyWorksScene();
    destroyWorksListView();
  }

  // Clean up contacts 3D scene when leaving contacts
  if (route !== '/contacts') {
    destroyContactScene();
  }

  // Clean up previous text scroll reveal engine
  destroyTextReveal();

  // Highlight active nav state dot
  updateNavState(route);

  // Clean up and destroy any running subpage scenes to free GPU memory
  if (route !== '/works') {
    try { destroyWorksScene(); } catch (e) {}
    try { destroyWorksListView(); } catch (e) {}
  }
  if (route !== '/studio') {
    try { destroyStudioScene(); } catch (e) {}
  }
  if (route !== '/contacts') {
    try { destroyContactScene(); } catch (e) {}
  }
  try { destroyTextReveal(); } catch (e) {}
  
  if (route === '/' || route === '' || route === '/en') {
    // Toggle WebGL visible
    toggleWebGLVisibility(true);
    document.getElementById('layout-switch')?.classList.remove('is-hidden');
    renderHome();
  } else {
    // Toggle WebGL hidden on subpages (projects, works, studio, contacts)
    toggleWebGLVisibility(false);
    document.getElementById('layout-switch')?.classList.add('is-hidden');
    
    if (route.startsWith('/projects/')) {
      const slug = route.split('/projects/')[1];
      renderProjectDetail(slug);
    } else if (route === '/works') {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('view') === 'list') {
        worksViewMode = 'list';
      } else if (urlParams.get('view') === 'grid') {
        worksViewMode = 'grid';
      }
      renderWorks();
    } else if (route === '/studio') {
      renderStudio();
    } else if (route === '/contacts') {
      renderContacts();
    } else {
      // Fallback
      navigateTo('/');
    }
  }

  // Initialize text scroll reveal engine on current page
  initTextReveal(appPage, lenis);
  
  // Refresh scroll composition targets and Lenis scroll bounds
  refreshScrollComposition();
  lenis?.resize();
  setTimeout(() => lenis?.resize(), 120);
}

function updateNavState(route) {
  const links = document.querySelectorAll('.nav__link');
  links.forEach(l => l.classList.remove('is-active'));
  
  if (route === '/works') {
    document.querySelector('a[href="/works"]').classList.add('is-active');
  } else if (route === '/studio') {
    document.querySelector('a[href="/studio"]').classList.add('is-active');
  } else if (route === '/contacts') {
    document.querySelector('a[href="/contacts"]').classList.add('is-active');
  }
}

// Language Switcher (Hindi / English)
export function setLanguage(lang) {
  currentLang = lang;
  localStorage.setItem('k95_lang', lang);

  const hiBtn = document.getElementById('lang-hi');
  const enBtn = document.getElementById('lang-en');
  const mobHiBtn = document.getElementById('mobile-lang-hi');
  const mobEnBtn = document.getElementById('mobile-lang-en');

  if (lang === 'hi') {
    hiBtn?.classList.add('is-active');
    enBtn?.classList.remove('is-active');
    mobHiBtn?.classList.add('is-active');
    mobEnBtn?.classList.remove('is-active');
  } else {
    enBtn?.classList.add('is-active');
    hiBtn?.classList.remove('is-active');
    mobEnBtn?.classList.add('is-active');
    mobHiBtn?.classList.remove('is-active');
  }

  const t = translations[currentLang] || translations.en;
  const worksLink = document.getElementById('nav-link-works');
  const studioLink = document.getElementById('nav-link-studio');
  const contactsLink = document.getElementById('nav-link-contacts');
  if (worksLink) worksLink.textContent = t.nav_pics;
  if (studioLink) studioLink.textContent = t.nav_story;
  if (contactsLink) contactsLink.textContent = t.nav_contact;
  applySplitTextHovers();

  const mobWorksLink = document.getElementById('mobile-link-works');
  const mobStudioLink = document.getElementById('mobile-link-studio');
  const mobContactsLink = document.getElementById('mobile-link-contacts');
  if (mobWorksLink) mobWorksLink.textContent = t.nav_pics;
  if (mobStudioLink) mobStudioLink.textContent = t.nav_story;
  if (mobContactsLink) mobContactsLink.textContent = t.nav_contact;

  const btnRings = document.getElementById('btn-rings');
  const btnSpiral = document.getElementById('btn-spiral');
  if (btnRings) btnRings.textContent = t.btn_rings;
  if (btnSpiral) btnSpiral.textContent = t.btn_spiral;

  handleRoute(currentRoute);
}

// Render view templates
function renderHome() {
  const allCards = getAllCards();
  const t = translations[currentLang] || translations.en;
  const totalStr = String(allCards.length).padStart(2, '0');

  appPage.innerHTML = `
    <main class="home">
      <h1 class="home-h1">${t.home_h1}</h1>
      <footer class="home-footer is-revealed">
        <span class="home-footer__item">
          <span class="home-footer__line">${t.home_tag}</span>
        </span>
        <span class="home-footer__item home-footer__center">
          <span class="home-footer__line">
            <span id="focal-counter">01</span> / ${totalStr} <span style="opacity: 0.5;">${t.focal_label}</span> <a href="/works" class="home-footer__link" data-route>${t.nav_pics}</a>
          </span>
        </span>
        <span class="home-footer__item">
          <span class="home-footer__line">© 2026</span>
        </span>
      </footer>
    </main>
  `;
  bindRouterAnchors(appPage);
}

let worksViewMode = 'grid';
let worksFilter = 'all';
let isFilterMenuOpen = false;

function renderWorks() {
  const allCards = getAllCards();
  const t = translations[currentLang] || translations.en;

  // Dynamically collect unique categories from cards
  const distinctCats = new Set();
  allCards.forEach(c => {
    (c.categories || [c.category || 'Moments']).forEach(cat => {
      const name = typeof cat === 'string' ? cat.trim() : cat?.name;
      if (name && name.toLowerCase() !== 'branding') distinctCats.add(name);
    });
  });
  
  let validCategories = Array.from(distinctCats);
  if (validCategories.length === 0) {
    validCategories = ['Moments'];
  }

  const categoryList = validCategories.map(name => {
    const count = allCards.filter(c => {
      const cats = (c.categories || [c.category || 'Moments']).map(x => (typeof x === 'string' ? x : x?.name || '').toLowerCase());
      return cats.includes(name.toLowerCase());
    }).length;
    return {
      id: name.toLowerCase(),
      name: name.toUpperCase(),
      count: count
    };
  });

  // Filter cards for list view
  const filteredCards = worksFilter === 'all' 
    ? allCards 
    : allCards.filter(c => {
        const cats = (c.categories || [c.category || '']).map(x => x.toLowerCase());
        return cats.includes(worksFilter.toLowerCase());
      });

  appPage.innerHTML = `
    <main class="works is-${worksViewMode}-view ${isFilterMenuOpen ? 'is-filter-open' : ''}">
      <!-- Floating Controls Layer (Exact K95) -->
      <div class="works-controls-layer">
        <!-- Top View Switcher -->
        <div class="works-controls works-controls--top">
          <div class="works-view-switch ${worksViewMode === 'list' ? 'is-list-active' : ''}" id="works-view-switch">
            <span class="works-view-switch__pill" aria-hidden="true"></span>
            <button type="button" class="works-view-switch__btn ${worksViewMode === 'grid' ? 'is-active' : ''}" id="works-grid-btn">${t.grid || 'GRID'}</button>
            <button type="button" class="works-view-switch__btn ${worksViewMode === 'list' ? 'is-active' : ''}" id="works-list-btn">${t.list || 'LIST'}</button>
          </div>
        </div>

        <!-- Bottom Category Filter Pill (Exact K95 popup) -->
        <div class="works-controls works-controls--bottom">
          <div class="works-filter ${isFilterMenuOpen ? 'is-open' : ''}" id="works-filter-pill">
            <button type="button" class="works-filter__close" id="works-filter-close" aria-label="Close filters">✕</button>
            <button type="button" class="works-filter__btn ${worksFilter === 'all' ? 'is-active' : ''}" data-cat="all">
              <span class="works-filter__dot" aria-hidden="true"></span>
              <span class="works-filter__label">ALL <sup>(${allCards.length})</sup></span>
            </button>
            ${categoryList.map(cat => `
              <button type="button" class="works-filter__btn ${worksFilter === cat.id ? 'is-active' : ''}" data-cat="${cat.id}">
                <span class="works-filter__dot" aria-hidden="true"></span>
                <span class="works-filter__label">${cat.name} <sup>(${cat.count})</sup></span>
              </button>
            `).join('')}
          </div>
        </div>
      </div>

      <!-- 3D WebGL Grid Scene Wrapper (Exact K95 WorksScene) -->
      <div class="works-scene-wrap ${worksViewMode === 'list' ? 'is-scene-out' : ''}" id="works-scene-wrap"></div>

      <!-- Floating Hover Project Label (Exact K95) -->
      <div class="works-grid-hover-label" id="works-hover-label">
        <span class="works-grid-hover-label__dot"></span>
        <span id="works-hover-title"></span>
        <span class="works-grid-hover-label__tag" id="works-hover-tag"></span>
      </div>

      <!-- Typographic List View (Exact K95 WorksListView) -->
      <div class="works-view works-view--list" id="works-list-view" style="display: ${worksViewMode === 'list' ? 'block' : 'none'};"></div>
    </main>
  `;

  // Initialize Authentic K95 3D Grid Scene
  const sceneWrap = document.getElementById('works-scene-wrap');
  const hoverLabel = document.getElementById('works-hover-label');
  const hoverTitle = document.getElementById('works-hover-title');
  const hoverTag = document.getElementById('works-hover-tag');
  const listViewEl = document.getElementById('works-list-view');
  const viewSwitchEl = document.getElementById('works-view-switch');

  function mountWorksList() {
    destroyWorksListView();
    initWorksListView({
      container: listViewEl,
      projects: allCards,
      filterCategory: worksFilter,
      onOpenProject: (proj) => {
        navigateTo(`/projects/${proj.slug}`);
      }
    });
    lenis?.resize();
    setTimeout(() => lenis?.resize(), 100);
  }

  initWorksScene(
    sceneWrap,
    allCards,
    (proj) => {
      navigateTo(`/projects/${proj.slug}`);
    },
    (hoveredProj) => {
      if (hoveredProj && worksViewMode === 'grid') {
        hoverTitle.textContent = hoveredProj.title;
        hoverTag.textContent = (hoveredProj.categories && hoveredProj.categories[0]?.name) || hoveredProj.category || hoveredProj.note || '';
        hoverLabel.classList.add('is-visible');
      } else {
        hoverLabel.classList.remove('is-visible');
      }
    }
  );

  setWorksFilter(worksFilter);
  setWorksViewMode(worksViewMode);

  if (worksViewMode === 'list') {
    mountWorksList();
  }

  // Bind View Switchers (Grid vs List)
  const gridBtn = document.getElementById('works-grid-btn');
  const listBtn = document.getElementById('works-list-btn');

  const worksMainEl = document.querySelector('main.works');

  gridBtn?.addEventListener('click', () => {
    if (worksViewMode !== 'grid') {
      worksViewMode = 'grid';
      window.history.pushState({ view: 'grid' }, '', '/works');
      setWorksViewMode('grid');
      worksMainEl?.classList.remove('is-list-view');
      worksMainEl?.classList.add('is-grid-view');
      sceneWrap.classList.remove('is-scene-out');
      listViewEl.style.display = 'none';
      gridBtn.classList.add('is-active');
      listBtn.classList.remove('is-active');
      viewSwitchEl.classList.remove('is-list-active');
      destroyWorksListView();
      window.scrollTo(0, 0);
      lenis?.scrollTo(0, { immediate: true });
      lenis?.resize();
    }
  });

  listBtn?.addEventListener('click', () => {
    if (worksViewMode !== 'list') {
      worksViewMode = 'list';
      window.history.pushState({ view: 'list' }, '', '/works?view=list');
      setWorksViewMode('list');
      worksMainEl?.classList.remove('is-grid-view');
      worksMainEl?.classList.add('is-list-view');
      sceneWrap.classList.add('is-scene-out');
      listViewEl.style.display = 'block';
      listBtn.classList.add('is-active');
      gridBtn.classList.remove('is-active');
      viewSwitchEl.classList.add('is-list-active');
      hoverLabel.classList.remove('is-visible');
      mountWorksList();
    }
  });



  // Bind Filter Pill & Dropdown
  const filterPill = document.getElementById('works-filter-pill');
  const filterClose = document.getElementById('works-filter-close');
  const filterButtons = document.querySelectorAll('.works-filter__btn');

  filterPill?.addEventListener('click', (e) => {
    if (!isFilterMenuOpen && !e.target.closest('.works-filter__close')) {
      isFilterMenuOpen = true;
      filterPill.classList.add('is-open');
    }
  });

  filterClose?.addEventListener('click', (e) => {
    e.stopPropagation();
    isFilterMenuOpen = false;
    filterPill.classList.remove('is-open');
  });

  filterButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const cat = btn.getAttribute('data-cat');
      worksFilter = cat;
      isFilterMenuOpen = false;
      filterPill.classList.remove('is-open');

      // Update 3D Grid Filter
      setWorksFilter(worksFilter);

      // Update button active state
      filterButtons.forEach(b => b.classList.remove('is-active'));
      btn.classList.add('is-active');

      // Update List View Filter
      setWorksListFilter(worksFilter);
      lenis?.resize();
      setTimeout(() => lenis?.resize(), 100);
    });
  });

  bindRouterAnchors(appPage);
}

function renderStudio() {
  const t = translations[currentLang] || translations.en;
  const titleText = t.nav_story || 'STORY';

  appPage.innerHTML = `
    <main class="studio">
      <!-- Section 1: 100vh Studio Hero with 3D Chrome Model & Giant Kinetic Title (Exact K95) -->
      <section class="studio-hero" id="studio-hero">
        <div class="studio-hero__title-wrap" id="studio-title-wrap">
          <div class="studio-hero__h1-wrap">
            <h1 class="studio-hero__line">${buildContactCharsHtml(titleText)}</h1>
          </div>
          <div class="studio-hero__scroll-label" id="studio-scroll-label">SCROLL</div>
        </div>

        <div class="studio-hero__footer">
          <span>BASED IN INDIA</span>
          <span>SINCE JUNE 4, 2025</span>
          <span>ARCHIVE AND FAN TRIBUTE</span>
        </div>
      </section>

      <!-- Section 2: Fan Tribute Narrative Intro -->
      <section class="studio-intro grid">
        <h2 class="studio-hero__label label_info col-4">${studio.subtitle}</h2>
        <div class="studio-hero__body col-6 col-start-6">
          ${studio.leadStory.map(p => `<p>${p}</p>`).join('')}
        </div>
      </section>

      <!-- Section 2: Inverted Cook/Philosophy Section with Staggered Kinetic Typography -->
      <section class="studio-cook">
        <div class="studio-cook__headline">
          <div class="studio-cook__headline-top">
            <div class="studio-cook__pair studio-cook__pair--how">
              <span class="studio-cook__word">${studio.headlineTop.word1}</span>
              <span class="studio-cook__sub">${studio.headlineTop.sub1}</span>
            </div>
            <div class="studio-cook__pair studio-cook__pair--studio">
              <span class="studio-cook__sub">${studio.headlineTop.sub2}</span>
              <span class="studio-cook__word">${studio.headlineTop.word2}</span>
            </div>
          </div>
          <div class="studio-cook__headline-bottom">
            <div class="studio-cook__pair studio-cook__pair--cook">
              <span class="studio-cook__word">${studio.headlineBottom.word}</span>
              <span class="studio-cook__sub">${studio.headlineBottom.sub}</span>
            </div>
          </div>
        </div>

        <div class="studio-cook__content grid">
          <figure class="studio-cook__img studio-cook__img--1 col-4">
            <img src="${studio.image || '/assets/images/pic_1788018245147_1.png'}" alt="Palak Silawat - Story" loading="lazy">
          </figure>
          <div class="studio-cook__body col-6 col-start-6">
            ${Array.isArray(studio.cookStory) ? studio.cookStory.map(p => `<p>${p}</p>`).join('') : `<p>${studio.cookStory}</p>`}
          </div>
        </div>

        <!-- Chapters / Highlights Accordion -->
        <section class="studio-services">
          <h2 class="studio-services__title">CHAPTERS</h2>
          <div class="studio-services__table">
            ${studio.chapters.map((ch, idx) => `
              <article class="studio-services__row ${idx === 0 ? 'is-open' : ''}" data-chapter-idx="${idx}">
                <h3 class="studio-services__name">
                  <span>${ch.title}</span>
                  <span class="studio-services__toggle"></span>
                </h3>
                <div class="studio-services__description">
                  <div class="studio-services__description-inner">
                    <p>${ch.desc}</p>
                  </div>
                </div>
              </article>
            `).join('')}
          </div>
        </section>
      </section>

      <!-- Section 3: Milestones Timeline Table -->
      <section class="studio-awards">
        <h2 class="studio-awards__title">MILESTONES</h2>
        <div class="studio-awards__table">
          ${studio.milestones.map(m => `
            <article class="studio-awards__row">
              <p class="studio-awards__cell studio-awards__project">${m.project}</p>
              <p class="studio-awards__cell studio-awards__award">${m.event}</p>
              <p class="studio-awards__cell studio-awards__company">${m.entity}</p>
              <p class="studio-awards__cell studio-awards__year">${m.year}</p>
            </article>
          `).join('')}
        </div>
      </section>

      <!-- Authentic Dark Footer -->
      ${renderFooterHtml()}
    </main>
  `;

  // Accordion Toggle Handlers
  const rows = appPage.querySelectorAll('.studio-services__row');
  rows.forEach(row => {
    row.addEventListener('click', () => {
      const wasOpen = row.classList.contains('is-open');
      rows.forEach(r => r.classList.remove('is-open'));
      if (!wasOpen) {
        row.classList.add('is-open');
      }
      lenis?.resize();
    });
  });

  // Interactive Cursor Scroll Label
  const titleWrap = document.getElementById('studio-title-wrap');
  const scrollLabel = document.getElementById('studio-scroll-label');
  if (titleWrap && scrollLabel) {
    let mouseX = 0;
    let mouseY = 0;
    let labelX = 0;
    let labelY = 0;
    let labelRaf = null;

    function updateLabelPos() {
      labelX += (mouseX - labelX) * 0.14;
      labelY += (mouseY - labelY) * 0.14;
      scrollLabel.style.left = `${labelX + 28}px`;
      scrollLabel.style.top = `${labelY - 18}px`;
      labelRaf = requestAnimationFrame(updateLabelPos);
    }

    titleWrap.addEventListener('mousemove', (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    });

    titleWrap.addEventListener('mouseenter', (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      labelX = mouseX;
      labelY = mouseY;
      scrollLabel.style.left = `${labelX + 28}px`;
      scrollLabel.style.top = `${labelY - 18}px`;
      scrollLabel.classList.add('is-visible');
      if (!labelRaf) updateLabelPos();
    });

    titleWrap.addEventListener('mouseleave', () => {
      scrollLabel.classList.remove('is-visible');
      if (labelRaf) {
        cancelAnimationFrame(labelRaf);
        labelRaf = null;
      }
    });
  }

  setTimeout(() => {
    appPage.querySelector('.studio')?.classList.add('is-revealed');
  }, 80);

  bindRouterAnchors(appPage);
}

function rollChars(str) {
  return Array.from(str).map((char, i) => {
    const c = char === ' ' ? '&nbsp;' : char;
    return `<span class="footer-link-char" style="--i:${i}"><span class="char-top">${c}</span><span class="char-bot" aria-hidden="true">${c}</span></span>`;
  }).join('');
}

function buildContactCharsHtml(text) {
  return Array.from(text).map((char, i) => {
    const c = char === ' ' ? '&nbsp;' : char;
    return `<span class="gsap-char-reveal-wrap"><span class="gsap-char-reveal" style="--char-idx:${i};" data-char-idx="${i}">${c}</span></span>`;
  }).join('');
}

function renderContacts() {
  const t = translations[currentLang] || translations.en;
  const titleText = t.nav_contact || 'CONTACT';

  appPage.innerHTML = `
    <main class="contacts">
      <!-- Contact Hero Section with Huge Typography & Kinetic Cursor Scroll -->
      <section class="contacts-hero">
        <div class="contacts-hero__title-wrap" id="contacts-title-wrap">
          <div class="contacts-hero__h1-wrap">
            <h1 class="contacts-hero__line">${buildContactCharsHtml(titleText)}</h1>
          </div>
          <div class="contacts-hero__scroll-label" id="contacts-scroll-label">SCROLL</div>
        </div>
      </section>

      <!-- Authentic Dark Studio Footer with Pippo Styles & Palak Silawat -->
      <footer class="studio-footer studio-footer--dark">
        <div class="studio-footer__grid">
          <div class="studio-footer__contact">
            <span class="contacts-label">DIRECT INSTAGRAM</span>
            <a class="studio-footer__hero-link" href="https://instagram.com/pippostyles" target="_blank" rel="noopener noreferrer">
              ${rollChars('@pippostyles')}
            </a>
            <div class="studio-footer__creator-tag">
              for the love of <a href="https://instagram.com/palaksilawat" target="_blank" rel="noopener noreferrer">@palaksilawat</a>
            </div>
          </div>

          <div class="studio-footer__nav">
            <span class="contacts-label">MENU</span>
            <ul class="studio-footer__menu">
              <li><a href="/" data-route class="studio-footer__menu-link">${rollChars(t.nav_home || 'Home')}</a></li>
              <li><a href="/works" data-route class="studio-footer__menu-link">${rollChars(t.nav_pics || 'All Pics')}</a></li>
              <li><a href="/studio" data-route class="studio-footer__menu-link">${rollChars(t.nav_story || 'Story')}</a></li>
              <li><a href="/contacts" data-route class="studio-footer__menu-link is-active">${rollChars(t.nav_contact || 'Contact')}</a></li>
            </ul>
          </div>

          <div class="studio-footer__meta">
            <div class="studio-footer__meta-row">
              <span class="studio-footer__meta-label">CONNECT ON INSTAGRAM</span>
              <p class="studio-footer__meta-content">
                <a href="https://instagram.com/pippostyles" target="_blank" rel="noopener noreferrer">@pippostyles (Creator)</a><br>
                <a href="https://instagram.com/palaksilawat" target="_blank" rel="noopener noreferrer">@palaksilawat (Influencer)</a>
              </p>
            </div>
            <div class="studio-footer__meta-row">
              <span class="studio-footer__meta-label">LOCATION</span>
              <p class="studio-footer__meta-content">Based in India</p>
            </div>
          </div>
        </div>

        <div class="studio-footer__bottom-row">
          <span>© 2026 Dedicated to Palak Silawat</span>
          <span>Curated by pippostyles</span>
        </div>

        <div class="studio-footer__giant-logo" aria-hidden="true">
          <svg viewBox="0 0 90 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 0H12.95L20.57 15.62L28.19 0H41.14V31.25H28.19V15.62L20.57 31.25L12.95 15.62V31.25H0V0ZM48 0H60.95L68.57 15.62L76.19 0H89.14V31.25H76.19V15.62L68.57 31.25L60.95 15.62V31.25H48V0Z" fill="currentColor"/>
          </svg>
        </div>
      </footer>
    </main>
  `;

  const contactsMain = appPage.querySelector('.contacts');

  // Trigger entrance character reveal animation
  requestAnimationFrame(() => {
    if (contactsMain) contactsMain.classList.add('is-revealed');
  });

  // Interactive Cursor Scroll Label
  const titleWrap = document.getElementById('contacts-title-wrap');
  const scrollLabel = document.getElementById('contacts-scroll-label');
  if (titleWrap && scrollLabel) {
    let mouseX = 0;
    let mouseY = 0;
    let labelX = 0;
    let labelY = 0;
    let labelRaf = null;

    function updateLabelPos() {
      labelX += (mouseX - labelX) * 0.14;
      labelY += (mouseY - labelY) * 0.14;
      scrollLabel.style.left = `${labelX + 28}px`;
      scrollLabel.style.top = `${labelY - 18}px`;
      labelRaf = requestAnimationFrame(updateLabelPos);
    }

    titleWrap.addEventListener('mousemove', (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    });

    titleWrap.addEventListener('mouseenter', (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      labelX = mouseX;
      labelY = mouseY;
      scrollLabel.style.left = `${labelX + 28}px`;
      scrollLabel.style.top = `${labelY - 18}px`;
      scrollLabel.classList.add('is-visible');
      if (!labelRaf) updateLabelPos();
    });

    titleWrap.addEventListener('mouseleave', () => {
      scrollLabel.classList.remove('is-visible');
      if (labelRaf) {
        cancelAnimationFrame(labelRaf);
        labelRaf = null;
      }
    });
  }

  bindRouterAnchors(appPage);
}

function buildAnimatedTitleHtml(title) {
  let charCount = 0;
  const words = title.split(' ');
  return words.map(word => {
    const chars = word.split('').map(c => {
      const idx = charCount++;
      return `<span class="title-char-mask"><span class="title-char" style="--char-i:${idx};">${c}</span></span>`;
    }).join('');
    return `<span class="title-word">${chars}</span>`;
  }).join('<span class="title-space">&nbsp;</span>');
}

function showToastNotification(msg) {
  let toast = document.getElementById('app-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'app-toast';
    toast.className = 'toast-notification';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.add('is-visible');
  setTimeout(() => {
    toast.classList.remove('is-visible');
  }, 2800);
}

async function renderProjectDetail(slug) {
  let currentCards = getAllCards();
  if (currentCards.length === 0) {
    try {
      const res = await fetch('/api/cards').catch(() => fetch('/cards.json'));
      const d = await res.json();
      const list = Array.isArray(d) ? d : (d.cards || []);
      if (list.length > 0) {
        setAllCards(list);
        currentCards = list;
      }
    } catch (e) {
      try {
        const res2 = await fetch('/cards.json');
        const list2 = await res2.json();
        if (Array.isArray(list2) && list2.length > 0) {
          setAllCards(list2);
          currentCards = list2;
        }
      } catch (err) {}
    }
  }
  const t = translations[currentLang] || translations.en;
  let currentIndex = currentCards.findIndex(item => item.slug === slug || item.id === slug || String(item.id).includes(slug));
  if (currentIndex === -1) {
    if (currentCards.length > 0) {
      currentIndex = 0;
    } else {
      navigateTo('/works');
      return;
    }
  }
  const p = currentCards[currentIndex];
  const nextProject = currentCards[(currentIndex + 1) % currentCards.length];
  
  // Use sequential photos from site's first 20 pics for rich project galleries
  const imgA = currentCards[(currentIndex + 1) % currentCards.length]?.image || p.image;
  const imgB = currentCards[(currentIndex + 2) % currentCards.length]?.image || p.image;
  const imgC = currentCards[(currentIndex + 3) % currentCards.length]?.image || p.image;
  const imgD = currentCards[(currentIndex + 4) % currentCards.length]?.image || p.image;

  appPage.innerHTML = `
    <main class="project">
      <!-- 1. K95 Authentic 3-Column Hero Row -->
      <section class="hero__row">
        <div class="hero__col hero__col--title">
          <div class="hero__nav-breadcrumb">
            <a href="/" class="contacts-label" data-route style="display: inline-flex; align-items: center; gap: 8px;">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M11 7H3M3 7L7 3M3 7L7 11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              <span>${t.back_to_space || 'Space'}</span>
            </a>
            <span style="opacity: 0.3;">/</span>
            <a href="/works" class="contacts-label" data-route>
              <span>${t.nav_pics || 'All Pics'}</span>
            </a>
          </div>
          <h1 class="hero__title">${p.title}</h1>
        </div>

        <div class="hero__col hero__col--cover">
          <div class="hero__panel">
            <img src="${p.image || p.imageSmall}" alt="${p.title}" class="hero__panel-img" fetchpriority="high">
          </div>
        </div>

        <div class="hero__col hero__col--year">
          <div class="hero__year">Year ${p.year || '2026'}</div>
        </div>
      </section>

      <!-- 2. K95 12-Column Info Section -->
      <section class="info">
        <div class="info__left">
          <div class="info__categories">
            <h3 class="info__label">Categories</h3>
            <div>
              <a href="/works" class="info__category" data-hover data-route>
                <span class="cat-wave">${rollChars(p.category || 'Moments')}</span>
              </a>
            </div>
          </div>
        </div>

        <div class="info__roles">
          <h3 class="info__label">Collection</h3>
          <ul class="info__roles-list">
            <li>Moments</li>
            <li>Appearances</li>
            <li>Memories and Current</li>
          </ul>
        </div>

        <div class="info__right">
          <section class="description">
            <div class="rich-text description__text">
              <p><span class="description__inline-label">(PHOTO ARCHIVE)</span> ${(p.summary && !p.summary.includes('pippostyles archive') && !p.summary.includes('curated visual moment')) ? p.summary : 'A collection of moments, photographs, and memories kept here, one frame at a time.'}</p>
            </div>
          </section>
        </div>
      </section>

      <!-- 3. K95 Light Gray Concept Showcase Section (Full Uncropped Picture of THIS card) -->
      <section class="project-media-sections">
        <div class="media-block--grey">
          <div class="media-card--large">
            <img src="${p.image || p.imageSmall}" alt="${p.title} - Full Picture" loading="lazy">
          </div>
          <div class="concept-text-container">
            <p>${(p.note && p.note !== 'Direct from heart') ? p.note : 'just another moment.'}</p>
          </div>
        </div>

        <!-- 4. Full-Width Billboard Showcase (Full High-Resolution Display of THIS photo) -->
        <div class="media-block--fullwidth">
          <div class="media-card--billboard">
            <img src="${p.image || p.imageSmall}" alt="${p.title} - Full High Resolution" loading="lazy">
          </div>
        </div>

      </section>

      <!-- 6. Next Pic Mirror Row -->
      <a href="/projects/${nextProject.slug}" class="next-project-container" data-route>
        <div class="hero__col--title">
          <span class="info__label">${t.next_memory || 'Next Pic'}</span>
          <h3 class="next-project-title">${nextProject.title}</h3>
        </div>
        <div class="hero__col--cover">
          <div class="hero-media-wrapper">
            <img src="${nextProject.image || nextProject.imageSmall}" class="next__img" alt="${nextProject.title}">
          </div>
        </div>
        <div class="hero__col--year">
          <span class="next-project-link">${t.view_pic || 'View Pic'}</span>
        </div>
      </a>
    </main>
  `;
  bindRouterAnchors(appPage);



  // GSAP Opening Animations for Hero Card & Typographic Elements
  if (typeof gsap !== 'undefined') {
    gsap.fromTo('.hero__panel', 
      { scale: 0.88, opacity: 0, y: 35 },
      { scale: 1.0, opacity: 1, y: 0, duration: 1.2, ease: "power3.out" }
    );
    gsap.fromTo('.hero__title',
      { y: 50, opacity: 0 },
      { y: 0, opacity: 1, duration: 1.0, ease: "power3.out", delay: 0.12 }
    );
    gsap.fromTo('.hero__year',
      { x: 30, opacity: 0 },
      { x: 0, opacity: 1, duration: 0.9, ease: "power3.out", delay: 0.18 }
    );
    gsap.fromTo('.info',
      { y: 40, opacity: 0 },
      { y: 0, opacity: 1, duration: 1.0, ease: "power2.out", delay: 0.25 }
    );
  }
}

function renderFooterHtml() {
  return `
    <footer class="studio-footer studio-footer--dark">
      <div class="studio-footer__grid">
        <div class="studio-footer__contact">
          <span class="contacts-label">DIRECT INSTAGRAM</span>
          <a href="https://instagram.com/pippostyles" target="_blank" rel="noopener noreferrer" class="studio-footer__hero-link">
            ${rollChars('@pippostyles')}
          </a>
          <div class="studio-footer__creator-tag">
            for the love of <a href="https://instagram.com/palaksilawat" target="_blank" rel="noopener noreferrer">@palaksilawat</a>
          </div>
        </div>
        <div class="studio-footer__nav">
          <span class="contacts-label">MENU</span>
          <ul class="studio-footer__menu">
            <li><a href="/" data-route class="studio-footer__menu-link">${rollChars('Home')}</a></li>
            <li><a href="/works" data-route class="studio-footer__menu-link">${rollChars('All Pics')}</a></li>
            <li><a href="/studio" data-route class="studio-footer__menu-link">${rollChars('Story')}</a></li>
            <li><a href="/contacts" data-route class="studio-footer__menu-link">${rollChars('Contact')}</a></li>
          </ul>
        </div>
        <div class="studio-footer__meta">
          <div class="studio-footer__meta-row">
            <span class="studio-footer__meta-label">CONNECT ON INSTAGRAM</span>
            <p class="studio-footer__meta-content">
              <a href="https://instagram.com/pippostyles" target="_blank" rel="noopener noreferrer">@pippostyles (Creator)</a><br>
              <a href="https://instagram.com/palaksilawat" target="_blank" rel="noopener noreferrer">@palaksilawat (Influencer)</a>
            </p>
          </div>
          <div class="studio-footer__meta-row">
            <span class="studio-footer__meta-label">LOCATION</span>
            <p class="studio-footer__meta-content">Based in India</p>
          </div>
        </div>
      </div>
      <div class="studio-footer__bottom-row" style="display: flex; flex-wrap: wrap; justify-content: space-between; gap: 12px; font-size: 0.85rem; opacity: 0.7;">
        <span>© 2026 Dedicated to Palak Silawat, Curated by pippostyles</span>
        <span>This is a fan made project and is not officially affiliated with palaksilawat.</span>
      </div>
    </footer>
  `;
}

// Intercept clicks on links for smooth client-side routing
function bindRouterAnchors(container) {
  const anchors = container.querySelectorAll('a[data-route]');
  anchors.forEach(a => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      const href = a.getAttribute('href');
      navigateTo(href);
    });
  });
}

// Bind navigation clicks
function setupGlobalNav() {
  const anchors = document.querySelectorAll('a[data-route]');
  anchors.forEach(a => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      const href = a.getAttribute('href');
      navigateTo(href);
    });
  });
  
  // Rings vs Spiral WebGL switch buttons
  const ringsBtn = document.getElementById('btn-rings');
  const spiralBtn = document.getElementById('btn-spiral');
  const switcher = document.getElementById('layout-switch');
  
  ringsBtn.addEventListener('click', () => {
    ringsBtn.classList.add('is-active');
    spiralBtn.classList.remove('is-active');
    switcher.classList.remove('is-spiral');
    setWebGLLayout('rings');
  });
  
  spiralBtn.addEventListener('click', () => {
    spiralBtn.classList.add('is-active');
    ringsBtn.classList.remove('is-active');
    switcher.classList.add('is-spiral');
    setWebGLLayout('spiral');
  });
  
  // Mobile Menu Toggle & Fullscreen Overlay
  const menuToggleBtn = document.getElementById('menu-toggle-btn');
  const mobileOverlay = document.getElementById('mobile-overlay');
  
  if (menuToggleBtn && mobileOverlay) {
    function toggleMobileMenu(forceState) {
      const isOpen = typeof forceState === 'boolean' ? forceState : !menuToggleBtn.classList.contains('is-open');
      menuToggleBtn.classList.toggle('is-open', isOpen);
      mobileOverlay.classList.toggle('is-open', isOpen);
      document.body.classList.toggle('mobile-menu-open', isOpen);
      document.documentElement.classList.toggle('mobile-menu-open', isOpen);
      mobileOverlay.setAttribute('aria-hidden', (!isOpen).toString());
    }

    menuToggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleMobileMenu();
    });

    // Close mobile menu on overlay link click
    const mobileLinks = mobileOverlay.querySelectorAll('.nav__mobile-link');
    mobileLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const href = link.getAttribute('href');
        toggleMobileMenu(false);
        navigateTo(href);
      });
    });

    // Mobile Language Switch buttons
    const mobLangHi = document.getElementById('mobile-lang-hi');
    const mobLangEn = document.getElementById('mobile-lang-en');
    mobLangHi?.addEventListener('click', () => {
      setLanguage('hi');
      toggleMobileMenu(false);
    });
    mobLangEn?.addEventListener('click', () => {
      setLanguage('en');
      toggleMobileMenu(false);
    });
  }

  // Language Switch buttons (HI / EN)
  const langHiBtn = document.getElementById('lang-hi');
  const langEnBtn = document.getElementById('lang-en');
  
  langHiBtn?.addEventListener('click', () => setLanguage('hi'));
  langEnBtn?.addEventListener('click', () => setLanguage('en'));



  // POPSTATE back/forward handler
  window.addEventListener('popstate', () => {
    handleRoute(window.location.pathname);
  });
}

// Real-Time Server-Sent Events (SSE) Mobile Photo Sync
async function initRealtimeSync() {
  window.renderWorksPage = () => {
    if (currentRoute === '/works') renderWorks();
  };

  // 1. Initial Load from server
  try {
    const res = await fetch('/api/cards').catch(() => fetch('/cards.json'));
    const data = await res.json();
    const list = Array.isArray(data) ? data : (data.cards || []);
    if (list.length > 0) {
      setAllCards(list);
      rebuildCylinderPanels();
      if (currentRoute === '/works') {
        renderWorks();
      }
    }
  } catch (e) {
    try {
      const res2 = await fetch('/cards.json');
      const list2 = await res2.json();
      if (Array.isArray(list2) && list2.length > 0) {
        setAllCards(list2);
        rebuildCylinderPanels();
        if (currentRoute === '/works') renderWorks();
      }
    } catch (err) {}
  }

  // 2. Real-time SSE stream
  try {
    const evtSource = new EventSource('/api/events');
    
    evtSource.addEventListener('new-cards', (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.allCards) {
          setAllCards(data.allCards);
        } else if (data.cards) {
          data.cards.forEach(card => addNewCard(card));
        }
        rebuildCylinderPanels();
        updateWorksProjects(getAllCards());
        updateWorksListProjects(getAllCards());
        showLiveToast(`Received ${data.cards ? data.cards.length : 1} photo(s) from mobile`);
        if (currentRoute === '/works') {
          renderWorks();
        }
      } catch (err) {}
    });

    evtSource.addEventListener('cards-updated', (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.cards) {
          setAllCards(data.cards);
          rebuildCylinderPanels();
          updateWorksProjects(getAllCards());
          updateWorksListProjects(getAllCards());
          if (currentRoute === '/works') {
            renderWorks();
          }
        }
      } catch (err) {}
    });

    evtSource.addEventListener('cards-cleared', () => {
      setAllCards([]);
      rebuildCylinderPanels();
      updateWorksProjects([]);
      updateWorksListProjects([]);
      if (currentRoute === '/works') {
        renderWorks();
      }
      showLiveToast('All cards cleared');
    });
  } catch (err) {}
}

function showLiveToast(msg) {
  let toast = document.getElementById('app-live-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'app-live-toast';
    toast.style.cssText = `
      position: fixed;
      bottom: 80px;
      left: 50%;
      transform: translateX(-50%);
      background: #1500E1;
      color: #fff;
      padding: 12px 24px;
      border-radius: 999px;
      font-size: 14px;
      font-weight: 700;
      box-shadow: 0 10px 30px rgba(0,0,0,0.6);
      z-index: 99999;
      display: flex;
      align-items: center;
      gap: 10px;
    `;
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.style.display = 'flex';
  clearTimeout(toast._t);
  toast._t = setTimeout(() => { toast.style.display = 'none'; }, 4000);
}

// ==========================================================================
// APP INITIALIZATION BOOTSTRAP
// ==========================================================================
function initApp() {
  // Pre-split links for animations
  applySplitTextHovers();
  
  // Init Smooth scroll
  initSmoothScroll();
  
  // Init custom cursor
  initCustomCursor();
  
  // Setup Router listeners
  setupGlobalNav();
  


  // Initialize WebGL Scene immediately
  const canvas = document.getElementById('webgl-canvas');
  if (canvas) {
    initWebGL(
      canvas, 
      (project) => {
        if (project && project.slug) {
          navigateTo(`/projects/${project.slug}`);
        }
      },
      (focalIndex, total, focalProject) => {
        updateFocalCounter(focalIndex, total);
      }
    );
  }

  // Initialize Real-time iPhone Live Sync in background
  initRealtimeSync().catch(() => {});
  
  // Start preloader sequence immediately
  startPreloader();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

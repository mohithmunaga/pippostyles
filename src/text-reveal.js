// ==========================================================================
// K95 KINETIC TEXT SCROLL REVEAL ENGINE (text-reveal.js)
// Replicates the iconic K95 scroll-linked typography reveal physics:
// - Character / Word / Line splitting with overflow masks
// - Cascading upward slide-in from bottom (translateY 115% -> 0%) on scroll up
// - Dynamic scroll direction reactivity
// ==========================================================================

let observer = null;
let activeTargets = [];
let lastScrollY = window.scrollY;
let scrollDirection = 'down';
let lenisUnsub = null;

export function splitTextToChars(el) {
  if (!el) return;
  if (el.querySelector('.gsap-char-reveal')) {
    el.dataset.splitDone = 'true';
    return;
  }
  if (el.dataset.splitDone) return;
  const rawText = el.textContent.trim();
  if (!rawText) return;

  el.dataset.splitDone = 'true';
  const words = rawText.split(/\s+/);
  let globalCharIdx = 0;

  const html = words.map(word => {
    const charsHtml = Array.from(word).map(char => {
      const idx = globalCharIdx++;
      return `<span class="gsap-char-reveal-wrap"><span class="gsap-char-reveal" style="--char-idx: ${idx};" data-char-idx="${idx}">${char}</span></span>`;
    }).join('');
    return `<span class="gsap-char-reveal-word">${charsHtml}</span>`;
  }).join('<span class="gsap-char-reveal-space">&nbsp;</span>');

  el.innerHTML = html;
}

export function splitTextToWords(el) {
  if (!el) return;
  if (el.querySelector('.gsap-word-reveal')) {
    el.dataset.splitDone = 'true';
    return;
  }
  if (el.dataset.splitDone) return;
  const rawText = el.textContent.trim();
  if (!rawText) return;

  el.dataset.splitDone = 'true';
  const words = rawText.split(/\s+/);

  const html = words.map((word, idx) => {
    return `<span class="gsap-word-reveal-wrap"><span class="gsap-word-reveal" style="--word-idx: ${idx};" data-word-idx="${idx}">${word}</span></span>`;
  }).join(' ');

  el.innerHTML = html;
}

export function splitTextToLines(el) {
  if (!el) return;
  if (el.querySelector('.gsap-line-reveal')) {
    el.dataset.splitDone = 'true';
    return;
  }
  if (el.dataset.splitDone) return;
  el.dataset.splitDone = 'true';
  const paragraphs = el.querySelectorAll('p');
  if (paragraphs.length > 0) {
    paragraphs.forEach((p, idx) => {
      const content = p.innerHTML;
      p.innerHTML = `<span class="gsap-line-reveal-wrap"><span class="gsap-line-reveal" style="--line-idx: ${idx};">${content}</span></span>`;
    });
  } else {
    const content = el.innerHTML;
    el.innerHTML = `<span class="gsap-line-reveal-wrap"><span class="gsap-line-reveal" style="--line-idx: 0;">${content}</span></span>`;
  }
}

export function initTextReveal(container = document, lenisInstance = null) {
  destroyTextReveal();

  lastScrollY = window.scrollY;

  // Split targets if not already split
  const charTargets = Array.from(container.querySelectorAll('.studio-hero__line, .contacts-hero__line, [data-reveal="chars"]'));
  const wordTargets = Array.from(container.querySelectorAll('.studio-hero__label, .studio-cook__word, .studio-cook__sub, [data-reveal="words"]'));
  const lineTargets = Array.from(container.querySelectorAll('.studio-hero__body, .studio-cook__body, [data-reveal="lines"]'));

  charTargets.forEach(el => splitTextToChars(el));
  wordTargets.forEach(el => splitTextToWords(el));
  lineTargets.forEach(el => splitTextToLines(el));

  const allRevealContainers = Array.from(container.querySelectorAll(
    '.studio, .studio-hero, .studio-intro, .studio-cook, .studio-services, .studio-awards, .contacts, .contacts-hero, .contacts-info, [data-scroll-reveal]'
  ));

  activeTargets = allRevealContainers;

  // IntersectionObserver
  observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      const el = entry.target;
      if (entry.isIntersecting) {
        el.classList.remove('is-hidden-down');
        el.classList.add('is-revealed');
      } else {
        const rect = entry.boundingClientRect;
        if (rect.top > (window.innerHeight || 800) * 0.9) {
          el.classList.remove('is-revealed');
          el.classList.add('is-hidden-down');
        }
      }
    });
  }, {
    root: null,
    rootMargin: '10% 0px -5% 0px',
    threshold: [0, 0.1, 0.5]
  });

  activeTargets.forEach(el => {
    const rect = el.getBoundingClientRect();
    const vh = window.innerHeight || 800;
    if (rect.top < vh * 0.95 && rect.bottom > 0) {
      el.classList.add('is-revealed');
    } else {
      el.classList.add('is-hidden-down');
    }
    observer.observe(el);
  });

  // Track scroll direction & dynamic scroll-up cascade
  function handleScroll(scrollY) {
    const delta = scrollY - lastScrollY;
    lastScrollY = scrollY;

    if (Math.abs(delta) > 0.5) {
      scrollDirection = delta > 0 ? 'down' : 'up';
    }

    const vh = window.innerHeight || 800;

    activeTargets.forEach(el => {
      const rect = el.getBoundingClientRect();
      // If currently visible in viewport
      if (rect.top < vh * 0.92 && rect.bottom > 40) {
        if (!el.classList.contains('is-revealed')) {
          el.classList.remove('is-hidden-down');
          el.classList.add('is-revealed');
        }
      } else if (rect.top >= vh * 0.92) {
        // Scrolled down below viewport
        el.classList.remove('is-revealed');
        el.classList.add('is-hidden-down');
      }
    });
  }

  if (lenisInstance) {
    lenisUnsub = (e) => handleScroll(e.scroll);
    lenisInstance.on('scroll', lenisUnsub);
  } else {
    window.addEventListener('scroll', () => handleScroll(window.scrollY), { passive: true });
  }

  // Initial trigger
  setTimeout(() => {
    activeTargets.forEach(el => {
      const rect = el.getBoundingClientRect();
      if (rect.top < (window.innerHeight || 800)) {
        el.classList.remove('is-hidden-down');
        el.classList.add('is-revealed');
      }
    });
  }, 80);
}

export function destroyTextReveal() {
  if (observer) {
    observer.disconnect();
    observer = null;
  }
  if (lenisUnsub && window.lenis) {
    window.lenis.off('scroll', lenisUnsub);
    lenisUnsub = null;
  }
  activeTargets = [];
}

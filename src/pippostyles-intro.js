/**
 * ============================================================================
 * PIPPOSTYLES CINEMATIC LUXURY LOGO INTRO & ANIMATION ENGINE
 * Exactly replicating the luxury motion design & choreography of:
 * https://cdn.dribbble.com/userupload/4474505/file/original-be9c772bd2d5bd76ff923a3ec7b60684.mp4
 *
 * 5-Phase Choreography:
 * Phase 1 (0.0s - 0.75s):  Establishing center view of "pippostyles"
 * Phase 2 (0.75s - 3.2s):  Camera dives into colossal 'p' sweeping edge-to-edge
 * Phase 3 (3.2s - 5.6s):   Colossal geometric circle 'o' drifting across viewport
 * Phase 4 (5.6s - 8.0s):   Colossal fluid ribbon 's' sweeping corner-to-corner
 * Phase 5 (8.0s - 10.5s):  Grand slit-scan kinetic assembly, laser flare, sub-bass
 *                          snap impact, and seamless fusion into solid "pippostyles"
 *
 * Specs:
 * - Signature Electric Blue: HEX #1500E1
 * - Wordmark: strictly "pippostyles" (all small letters, no spaces, no slashes)
 * - Ultra-clean: ZERO clutter, ZERO badges, ZERO buttons
 * ============================================================================
 */

export class PippostylesIntro {
  constructor(options = {}) {
    this.container = options.container || document.body;
    this.onComplete = options.onComplete || (() => {});
    this.autoTransition = options.autoTransition === true;
    this.transitionDelay = options.transitionDelay !== undefined ? options.transitionDelay : 1000;
    this.soundEnabled = options.soundEnabled !== undefined ? options.soundEnabled : true;
    this.audioCtx = null;
    this.timeline = null;
    this.isFinished = false;
    this.isExiting = false;
    this.init();
  }

  init() {
    this.buildDOM();
    this.initAudio();
    this.bindEvents();
    this.play();
  }

  initAudio() {
    this.getAudioContext = () => {
      if (!this.audioCtx) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) {
          this.audioCtx = new AudioContext();
        }
      }
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
      return this.audioCtx;
    };
  }

  playWhoosh(pitch = 1.0, duration = 0.9) {
    if (!this.soundEnabled) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;
      const t = ctx.currentTime;

      const bufferSize = Math.floor(ctx.sampleRate * duration);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(130 * pitch, t);
      filter.frequency.exponentialRampToValueAtTime(1150 * pitch, t + duration * 0.45);
      filter.frequency.exponentialRampToValueAtTime(60 * pitch, t + duration);
      filter.Q.setValueAtTime(3.2, t);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.28, t + duration * 0.4);
      gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      noise.start(t);
      noise.stop(t + duration);
    } catch (e) {}
  }

  playSnap() {
    if (!this.soundEnabled) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;
      const t = ctx.currentTime;

      // Heavy sub bass punch
      const osc = ctx.createOscillator();
      const oscGain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(180, t);
      osc.frequency.exponentialRampToValueAtTime(26, t + 0.45);
      oscGain.gain.setValueAtTime(0.65, t);
      oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
      osc.connect(oscGain);
      oscGain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.45);

      // Crisp mechanical metallic snap click
      const clickOsc = ctx.createOscillator();
      const clickGain = ctx.createGain();
      clickOsc.type = 'triangle';
      clickOsc.frequency.setValueAtTime(2200, t);
      clickOsc.frequency.exponentialRampToValueAtTime(240, t + 0.05);
      clickGain.gain.setValueAtTime(0.5, t);
      clickGain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
      clickOsc.connect(clickGain);
      clickGain.connect(ctx.destination);
      clickOsc.start(t);
      clickOsc.stop(t + 0.05);
    } catch (e) {}
  }

  playMechanicalTick() {
    if (!this.soundEnabled) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1100, t);
      osc.frequency.exponentialRampToValueAtTime(170, t + 0.035);
      gain.gain.setValueAtTime(0.18, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.035);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.035);
    } catch (e) {}
  }

  playTypewriterKey() {
    if (!this.soundEnabled) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1400 + Math.random() * 250, t);
      osc.frequency.exponentialRampToValueAtTime(320, t + 0.022);
      gain.gain.setValueAtTime(0.065, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.022);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.022);
    } catch (e) {}
  }

  buildDOM() {
    const old = document.getElementById('pippostyles-intro-overlay');
    if (old) old.remove();

    this.root = document.createElement('div');
    this.root.id = 'pippostyles-intro-overlay';
    this.root.className = 'ps-intro';
    this.root.setAttribute('role', 'region');
    this.root.setAttribute('aria-label', 'pippostyles');

    const fullSentence = "Hi, welcome to the archive.";
    const charSpansHtml = fullSentence
      .split('')
      .map((ch, idx) => `<span class="ps-tc" id="ps-tc-${idx}">${ch === ' ' ? '&nbsp;' : ch}</span>`)
      .join('');

    // Cleanest screen: ONLY the electric blue background, typing stage, and pippostyles
    this.root.innerHTML = `
      <!-- Pure Electric Blue Background HEX #1500E1 -->
      <div class="ps-bg"></div>

      <!-- DIGITAL TYPEWRITER INTRO STAGE ("Hi, welcome to the archive.") -->
      <div class="ps-typing-stage" id="ps-typing-stage">
        <div class="ps-typing-wrapper">
          <span class="ps-typing-text" id="ps-typing-text">${charSpansHtml}</span><span class="ps-typing-cursor" id="ps-typing-cursor" aria-hidden="true"></span>
        </div>
      </div>

      <!-- MASTER STAGE: Strictly "pippostyles" name only (all lowercase, no animation) -->
      <div class="ps-master-stage" id="ps-master-stage">
        <div class="ps-wordmark" id="ps-wordmark">
          <div class="ps-solid ps-typography" id="ps-solid">pippostyles</div>
        </div>
      </div>
    `;

    this.container.appendChild(this.root);
  }

  bindEvents() {
    const handleTrigger = (e) => {
      if (this.isExiting) return;
      this.getAudioContext();
      if (this.autoTransition) {
        this.finishAndExit();
      } else {
        this.replay();
      }
    };

    this.root.addEventListener('click', handleTrigger);
    this.root.addEventListener('touchend', (e) => {
      e.preventDefault();
      handleTrigger(e);
    });

    window.addEventListener('keydown', (e) => {
      if ((e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') && this.autoTransition) {
        this.finishAndExit();
      }
    });
  }

  play() {
    const gsap = window.gsap;
    if (!gsap) {
      console.warn('[PippostylesIntro] GSAP not found');
      return;
    }

    const typingStage = this.root.querySelector('#ps-typing-stage');
    const typingCursor = this.root.querySelector('#ps-typing-cursor');
    const charSpans = this.root.querySelectorAll('.ps-tc');

    const masterStage = this.root.querySelector('#ps-master-stage');
    const solidWordmark = this.root.querySelector('#ps-solid');

    // Initial setup - Show typing stage with cursor, hide wordmark initially
    gsap.set(typingStage, { opacity: 1, y: 0, display: 'flex' });
    gsap.set(typingCursor, { opacity: 1, display: 'inline-block' });
    gsap.set(charSpans, { display: 'none' });

    gsap.set(masterStage, { opacity: 0 });
    gsap.set(solidWordmark, { opacity: 0 });

    this.timeline = gsap.timeline({
      onComplete: () => {
        this.isFinished = true;
        if (this.autoTransition) {
          this.autoTimer = setTimeout(() => {
            this.finishAndExit();
          }, this.transitionDelay);
        }
      }
    });

    const tl = this.timeline;

    // ========================================================================
    // STAGE 1: REALISTIC DIGITAL TYPEWRITER INTRO
    // "Hi, welcome to the archive."
    // - Character-by-character from left to right
    // - Natural typing rhythm with slight variations and punctuation pauses
    // - Subtle blinking cursor at end
    // - Zero letter bouncing, zero dramatic scaling, zero random motion
    // ========================================================================

    const fullSentence = "Hi, welcome to the archive.";
    // Natural typewriter delays per character (in seconds):
    const charDelays = [
      0.075, // 'H' (index 0)
      0.065, // 'i' (index 1)
      0.260, // ',' (index 2) -> Natural punctuation pause after comma
      0.070, // ' ' (index 3)
      0.080, // 'w' (index 4)
      0.055, // 'e' (index 5)
      0.050, // 'l' (index 6)
      0.065, // 'c' (index 7)
      0.055, // 'o' (index 8)
      0.070, // 'm' (index 9)
      0.055, // 'e' (index 10)
      0.075, // ' ' (index 11)
      0.060, // 't' (index 12)
      0.055, // 'o' (index 13)
      0.075, // ' ' (index 14)
      0.060, // 't' (index 15)
      0.055, // 'h' (index 16)
      0.050, // 'e' (index 17)
      0.075, // ' ' (index 18)
      0.070, // 'a' (index 19)
      0.055, // 'r' (index 20)
      0.065, // 'c' (index 21)
      0.060, // 'h' (index 22)
      0.050, // 'i' (index 23)
      0.070, // 'v' (index 24)
      0.055, // 'e' (index 25)
      0.240  // '.' (index 26) -> Period typed!
    ];

    let currentTypingTime = 0.28; // Subtle natural breath before first keystroke
    const charSchedule = [];
    for (let i = 0; i < fullSentence.length; i++) {
      charSchedule.push({
        time: currentTypingTime,
        index: i
      });
      currentTypingTime += charDelays[i];
    }

    const typingFinishedTime = currentTypingTime; // ~2.20s
    const holdUntilTime = typingFinishedTime + 0.90; // Hold completed sentence visible until ~3.10s
    const fadeOutDuration = 0.35;
    const typingExitTime = holdUntilTime + fadeOutDuration; // ~3.45s

    // 1. Reveal characters progressively on timeline with audio clicks
    charSchedule.forEach((item) => {
      const charEl = this.root.querySelector(`#ps-tc-${item.index}`);
      if (charEl) {
        tl.set(charEl, { display: 'inline' }, item.time);
      }
      tl.add(() => this.playTypewriterKey(), item.time);
    });

    // 2. Remove cursor at end of hold
    tl.set(typingCursor, { opacity: 0, display: 'none' }, holdUntilTime);

    // 3. Smooth fade-out of completed sentence
    tl.to(typingStage, {
      opacity: 0,
      y: -8,
      duration: fadeOutDuration,
      ease: 'power2.inOut'
    }, holdUntilTime);

    tl.set(typingStage, { display: 'none' }, typingExitTime);

    // ========================================================================
    // STAGE 2: PIPPOSTYLES NAME ONLY (NO ANIMATION OF THAT WORD)
    // Simply reveals the solid "pippostyles" name cleanly after typing intro.
    // Zero flying letters, zero letter flow, zero slit-scan, zero distortion.
    // ========================================================================
    tl.set(masterStage, { opacity: 1 }, typingExitTime);
    tl.to(solidWordmark, {
      opacity: 1,
      duration: 0.35,
      ease: 'power2.out'
    }, typingExitTime);
  }

  replay() {
    clearTimeout(this.autoTimer);
    this.isFinished = false;
    if (this.timeline) {
      this.timeline.restart();
    }
  }

  finishAndExit() {
    clearTimeout(this.autoTimer);
    if (this.isExiting) return;
    this.isExiting = true;

    document.body.classList.remove('has-intro');

    // Trigger 3D gallery reveal immediately as exit crossfade begins
    if (this.onComplete) {
      try { this.onComplete(); } catch (e) {}
    }

    const gsap = window.gsap;
    if (gsap && this.root) {
      gsap.to(this.root, {
        opacity: 0,
        duration: 0.65,
        ease: 'power2.inOut',
        onComplete: () => {
          try { this.root.remove(); } catch (e) {}
        }
      });
    } else {
      try { this.root.remove(); } catch (e) {}
    }
  }
}

// Global accessor
window.PippostylesIntro = PippostylesIntro;

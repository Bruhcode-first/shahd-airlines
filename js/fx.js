// Small shared effects: toast, emoji particles, confetti, shake, haptics, visibility.
import { gsap } from 'gsap';
import confetti from 'canvas-confetti';

const prefersReduced = () => {
  try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; }
};

/* ---------- toast ---------- */

let toastEl = null;
let toastTimer = 0;

export function toast(text, ms = 2600) {
  if (!toastEl) {
    toastEl = document.createElement('div');
    toastEl.className = 'toast';
    toastEl.setAttribute('role', 'status');
    toastEl.setAttribute('aria-live', 'polite');
    document.body.append(toastEl);
  }
  clearTimeout(toastTimer);
  gsap.killTweensOf(toastEl);
  toastEl.textContent = text;
  toastEl.hidden = false;
  gsap.set(toastEl, { xPercent: -50, x: 0 });
  if (prefersReduced()) {
    gsap.set(toastEl, { opacity: 1, y: 0, scale: 1 });
  } else {
    gsap.fromTo(toastEl, { opacity: 0, y: 24, scale: .92 }, { opacity: 1, y: 0, scale: 1, duration: .45, ease: 'back.out(1.8)' });
  }
  toastTimer = setTimeout(() => {
    gsap.to(toastEl, {
      opacity: 0, y: 16, duration: prefersReduced() ? .01 : .3, ease: 'power2.in',
      onComplete: () => { toastEl.hidden = true; },
    });
  }, ms);
}

/* ---------- emoji particles ---------- */

let fxLayer = null;
function layer() {
  if (!fxLayer || !fxLayer.isConnected) {
    fxLayer = document.createElement('div');
    fxLayer.className = 'fx-layer';
    fxLayer.setAttribute('aria-hidden', 'true');
    document.body.append(fxLayer);
  }
  return fxLayer;
}

/** Emoji particles bursting from a viewport point, with a little gravity. */
export function burst(x, y, items, count = 14) {
  if (!items?.length) return;
  const host = layer();
  const n = prefersReduced() ? Math.min(4, count) : count;
  for (let i = 0; i < n; i++) {
    const p = document.createElement('span');
    p.className = 'fx-particle';
    p.textContent = items[i % items.length];
    host.append(p);
    const angle = (Math.PI * 2 * i) / n + gsap.utils.random(-.35, .35);
    const dist = gsap.utils.random(60, 140);
    const size = gsap.utils.random(.7, 1.25);
    gsap.set(p, { x: x - 11, y: y - 11, scale: .2, rotation: gsap.utils.random(-40, 40) });
    if (prefersReduced()) {
      gsap.to(p, { scale: size, opacity: 0, duration: .6, onComplete: () => p.remove() });
      continue;
    }
    gsap.timeline({ onComplete: () => p.remove() })
      .to(p, {
        x: x - 11 + Math.cos(angle) * dist,
        y: y - 11 + Math.sin(angle) * dist,
        scale: size,
        rotation: `+=${gsap.utils.random(-120, 120)}`,
        duration: .55,
        ease: 'power3.out',
      })
      .to(p, { y: `+=${gsap.utils.random(60, 120)}`, opacity: 0, duration: .65, ease: 'power1.in' }, '>-0.08');
  }
}

/* ---------- confetti ---------- */

const shapeCache = new Map();
function emojiShapes(emojis) {
  return emojis.map(e => {
    if (!shapeCache.has(e)) {
      try { shapeCache.set(e, confetti.shapeFromText({ text: e, scalar: 2 })); } catch { shapeCache.set(e, null); }
    }
    return shapeCache.get(e);
  }).filter(Boolean);
}

/** canvas-confetti with emoji shapes. 'big' fires three staggered bursts. */
export function celebrate(size = 'small', emojis = ['⭐']) {
  if (prefersReduced()) {
    burst(innerWidth / 2, innerHeight / 2, emojis, 6);
    return;
  }
  const shapes = emojiShapes(emojis);
  const base = {
    shapes: shapes.length ? shapes : undefined,
    scalar: 2,
    ticks: 220,
    gravity: .9,
    zIndex: 90,
    disableForReducedMotion: true,
  };
  const fire = opts => { try { confetti({ ...base, ...opts }); } catch { /* no canvas: skip */ } };
  if (size === 'big') {
    fire({ particleCount: 26, spread: 70, startVelocity: 42, origin: { x: .15, y: .75 }, angle: 60 });
    setTimeout(() => fire({ particleCount: 26, spread: 70, startVelocity: 42, origin: { x: .85, y: .75 }, angle: 120 }), 220);
    setTimeout(() => fire({ particleCount: 34, spread: 110, startVelocity: 38, origin: { x: .5, y: .55 } }), 460);
  } else {
    fire({ particleCount: 22, spread: 80, startVelocity: 36, origin: { x: .5, y: .62 } });
  }
}

/* ---------- shake ---------- */

/** A quick shake. Shaking the page shakes #app instead, so fixed elements stay put. */
export function shake(el, strength = 6) {
  if (!el || prefersReduced()) return;
  const target = el === document.body || el === document.documentElement
    ? document.getElementById('app') || el
    : el;
  gsap.killTweensOf(target, 'x,y');
  const s = strength;
  gsap.timeline({ onComplete: () => gsap.set(target, { clearProps: 'x,y' }) })
    .to(target, { x: -s, y: s * .3, duration: .04 })
    .to(target, { x: s * .8, y: -s * .3, duration: .05 })
    .to(target, { x: -s * .55, y: s * .2, duration: .05 })
    .to(target, { x: s * .3, y: 0, duration: .05 })
    .to(target, { x: 0, y: 0, duration: .06, ease: 'power2.out' });
}

/* ---------- haptics ---------- */

export function haptic(ms = 12) {
  try {
    // Only after a real tap: some browsers log a warning otherwise.
    if (navigator.userActivation && !navigator.userActivation.hasBeenActive) return;
    navigator.vibrate?.(ms);
  } catch {
    /* unsupported */
  }
}

/* ---------- visibility ---------- */

/** Calls fn once, the first time el is at least `threshold` visible. */
export function onVisible(el, fn, threshold = 0.35) {
  if (!el) return;
  if (typeof IntersectionObserver === 'undefined') {
    fn();
    return;
  }
  const io = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        io.disconnect();
        fn();
        return;
      }
    }
  }, { threshold });
  io.observe(el);
}

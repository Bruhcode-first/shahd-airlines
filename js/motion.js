// Motion system: GSAP with every plugin registered, plus the shared signature effects.
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { MotionPathPlugin } from 'gsap/MotionPathPlugin';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
import { Draggable } from 'gsap/Draggable';
import { InertiaPlugin } from 'gsap/InertiaPlugin';
import { shake } from './fx.js';

gsap.registerPlugin(ScrollTrigger, SplitText, MotionPathPlugin, DrawSVGPlugin, Draggable, InertiaPlugin);

export { gsap, ScrollTrigger, SplitText, MotionPathPlugin, DrawSVGPlugin, Draggable, InertiaPlugin };

const REDUCE_QUERY = '(prefers-reduced-motion: reduce)';

/** True when the visitor asked for reduced motion. */
export function reduced() {
  try {
    return window.matchMedia(REDUCE_QUERY).matches;
  } catch {
    return false;
  }
}

/** Conditions every animation is registered under (gsap.matchMedia). */
export const MOTION = {
  motion: '(prefers-reduced-motion: no-preference)',
  reduce: REDUCE_QUERY,
};

/**
 * Headings reveal letter by letter as they scroll in.
 * Arabic fragments are kept whole (splitting them would break the letter joins).
 */
export function splitReveal(el) {
  if (!el || el.dataset.splitReveal) return;
  el.dataset.splitReveal = '1';
  const mm = gsap.matchMedia();
  mm.add(MOTION, ctx => {
    if (ctx.conditions.reduce) return;
    const split = SplitText.create(el, {
      type: 'words,chars',
      wordsClass: 'sr-word',
      charsClass: 'sr-char',
      ignore: el.querySelectorAll('[lang="ar"]'),
    });
    const targets = [...el.querySelectorAll('.sr-char, [lang="ar"]')];
    targets.filter(t => t.matches('[lang="ar"]')).forEach(t => { t.style.display = 'inline-block'; });
    gsap.from(targets, {
      y: 20,
      opacity: 0,
      rotate: 4,
      duration: .55,
      ease: 'back.out(2)',
      stagger: .02,
      scrollTrigger: { trigger: el, start: 'top 85%', once: true },
    });
    return () => split.revert();
  });
}

const FLAP_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789·';
const randomChar = () => FLAP_CHARS[Math.floor(Math.random() * FLAP_CHARS.length)];

/** Builds the (blank) tiles for a split-flap board without animating. */
export function prepareFlap(el, text) {
  if (!el) return [];
  if (el.dataset.flapText === text && el.querySelector('.flap-tile')) {
    return [...el.querySelectorAll('.flap-tile')];
  }
  el.dataset.flapText = text;
  el.textContent = '';
  // Break after the "·" so the board reads NOW ARRIVING · / PING PONG ISLAND
  const parts = text.split(' · ');
  const rows = parts.length > 1 ? [parts[0] + ' ·', parts.slice(1).join(' · ')] : [text];
  const tiles = [];
  for (const rowText of rows) {
    const row = document.createElement('div');
    row.className = 'flap-row';
    row.setAttribute('aria-hidden', 'true');
    for (const word of rowText.split(' ').filter(Boolean)) {
      const w = document.createElement('span');
      w.className = 'flap-word';
      for (const ch of word) {
        const tile = document.createElement('span');
        tile.className = 'flap-tile';
        tile.dataset.target = ch;
        if (ch === '·') tile.classList.add('accent');
        const inner = document.createElement('span');
        inner.className = 'ch';
        inner.textContent = ' ';
        tile.append(inner);
        w.append(tile);
        tiles.push(tile);
      }
      row.append(w);
    }
    el.append(row);
  }
  return tiles;
}

/**
 * Airport departure board: every tile flicks through 4–8 random characters
 * (about 40ms a flip, staggered 30ms) before landing on its letter.
 * Resolves once every tile has landed; immediately with reduced motion.
 */
export function splitFlap(el, text) {
  const tiles = prepareFlap(el, text);
  const land = tile => {
    tile.firstChild.textContent = tile.dataset.target;
    tile.classList.add('landed');
  };
  if (reduced() || tiles.length === 0) {
    tiles.forEach(land);
    return Promise.resolve();
  }
  return new Promise(resolve => {
    let remaining = tiles.length;
    tiles.forEach((tile, i) => {
      const ch = tile.firstChild;
      const flips = 4 + Math.floor(Math.random() * 5);
      const tl = gsap.timeline({ delay: i * .03 });
      for (let f = 0; f <= flips; f++) {
        const last = f === flips;
        tl.call(() => {
          if (last) land(tile);
          else ch.textContent = randomChar();
        });
        tl.fromTo(ch, { scaleY: .2, yPercent: -18, opacity: .55 }, {
          scaleY: 1, yPercent: 0, opacity: 1, duration: .04, ease: 'none',
        });
      }
      tl.call(() => { remaining -= 1; if (remaining === 0) resolve(); });
    });
  });
}

/** A stamp lands: big and tilted, then a hard thunk to its resting angle, a tiny camera shake. */
export function stampThunk(el) {
  if (!el) return;
  if (reduced()) {
    gsap.set(el, { opacity: 1, scale: 1, rotation: -4 });
    return;
  }
  gsap.timeline()
    .fromTo(el, { scale: 1.6, rotation: -12, opacity: 0, filter: 'blur(2px)' }, {
      scale: 1, rotation: -4, opacity: 1, filter: 'blur(0px)', duration: .32, ease: 'power4.in',
    })
    .call(() => shake(document.body, 3))
    .fromTo(el, { scale: .94 }, { scale: 1, duration: .35, ease: 'elastic.out(1.2, .5)' })
    .set(el, { clearProps: 'filter' });
}

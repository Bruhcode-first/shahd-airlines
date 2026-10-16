// Boot: stores, passport, boarding, flight path, reveals, stops, landing, console egg.
import '../css/base.css';
import '../css/boarding.css';
import 'lenis/dist/lenis.css';
import Lenis from 'lenis';

import { createStampStore, browserStorage, STOP_IDS } from './stamps.js';
import { gsap, ScrollTrigger, reduced, splitReveal, splitFlap, prepareFlap } from './motion.js';
import { onVisible } from './fx.js';
import { initPassport, STAMP_INFO } from './passport.js';
import { initBoarding } from './boarding.js';
import { initFlightPath } from './flightpath.js';

import { init as initPingpong } from './games/pingpong.js';
import { init as initSudoku } from './games/sudoku.js';
import { init as initDoodle } from './games/doodle.js';
import { init as initSweets } from './games/sweetshop.js';
import { init as initBadminton } from './games/badminton.js';
import { initLanding } from './landing.js';

const STOP_INIT = {
  pingpong: initPingpong,
  sudoku: initSudoku,
  doodle: initDoodle,
  sweets: initSweets,
  badminton: initBadminton,
};

// Always start at the boarding pass, at the top.
try { history.scrollRestoration = 'manual'; } catch { /* ignore */ }
window.scrollTo(0, 0);

/* 2. stores */
const stamps = createStampStore(browserStorage(), 'sh024-stamps');
const booked = createStampStore(browserStorage(), 'sh024-booked');

/* dev hooks: created first so stop modules can register their games */
if (import.meta.env.DEV) {
  window.__sh024 = { stamps, booked, games: {} };
}

/* 3. passport */
const passport = initPassport(stamps);

/* flap boards show blank tiles until the stop arrives */
const flapText = id => 'NOW ARRIVING · ' + STAMP_INFO[id].label;
for (const id of STOP_IDS) {
  const flap = document.querySelector(`#${id} .flap`);
  if (flap) prepareFlap(flap, flapText(id));
}

const safely = (label, fn) => {
  try {
    const out = fn();
    if (out && typeof out.catch === 'function') out.catch(err => console.error(`[${label}]`, err));
  } catch (err) {
    console.error(`[${label}]`, err);
  }
};

/* 4. smooth scrolling on desktop pointers only */
function startLenis() {
  if (!window.matchMedia('(pointer: fine)').matches || reduced()) return;
  const lenis = new Lenis({ lerp: .1, smoothWheel: true });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add(time => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
  if (import.meta.env.DEV) window.__sh024.lenis = lenis;
}

/* everything that should only wake up once she has boarded */
function afterBoarding() {
  startLenis();

  // 6. headings reveal letter by letter
  document.querySelectorAll('main h2').forEach(h => splitReveal(h));

  // 7. stops: departure board on arrival, then the game itself
  for (const id of STOP_IDS) {
    const section = document.getElementById(id);
    if (!section) continue;
    const flap = section.querySelector('.flap');
    if (flap) onVisible(flap, () => splitFlap(flap, flapText(id)), .6);
    const stage = section.querySelector('.stage');
    if (stage) safely(id, () => STOP_INIT[id](stage, { award: stopId => stamps.award(stopId) }));
  }

  // 8. landing
  const landing = document.getElementById('landing');
  if (landing) safely('landing', () => initLanding(landing, { stamps, booked }));

  // 5b. the flight path, once the page has its real height
  initFlightPath();

  setTimeout(() => passport?.bump(), 450);
  document.fonts?.ready?.then(() => ScrollTrigger.refresh());
}

/* 5. boarding */
initBoarding({ onBoarded: afterBoarding });

/* 10. the one CS joke */
if (!window.__sh024Egg) {
  window.__sh024Egg = true;
  console.log(
    "%cHey Shahd 👋 if you found this, you're a better developer than you think.",
    'font-family: Rubik, system-ui, sans-serif; font-size: 14px; font-weight: 500; color: #12867C; background: #EAF6FF; padding: 10px 14px; border-radius: 10px; border: 1px solid #8EC5FF;',
  );
}

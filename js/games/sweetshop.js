import '../../css/stops/sweetshop.css';
import { gsap, MOTION, MotionPathPlugin, DrawSVGPlugin } from '../motion.js';
import { burst, shake, haptic, onVisible } from '../fx.js';

// Stop 4: The Sweet Shop. A delivery tracker (four steps, a scooter on a curved road),
// a gift box that spills real-physics candy, then the receipt and the honey line.

const STEP_GAP = 1.6; // seconds between tracker steps
const END = 0.86; // the scooter parks just before the house
const SPILL = ['🍫', '🍬', '🍭', '🍯', '🍫'];

const STEPS = [
  '<strong>Order placed ✓</strong>',
  '<strong>Preparing…</strong> the chef saw the customer\'s name and said she doesn\'t need extra sugar 🍯',
  '<strong>Rider on the way 🛵</strong> driving extra carefully, precious cargo',
  '<strong>Delivered to:</strong> the sweetest address in Muscat',
];

const CHECK = `<svg class="sw-check" viewBox="0 0 16 16" aria-hidden="true"><path d="M3.4 8.6 6.6 11.8 12.6 4.6"/></svg>`;

const TEMPLATE = `
<div class="sw">
  <section class="sw-track" aria-label="Delivery tracker">
    <div class="sw-map">
      <svg class="sw-mapsvg" viewBox="0 0 320 150" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
        <rect class="m-ground" width="320" height="150"/>
        <path class="m-sea" d="M0 104 C 22 98 34 112 58 108 C 78 105 92 120 98 150 L0 150Z"/>
        <path class="m-seafoam" d="M0 104 C 22 98 34 112 58 108 C 78 105 92 120 98 150" />
        <ellipse class="m-park" cx="248" cy="104" rx="46" ry="21"/>
        <ellipse class="m-park m-park2" cx="64" cy="26" rx="34" ry="15"/>
        <g class="m-blocks">
          <rect x="112" y="14" width="44" height="30" rx="7"/>
          <rect x="166" y="8" width="34" height="26" rx="7"/>
          <rect x="214" y="12" width="40" height="22" rx="7"/>
          <rect x="132" y="92" width="40" height="30" rx="7"/>
          <rect x="182" y="100" width="30" height="34" rx="7"/>
          <rect x="268" y="82" width="38" height="28" rx="7"/>
          <rect x="22" y="48" width="36" height="26" rx="7"/>
        </g>
        <path class="m-road-edge" d="M282 42 C 232 116 208 78 152 62 C 96 46 88 118 40 112"/>
        <path class="m-road" d="M282 42 C 232 116 208 78 152 62 C 96 46 88 118 40 112"/>
        <path class="m-road-dash" d="M282 42 C 232 116 208 78 152 62 C 96 46 88 118 40 112"/>
        <path class="sw-route" d="M282 42 C 232 116 208 78 152 62 C 96 46 88 118 40 112" fill="none" stroke="none"/>
        <g class="m-palms" font-size="15">
          <text x="236" y="122">🌴</text>
          <text x="88" y="38">🌴</text>
          <text x="214" y="62">🌳</text>
          <text x="110" y="130">🌴</text>
        </g>
        <g class="m-shop">
          <circle cx="282" cy="42" r="19"/>
          <text x="282" y="43" text-anchor="middle" dominant-baseline="central" font-size="21">🍫</text>
        </g>
        <g class="m-home">
          <circle class="m-home-ring" cx="40" cy="112" r="19"/>
          <circle class="m-home-dot" cx="40" cy="112" r="19"/>
          <text x="40" y="113" text-anchor="middle" dominant-baseline="central" font-size="21">🏠</text>
        </g>
        <g class="sw-scoot" opacity="0">
          <ellipse class="m-scoot-shadow" cx="0" cy="12" rx="12" ry="3.2"/>
          <g class="sw-scoot-bob"><text x="0" y="1" text-anchor="middle" dominant-baseline="central" font-size="27">🛵</text></g>
        </g>
      </svg>
      <button class="btn sw-trackbtn" type="button">Track order</button>
    </div>
    <ol class="sw-steps" aria-live="polite">
      ${STEPS.map((html, i) => `
      <li class="sw-step" data-step="${i + 1}">
        <i class="sw-link" aria-hidden="true"></i>
        <span class="sw-node" aria-hidden="true"><span class="sw-ring"></span>${CHECK}</span>
        <p class="sw-text">${html}</p>
      </li>`).join('')}
    </ol>
  </section>

  <div class="sw-gift" hidden>
    <div class="sw-giftstage">
      <div class="sw-spot" aria-hidden="true"></div>
      <div class="sw-sparkles" aria-hidden="true"><i>✨</i><i>✨</i><i>✨</i></div>
      <div class="sw-counter" aria-hidden="true"></div>
      <button class="sw-box" type="button">
        <span class="sw-box-label">Tap to open 🎁</span>
        <span class="sw-boxwrap"><svg class="sw-giftsvg" viewBox="0 0 160 150" width="160" height="150" aria-hidden="true" focusable="false">
          <ellipse class="gb-shadow" cx="80" cy="142" rx="62" ry="6"/>
          <g class="gb-body">
            <rect class="gb-wall" x="24" y="70" width="112" height="72" rx="10"/>
            <g class="gb-dots"><circle cx="40" cy="92" r="4"/><circle cx="52" cy="116" r="4"/><circle cx="38" cy="130" r="3"/><circle cx="108" cy="90" r="4"/><circle cx="122" cy="112" r="4"/><circle cx="110" cy="132" r="3"/><circle cx="56" cy="84" r="2.6"/><circle cx="126" cy="134" r="2.6"/></g>
            <rect class="gb-shade" x="24" y="124" width="112" height="18" rx="9"/>
            <rect class="gb-ribbon" x="70" y="70" width="20" height="72"/>
            <rect class="gb-ribbon-shine" x="73" y="70" width="4" height="72"/>
            <ellipse class="gb-mouth" cx="80" cy="73" rx="55" ry="8" opacity="0"/>
          </g>
          <g class="gb-lid">
            <rect class="gb-lidtop" x="14" y="48" width="132" height="30" rx="10"/>
            <rect class="gb-lidshine" x="22" y="52" width="116" height="5" rx="2.5"/>
            <rect class="gb-ribbon" x="70" y="48" width="20" height="30"/>
            <path class="gb-bow" d="M80 47 C 62 14 32 20 40 38 C 46 51 70 51 80 47Z"/>
            <path class="gb-bow" d="M80 47 C 98 14 128 20 120 38 C 114 51 90 51 80 47Z"/>
            <circle class="gb-knot" cx="80" cy="45" r="8.5"/>
          </g>
        </svg></span>
      </button>
      <div class="sw-pile" data-spawn-bottom="96"></div>
    </div>
  </div>

  <div class="sw-reveals">
    <div class="sw-receipt" hidden>
      <div class="sw-paper">
        <div class="rc-head"><span class="rc-logo" aria-hidden="true">🍫</span><span class="rc-order">Order #SH024</span></div>
        <div class="rc-line"><span class="rc-q">1×</span> chocolate (the one you loved)</div>
        <div class="rc-line"><span class="rc-q">1×</span> candy</div>
        <div class="rc-total"><strong>Total: 0 OMR, paid in smiles</strong></div>
        <div class="rc-barcode" aria-hidden="true"></div>
      </div>
    </div>
    <p class="sw-rule" hidden><span class="sw-rule-text"><strong>Candy rule:</strong> you can never stop at one. Same goes for conversations with you.</span></p>
    <div class="sw-honey" hidden>
      <svg class="sw-drips" viewBox="0 0 320 46" preserveAspectRatio="none" aria-hidden="true" focusable="false">
        <path d="M0 0H320V10C312 10 310 14 310 24C310 38 296 38 296 24C296 14 290 10 282 10H236C228 10 224 14 224 20C224 30 214 30 214 20C214 13 208 10 200 10H128C120 10 116 15 116 30C116 46 102 46 102 30C102 15 96 10 88 10H48C40 10 36 14 36 22C36 32 24 32 24 22C24 14 18 10 10 10H0Z"/>
      </svg>
      <p class="sw-honey-text">Funny thing… the sweetest thing on this site was here before the order arrived. <span lang="ar" dir="rtl">شهد</span> literally means honey 🍯</p>
    </div>
  </div>
</div>`;

export function init(stage, ctx = {}) {
  const award = typeof ctx.award === 'function' ? ctx.award : () => {};
  delete stage.dataset.stub;
  stage.innerHTML = TEMPLATE;

  const root = stage.querySelector('.sw');
  const $ = s => root.querySelector(s);
  const steps = [...root.querySelectorAll('.sw-step')];
  const route = $('.sw-route');
  const scoot = $('.sw-scoot');
  const bob = $('.sw-scoot-bob');
  const trackBtn = $('.sw-trackbtn');
  const gift = $('.sw-gift');
  const giftStage = $('.sw-giftstage');
  const box = $('.sw-box');
  const boxwrap = $('.sw-boxwrap');
  const boxLabel = $('.sw-box-label');
  const lid = $('.gb-lid');
  const body = $('.gb-body');
  const mouth = $('.gb-mouth');
  const pile = $('.sw-pile');
  const receipt = $('.sw-receipt');
  const rule = $('.sw-rule');
  const honey = $('.sw-honey');
  const homeRing = $('.m-home-ring');
  const homeDot = $('.m-home-dot');

  let started = false;
  let opened = false;
  let physics = null;
  let userScrolled = false;

  const pathTo = (end, start = 0) => ({ path: route, align: route, alignOrigin: [0.5, 0.5], start, end });
  const routeStart = route.getPointAtLength(0);
  gsap.set(scoot, { x: routeStart.x, y: routeStart.y, opacity: 0 });

  const markScroll = () => { userScrolled = true; };

  /* ---------- tracker ---------- */

  function showStep(i, { instant = false } = {}) {
    const li = steps[i];
    li.classList.add('on');
    steps.forEach((s, k) => s.classList.toggle('now', k === i));
    const node = li.querySelector('.sw-node');
    const tick = li.querySelector('.sw-check path');
    const text = li.querySelector('.sw-text');
    const link = steps[i - 1]?.querySelector('.sw-link');
    if (instant) {
      gsap.set(text, { opacity: 1, x: 0 });
      gsap.set(node, { scale: 1 });
      gsap.set(tick, { drawSVG: '100%' });
      if (link) gsap.set(link, { scaleY: 1 });
      return;
    }
    gsap.fromTo(text, { opacity: 0, x: -16 }, { opacity: 1, x: 0, duration: 0.5, ease: 'power3.out' });
    gsap.fromTo(node, { scale: 0 }, { scale: 1, duration: 0.55, ease: 'back.out(2.6)' });
    gsap.fromTo(tick, { drawSVG: '0%' }, { drawSVG: '100%', duration: 0.35, delay: 0.18, ease: 'power2.out' });
    if (link) gsap.fromTo(link, { scaleY: 0 }, { scaleY: 1, duration: 0.5, ease: 'power2.out' });
    haptic(8);
  }

  function revealGift({ instant = false } = {}) {
    gift.hidden = false;
    if (instant) {
      gsap.set(gift, { height: 'auto', opacity: 1 });
      return;
    }
    gsap.fromTo(gift, { height: 0, opacity: 0 }, {
      height: 'auto', opacity: 1, duration: 0.65, ease: 'power2.out',
      onComplete: () => gsap.set(gift, { clearProps: 'height' }),
    });
    gsap.fromTo(boxwrap, { y: -230, rotation: -10, opacity: 0 }, {
      y: 0, rotation: 0, opacity: 1, duration: 1, delay: 0.25, ease: 'bounce.out',
    });
    gsap.fromTo(giftStage.querySelectorAll('.sw-spot, .sw-sparkles'), { opacity: 0 }, {
      opacity: 1, duration: 0.8, delay: 0.3,
    });
    // a small idle wiggle so it asks to be tapped
    gsap.timeline({ repeat: -1, repeatDelay: 2.2, delay: 1.6, id: 'sw-idle' })
      .to(boxwrap, { rotation: -5, duration: 0.09, ease: 'sine.inOut' })
      .to(boxwrap, { rotation: 5, duration: 0.13, ease: 'sine.inOut' })
      .to(boxwrap, { rotation: -3, duration: 0.11, ease: 'sine.inOut' })
      .to(boxwrap, { rotation: 0, duration: 0.14, ease: 'sine.out' });
    nudgeToGift();
  }

  /** Brings the gift into view, once, if she is just waiting and hasn't scrolled herself. */
  function nudgeToGift() {
    removeEventListener('wheel', markScroll);
    removeEventListener('touchmove', markScroll);
    if (userScrolled) return;
    // Only when she is still at the shop: never pull her away from another stop.
    const sr = stage.getBoundingClientRect();
    if (sr.bottom < window.innerHeight * 0.25 || sr.top > window.innerHeight * 0.75) return;
    const r = giftStage.getBoundingClientRect();
    const finalH = 300;
    const top = r.top + window.scrollY;
    const visibleBottom = window.scrollY + window.innerHeight;
    if (top + finalH <= visibleBottom - 16) return;
    const target = Math.max(0, top + finalH / 2 - window.innerHeight / 2);
    try { window.scrollTo({ top: target, behavior: 'smooth' }); } catch { window.scrollTo(0, target); }
  }

  function settleTracker() {
    started = true;
    trackBtn.hidden = true;
    steps.forEach((_, i) => showStep(i, { instant: true }));
    steps.forEach((s, k) => s.classList.toggle('now', k === steps.length - 1));
    gsap.set(scoot, { opacity: 1, motionPath: pathTo(END) });
    homeDot.classList.add('arrived');
    revealGift({ instant: true });
  }

  function playTracker() {
    if (started) return;
    started = true;
    userScrolled = false;
    addEventListener('wheel', markScroll, { passive: true });
    addEventListener('touchmove', markScroll, { passive: true });

    gsap.to(trackBtn, {
      opacity: 0, scale: 0.9, duration: 0.3, ease: 'power2.in',
      onComplete: () => { trackBtn.hidden = true; },
    });

    const tl = gsap.timeline();
    // step 1
    tl.call(() => showStep(0), null, 0.1);
    // step 2: the scooter shows up at the shop and starts to roll
    tl.call(() => showStep(1), null, 0.1 + STEP_GAP);
    tl.fromTo(scoot, { opacity: 0, scale: 0.2 }, { opacity: 1, scale: 1, duration: 0.5, ease: 'back.out(2.4)' }, 0.1 + STEP_GAP);
    tl.to(scoot, { motionPath: pathTo(0.34), duration: STEP_GAP * 0.95, ease: 'sine.inOut' }, 0.35 + STEP_GAP);
    tl.add(gsap.to(bob, { y: -2.4, duration: 0.17, yoyo: true, repeat: -1, ease: 'sine.inOut' }), 0.1 + STEP_GAP);
    // step 3: on the way
    tl.call(() => showStep(2), null, 0.1 + STEP_GAP * 2);
    tl.to(scoot, { motionPath: pathTo(0.74, 0.34), duration: STEP_GAP, ease: 'none' }, 0.1 + STEP_GAP * 2 - 0.05);
    // step 4: delivered
    const t4 = 0.1 + STEP_GAP * 3;
    tl.to(scoot, { motionPath: pathTo(END, 0.74), duration: 0.8, ease: 'power2.out' }, t4 - 0.35);
    tl.call(() => {
      showStep(3);
      gsap.killTweensOf(bob);
      gsap.set(bob, { y: 0 });
      homeDot.classList.add('arrived');
      const r = homeDot.getBoundingClientRect();
      burst(r.left + r.width / 2, r.top + r.height / 2, ['✨', '🍬', '🍫', '✨'], 8);
    }, null, t4 + 0.45);
    tl.fromTo(homeRing, { attr: { r: 19 }, opacity: 0.8 }, { attr: { r: 40 }, opacity: 0, duration: 0.9, ease: 'power2.out' }, t4 + 0.45);
    tl.call(() => revealGift(), null, t4 + 1.2);
  }

  /* ---------- the box ---------- */

  function spillBox() {
    if (opened) return;
    opened = true;
    gsap.getById?.('sw-idle')?.kill();
    box.disabled = true;
    box.classList.add('open');

    const r = boxwrap.getBoundingClientRect();
    burst(r.left + r.width / 2, r.top + r.height * 0.62, ['🍫', '🍬', '🍭', '🍯'], 16);
    haptic(22);
    award('sweets');

    gsap.killTweensOf([boxwrap, lid, body, boxLabel]);
    gsap.set(boxwrap, { rotation: 0, y: 0 });
    gsap.set(mouth, { opacity: 1 });
    shake(document.body, 4);
    gsap.to(boxLabel, { opacity: 0, y: -14, duration: 0.3, ease: 'power2.in' });
    gsap.timeline()
      .to(lid, { y: -150, x: 36, rotation: 28, svgOrigin: '80 62', duration: 0.5, ease: 'power3.out' })
      .to(lid, { y: 210, x: 70, rotation: 70, opacity: 0, duration: 0.55, ease: 'power2.in' }, '>-0.05');
    gsap.timeline()
      .to(body, { scaleY: 0.88, scaleX: 1.05, svgOrigin: '80 140', duration: 0.12, ease: 'power2.out' })
      .to(body, { scaleY: 1, scaleX: 1, duration: 0.7, ease: 'elastic.out(1.1, 0.35)' });

    import('./candy-physics.js')
      .then(m => { physics = m.startCandyPhysics(pile, SPILL, 30); })
      .catch(err => console.error('[sweets] candy physics failed', err));

    revealStory();
  }

  function revealStory() {
    const items = [receipt, rule, honey];
    items.forEach(el => { el.hidden = true; });
    const show = (el, i) => {
      el.hidden = false;
      if (i === 0) {
        gsap.fromTo(receipt.firstElementChild, { clipPath: 'inset(0 0 100% 0)', y: -22 }, {
          clipPath: 'inset(0 0 -2% 0)', y: 0, duration: 1.05, ease: 'power2.out',
          onComplete: () => gsap.set(receipt.firstElementChild, { clearProps: 'clipPath' }),
        });
        gsap.fromTo(receipt, { opacity: 0, rotation: -3 }, { opacity: 1, rotation: -1.2, duration: 0.4 });
      } else if (i === 1) {
        gsap.fromTo(el, { opacity: 0, y: 26, scale: 0.9, rotation: 3 }, {
          opacity: 1, y: 0, scale: 1, rotation: 0, duration: 0.6, ease: 'back.out(1.8)',
        });
      } else {
        gsap.fromTo(el, { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.55, ease: 'power3.out' });
        gsap.fromTo(el.querySelector('.sw-drips'), { scaleY: 0 }, {
          scaleY: 1, transformOrigin: '50% 0%', duration: 1.2, delay: 0.1, ease: 'elastic.out(1, 0.45)',
        });
      }
    };
    // 600ms apart, the first after the burst has had a moment
    items.forEach((el, i) => gsap.delayedCall(0.9 + i * 0.6, () => show(el, i)));
  }

  function spillBoxStatic() {
    if (opened) return;
    opened = true;
    box.disabled = true;
    box.classList.add('open');
    gsap.set(lid, { opacity: 0 });
    gsap.set(mouth, { opacity: 1 });
    gsap.set(boxLabel, { opacity: 0 });
    award('sweets');
    import('./candy-physics.js')
      .then(m => { physics = m.startCandyPhysics(pile, SPILL, 30); })
      .catch(err => console.error('[sweets] candy physics failed', err));
    [receipt, rule, honey].forEach(el => { el.hidden = false; });
  }

  /* ---------- motion branches ---------- */

  const mm = gsap.matchMedia();
  let startTracker = () => {};
  let openBox = () => {};
  mm.add(MOTION, mctx => {
    const calm = mctx.conditions.reduce;
    startTracker = mctx.add('start', () => (calm ? settleTracker() : playTracker()));
    openBox = mctx.add('open', () => (calm ? spillBoxStatic() : spillBox()));
    if (calm) settleTracker();
    return () => {
      physics?.stop();
      physics = null;
    };
  });

  trackBtn.addEventListener('click', () => startTracker());
  box.addEventListener('click', () => openBox());
  onVisible(stage, () => startTracker(), 0.4);

  /* test/dev hooks */
  if (import.meta.env.DEV && window.__sh024?.games) {
    window.__sh024.games.sweets = {
      start: () => startTracker(),
      open: () => openBox(),
      get physics() { return physics; },
    };
  }

  // Keeps the tree-shaker from dropping the plugins that motion.js registers.
  void MotionPathPlugin; void DrawSVGPlugin;
}

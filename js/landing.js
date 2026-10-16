import '../css/stops/landing.css';
// Landing: Shahd's World. The globe (lazy), postcards, next-stop passes,
// the passport spread and the sign-off note.
import { STOP_IDS } from './stamps.js';
import { MET_DATE, daysSince, daysAgoPhrase } from './copy.js';
import { stampSVG, STAMP_INFO } from './passport.js';
import { gsap, ScrollTrigger, Draggable, MOTION, reduced, splitReveal, stampThunk } from './motion.js';
import { burst, celebrate, haptic } from './fx.js';
import { mountRouteMap } from './routemap.js';

const IMG = name => import.meta.env.BASE_URL + 'images/' + name;

/* ---------- data ---------- */

// side: where the label sits next to its dot (null = no label)
export const PLACES = [
  { id: 'muscat', lat: 23.588, lng: 58.383, kind: 'origin', name: 'Muscat', side: 'b' },
  { id: 'egypt', lat: 29.979, lng: 31.134, kind: 'been', name: 'Egypt', side: 'l' },
  { id: 'turkey', lat: 38.643, lng: 34.828, kind: 'been', name: 'Turkey', side: 't' },
  { id: 'dubai', lat: 25.197, lng: 55.274, kind: 'been', name: 'Dubai', side: 't' },
  { id: 'china', lat: 40.432, lng: 116.570, kind: 'been', name: 'China', side: 't' },
  { id: 'egypt-again', lat: 25.687, lng: 32.639, kind: 'next', name: 'Luxor', side: null },
  { id: 'italy', lat: 40.628, lng: 14.485, kind: 'next', name: 'Italy', side: 'l' },
  { id: 'mexico', lat: 21.019, lng: -101.257, kind: 'next', name: 'Mexico', side: 't' },
  { id: 'china-again', lat: 39.916, lng: 116.397, kind: 'next', name: 'Beijing', side: null },
];
const PLACE = Object.fromEntries(PLACES.map(p => [p.id, p]));

const BEEN = [
  {
    id: 'egypt', label: 'EGYPT', emoji: '🏜️',
    photos: [['egypt.webp', 'Camel riders walking toward the pyramids of Giza at sunset']],
    line: "You came to Egypt and didn't say hi?! 😤 (OK fine, we hadn't met yet)",
  },
  {
    id: 'turkey', label: 'TURKEY', emoji: '🎈',
    photos: [['turkey.webp', 'A hot-air balloon floating over the fairy chimneys of Cappadocia']],
    line: 'Balloons, tea and views. Good taste confirmed.',
  },
  {
    id: 'dubai', label: 'DUBAI', emoji: '🏙️',
    photos: [['dubai.webp', 'The Burj Khalifa rising above the Dubai skyline']],
    line: 'Right next door, but it still counts ✨',
  },
  {
    id: 'china', label: 'CHINA', emoji: '🏯', featured: true,
    photos: [
      ['china-1.webp', 'The Great Wall of China winding along green ridges'],
      ['china-2.webp', 'The Shanghai skyline and the Oriental Pearl Tower lit up at night'],
      ['china-3.webp', 'Misty karst peaks in Zhangjiajie'],
    ],
    line: 'The main character of your passport.',
  },
];

const NEXT = [
  { id: 'egypt-again', from: 'MCT', to: 'LXR', city: 'Egypt (again)', emoji: '⛵', img: ['next-egypt.webp', 'A felucca with a white sail on the Nile at Luxor'], line: 'Egyptian tour guide available 😌 (fee: one chocolate)' },
  { id: 'italy', from: 'MCT', to: 'NAP', city: 'Italy', emoji: '🍋', img: ['next-italy.webp', 'Colorful houses of Positano above a blue sea'], line: 'Pasta, gelato and a thousand photos.' },
  { id: 'mexico', from: 'MCT', to: 'BJX', city: 'Mexico', emoji: '🌮', img: ['next-mexico.webp', 'Colorful hillside houses and churches of Guanajuato'], line: 'Colors, tacos and sunshine.' },
  { id: 'china-again', from: 'MCT', to: 'PEK', city: 'China (again)', emoji: '🏮', img: ['next-china.webp', 'A golden-roofed red pavilion in the Forbidden City, Beijing'], line: 'Because once was clearly not enough.' },
];

const BOOKED_TEXT = 'BOOKED · one day';

/* ---------- small helpers ---------- */

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function photo([file, alt], emoji, extra = '') {
  return `<span class="ph ${extra}" data-emoji="${emoji}"><img src="${IMG(file)}" alt="${esc(alt)}" loading="lazy" decoding="async" draggable="false"></span>`;
}

/** Photos fade in when they load; a missing photo leaves its gradient placeholder. */
function wirePhotos(root) {
  root.querySelectorAll('.ph img').forEach(img => {
    const ph = img.parentElement;
    const ok = () => ph.classList.add('ph-loaded');
    const bad = () => { ph.classList.add('ph-missing'); img.remove(); };
    if (img.complete) {
      if (img.naturalWidth > 0) ok();
      else if (img.getAttribute('src')) img.addEventListener('error', bad, { once: true });
    }
    img.addEventListener('load', ok, { once: true });
    img.addEventListener('error', bad, { once: true });
  });
}

function postmarkSVG(label) {
  return `<svg class="pc-postmark" viewBox="0 0 150 72" aria-hidden="true">
    <g fill="none" stroke="currentColor" stroke-linecap="round">
      <path stroke-width="2.2" d="M2 16 q8 -6 16 0 t16 0 t16 0 t16 0 M2 28 q8 -6 16 0 t16 0 t16 0 t16 0 M2 40 q8 -6 16 0 t16 0 t16 0 t16 0 M2 52 q8 -6 16 0 t16 0 t16 0 t16 0"/>
      <circle cx="108" cy="36" r="31" stroke-width="2.6"/>
      <circle cx="108" cy="36" r="25" stroke-width="1.2"/>
    </g>
    <text x="108" y="30" text-anchor="middle" font-size="8" letter-spacing="1" fill="currentColor">SH024</text>
    <text x="108" y="44" text-anchor="middle" font-size="9.5" font-weight="700" letter-spacing=".4" fill="currentColor">${label}</text>
  </svg>`;
}

const scrollBehavior = () => (reduced() ? 'auto' : 'smooth');

function afterScroll(fn, ms = 650) {
  if (reduced()) { fn(); return; }
  let done = false;
  const go = () => { if (!done) { done = true; window.removeEventListener('scrollend', go); fn(); } };
  window.addEventListener('scrollend', go, { once: true });
  setTimeout(go, ms + 250);
}

/* ---------- postcards (#been) ---------- */

function setFlipped(card, flipped) {
  card.classList.toggle('flipped', flipped);
  if (card.matches('button')) card.setAttribute('aria-pressed', String(flipped));
  const front = card.querySelector('.pc-front');
  const back = card.querySelector('.pc-back');
  if (card.classList.contains('featured')) {
    front.inert = flipped;
    back.inert = !flipped;
  }
  if (!reduced()) {
    gsap.fromTo(card, { y: 0 }, { y: -10, duration: .22, ease: 'power2.out', yoyo: true, repeat: 1 });
  }
}

function renderBeen(root) {
  const cards = BEEN.filter(b => !b.featured).map((b, i) => `
    <button type="button" class="postcard" data-id="${b.id}" aria-pressed="false" style="--tilt:${[-1.6, 1.4, -1][i]}deg">
      <span class="pc-inner">
        <span class="pc-face pc-front">
          ${photo(b.photos[0], b.emoji, `ph-${b.id}`)}
          <span class="pc-label">${b.label}</span>
          ${postmarkSVG(b.label)}
          <span class="pc-flipicon" aria-hidden="true">↻</span>
        </span>
        <span class="pc-face pc-back">
          <span class="pc-msg">${esc(b.line)}</span>
          <span class="pc-side" aria-hidden="true">
            <span class="pc-stampbox"><span>${b.emoji}</span><small>${b.label}</small></span>
            <span class="pc-lines"><i></i><i></i><i></i></span>
          </span>
        </span>
      </span>
    </button>`).join('');

  const china = BEEN.find(b => b.featured);
  const slides = china.photos.map((p, i) => `<div class="pc-slide" role="group" aria-label="${i + 1} of ${china.photos.length}">${photo(p, ['🏯', '🌃', '⛰️'][i], `ph-china-${i + 1}`)}</div>`).join('');
  const dots = china.photos.map((_, i) => `<button type="button" class="pc-dot${i === 0 ? ' on' : ''}" data-i="${i}" aria-label="Photo ${i + 1}"></button>`).join('');
  const featured = `
    <article class="postcard featured" data-id="china" style="--tilt:.8deg" aria-label="China postcard">
      <div class="pc-inner">
        <div class="pc-face pc-front">
          <div class="pc-gallery" tabindex="0" aria-label="China photos">${slides}</div>
          <span class="pc-label">${china.label}</span>
          <span class="pc-star" aria-hidden="true">★</span>
          ${postmarkSVG(china.label)}
          <div class="pc-bar">
            <div class="pc-dots">${dots}</div>
            <button type="button" class="pc-flip">Flip ↻</button>
          </div>
        </div>
        <div class="pc-face pc-back" inert>
          <p class="pc-msg">${esc(china.line)}</p>
          <span class="pc-side" aria-hidden="true">
            <span class="pc-stampbox"><span>${china.emoji}</span><small>${china.label}</small></span>
            <span class="pc-lines"><i></i><i></i><i></i></span>
          </span>
          <button type="button" class="pc-flip">Flip ↻</button>
        </div>
      </div>
    </article>`;

  root.innerHTML = `
    <h3 class="land-h"><span class="land-ico" aria-hidden="true">📮</span>Places you've been</h3>
    <div class="pc-list">${cards}${featured}</div>`;

  root.querySelectorAll('button.postcard').forEach(card => {
    card.addEventListener('click', () => {
      setFlipped(card, !card.classList.contains('flipped'));
      haptic(8);
    });
  });

  const feat = root.querySelector('.postcard.featured');
  feat.querySelectorAll('.pc-flip').forEach(b => b.addEventListener('click', () => {
    const flip = !feat.classList.contains('flipped');
    setFlipped(feat, flip);
    haptic(8);
    feat.querySelector(flip ? '.pc-back .pc-flip' : '.pc-front .pc-flip')?.focus({ preventScroll: true });
  }));

  // gallery dots follow the swipe
  const gallery = feat.querySelector('.pc-gallery');
  const dotEls = [...feat.querySelectorAll('.pc-dot')];
  const current = () => Math.round(gallery.scrollLeft / Math.max(1, gallery.clientWidth));
  gallery.addEventListener('scroll', () => {
    const i = current();
    dotEls.forEach((d, j) => d.classList.toggle('on', i === j));
  }, { passive: true });
  dotEls.forEach((d, i) => d.addEventListener('click', () => {
    gallery.scrollTo({ left: i * gallery.clientWidth, behavior: scrollBehavior() });
  }));

  wirePhotos(root);
  splitReveal(root.querySelector('.land-h'));

  return {
    flip(id) {
      const card = root.querySelector(`.postcard[data-id="${id}"]`);
      if (!card) return;
      card.scrollIntoView({ behavior: scrollBehavior(), block: 'center' });
      afterScroll(() => { if (!card.classList.contains('flipped')) setFlipped(card, true); });
    },
  };
}

/* ---------- next stops (#next) ---------- */

function renderNext(root, booked) {
  const passes = NEXT.map((n, i) => `
    <article class="pass" data-id="${n.id}" data-i="${i}" aria-label="${esc(n.city)}">
      <div class="pass-top">
        ${photo(n.img, n.emoji, `ph-${n.id}`)}
        <span class="pass-chip">SH024</span>
      </div>
      <div class="pass-body">
        <p class="pass-route"><span class="pass-code">${n.from}</span><span class="pass-arrow"> → </span><span class="pass-code">${n.to}</span></p>
        <p class="pass-city">${esc(n.city)}</p>
        <p class="pass-line">${esc(n.line)}</p>
      </div>
      <div class="pass-foot">
        <button type="button" class="btn btn-coral pass-book">Book it</button>
        <p class="pass-stamp" role="status" hidden><span>${BOOKED_TEXT}</span></p>
      </div>
    </article>`).join('');
  const dots = NEXT.map((n, i) => `<button type="button" class="nx-dot" data-i="${i}" aria-label="${esc(n.city)}"></button>`).join('');

  root.innerHTML = `
    <h3 class="land-h"><span class="land-ico" aria-hidden="true">🧳</span>Where to next?</h3>
    <div class="nx-viewport">
      <div class="nx-track">${passes}</div>
    </div>
    <div class="nx-dots">${dots}</div>`;

  const viewport = root.querySelector('.nx-viewport');
  const cards = [...root.querySelectorAll('.pass')];
  const dotEls = [...root.querySelectorAll('.nx-dot')];
  const n = cards.length;
  const proxy = document.createElement('div');
  let spacing = 240;
  let pos = 0;

  const layout = () => {
    const active = Math.round(pos);
    cards.forEach((c, i) => {
      const d = i - pos;
      const ad = Math.abs(d);
      gsap.set(c, {
        x: d * spacing,
        z: -Math.min(ad, 2.5) * 120,
        rotationY: gsap.utils.clamp(-50, 50, -d * 36),
        scale: 1 - Math.min(ad, 2) * .04,
        opacity: ad > 2.3 ? 0 : 1 - Math.max(0, ad - 1.1) * .8,
        zIndex: 100 - Math.round(ad * 10),
      });
      c.style.setProperty('--shade', (Math.min(ad, 1.3) * .2).toFixed(3));
      c.classList.toggle('is-center', i === active);
      c.classList.toggle('is-far', ad > 1.6);
    });
    dotEls.forEach((d, i) => {
      d.classList.toggle('on', i === active);
      d.setAttribute('aria-current', i === active ? 'true' : 'false');
    });
  };

  const sync = () => {
    pos = -gsap.getProperty(proxy, 'x') / spacing;
    layout();
  };

  const goTo = (i, instant = false) => {
    const idx = gsap.utils.clamp(0, n - 1, i);
    gsap.killTweensOf(proxy);
    if (instant || reduced()) {
      gsap.set(proxy, { x: -idx * spacing });
      sync();
      return;
    }
    gsap.to(proxy, { x: -idx * spacing, duration: .7, ease: 'power3.out', onUpdate: sync });
  };

  const [drag] = Draggable.create(proxy, {
    type: 'x',
    trigger: viewport,
    inertia: true,
    allowNativeTouchScrolling: true,
    dragClickables: false,
    edgeResistance: .85,
    bounds: { minX: -(n - 1) * spacing, maxX: 0 },
    snap: { x: v => Math.round(v / spacing) * spacing },
    onPress() { gsap.killTweensOf(proxy); },
    onDrag: sync,
    onThrowUpdate: sync,
    onThrowComplete: sync,
    onClick(e) {
      if (e.target.closest('button')) return;
      const card = e.target.closest('.pass');
      if (card) goTo(Number(card.dataset.i));
    },
  });

  const measure = () => {
    const w = cards[0].offsetWidth || 240;
    spacing = Math.round(w * .74);
    drag.applyBounds({ minX: -(n - 1) * spacing, maxX: 0 });
    gsap.set(proxy, { x: -Math.round(pos) * spacing });
    sync();
  };
  let resizeTimer = 0;
  window.addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(measure, 120); });

  dotEls.forEach((d, i) => d.addEventListener('click', () => goTo(i)));
  viewport.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight') { goTo(Math.round(pos) + 1); e.preventDefault(); }
    if (e.key === 'ArrowLeft') { goTo(Math.round(pos) - 1); e.preventDefault(); }
  });
  cards.forEach((c, i) => c.addEventListener('focusin', () => { if (Math.round(pos) !== i) goTo(i); }));

  const showBooked = (card, animate) => {
    const btn = card.querySelector('.pass-book');
    const stamp = card.querySelector('.pass-stamp');
    card.classList.add('booked');
    btn.hidden = true;
    stamp.hidden = false;
    if (animate) {
      gsap.set(stamp, { opacity: 0 });
      stampThunk(stamp);
      const r = stamp.getBoundingClientRect();
      gsap.delayedCall(.3, () => burst(r.left + r.width / 2, r.top + r.height / 2, ['✈️', '🎟️', '✨'], 12));
    } else {
      gsap.set(stamp, { rotation: -4, opacity: 1 });
    }
  };

  cards.forEach((card, i) => {
    const id = card.dataset.id;
    if (booked.has(id)) showBooked(card, false);
    card.querySelector('.pass-book').addEventListener('click', () => {
      if (Math.round(pos) !== i) goTo(i);
      if (booked.has(id)) return;
      booked.award(id);
      haptic(18);
      showBooked(card, true);
    });
  });

  wirePhotos(root);
  splitReveal(root.querySelector('.land-h'));
  measure();
  // fonts and photos can change the card size
  document.fonts?.ready?.then(measure);

  return {
    show(id) {
      const i = NEXT.findIndex(x => x.id === id);
      if (i < 0) return;
      viewport.scrollIntoView({ behavior: scrollBehavior(), block: 'center' });
      afterScroll(() => goTo(i));
    },
  };
}

/* ---------- passport spread (#passport-spread) ---------- */

function renderPassport(root, stamps) {
  root.innerHTML = `
    <h3 class="land-h"><span class="land-ico" aria-hidden="true">🛂</span>Passport</h3>
    <div class="pp">
      <div class="pp-page">
        <div class="pp-head">
          <span class="pp-eyebrow">Shahd Airlines · SH024</span>
          <span class="pp-count" aria-live="polite"></span>
        </div>
        <div class="pp-slots"></div>
        <p class="pp-complete" hidden><span>Passport complete!</span></p>
      </div>
      <div class="pp-cover" aria-hidden="true">
        <div class="pp-cover-front">
          <span class="pp-cover-title">PASSPORT</span>
          <svg class="pp-emblem" viewBox="0 0 100 100">
            <g fill="none" stroke="currentColor" stroke-width="2.2">
              <circle cx="50" cy="50" r="38"/>
              <ellipse cx="50" cy="50" rx="16" ry="38"/>
              <path d="M12 50 H88 M18 30 H82 M18 70 H82"/>
            </g>
            <path fill="currentColor" d="M50 18 l6 14 h-4 l1 10 l14 8 v4 l-14 -4 l-1 10 l5 4 v3 l-7 -2 l-7 2 v-3 l5 -4 l-1 -10 l-14 4 v-4 l14 -8 l1 -10 h-4 z" transform="rotate(35 50 50)"/>
          </svg>
          <span class="pp-cover-sub">Shahd Airlines</span>
          <span class="pp-chip" aria-hidden="true"></span>
        </div>
        <div class="pp-cover-back"></div>
      </div>
    </div>`;

  const pp = root.querySelector('.pp');
  const slotsEl = root.querySelector('.pp-slots');
  const countEl = root.querySelector('.pp-count');
  const completeEl = root.querySelector('.pp-complete');
  const cover = root.querySelector('.pp-cover');
  const total = STOP_IDS.length;
  const shown = new Set();
  gsap.set(cover, { transformPerspective: 1400, transformOrigin: '0% 50%' });
  let visible = false;
  let opened = false;
  let celebrated = false;

  const render = () => {
    const today = new Date();
    const earned = STOP_IDS.filter(id => stamps.has(id));
    countEl.textContent = `${earned.length}/${total}`;
    const fresh = [];
    slotsEl.innerHTML = STOP_IDS.map((id, i) => {
      const info = STAMP_INFO[id];
      const has = stamps.has(id);
      if (has && !shown.has(id)) fresh.push(id);
      const rot = [-8, 6, -4, 7, -6][i];
      const inner = has
        ? stampSVG(id, today)
        : `<span class="pp-empty" aria-hidden="true"><span>${info.emoji}</span></span>`;
      return `<div class="pp-slot${has ? ' has' : ''}" data-id="${id}" style="--rot:${rot}deg">${inner}<span class="pp-label">${info.label}</span></div>`;
    }).join('');
    const complete = earned.length >= total;
    completeEl.hidden = !complete;
    pp.classList.toggle('complete', complete);
    return fresh;
  };

  const thunkFresh = fresh => {
    let delay = .15;
    for (const id of fresh) {
      shown.add(id);
      const svg = slotsEl.querySelector(`[data-id="${id}"] .stamp`);
      if (!svg) continue;
      gsap.set(svg, { opacity: 0 });
      gsap.delayedCall(delay, () => stampThunk(svg));
      delay += .28;
    }
  };

  const maybeCelebrate = () => {
    if (celebrated || !visible || !opened || stamps.count() < total) return;
    if (!STOP_IDS.every(id => stamps.has(id))) return;
    celebrated = true;
    gsap.delayedCall(reduced() ? 0 : .5, () => {
      celebrate('big', ['✈️', '🛫', '📮', '⭐']);
      if (!reduced()) {
        gsap.fromTo(completeEl, { scale: .6, rotation: -8, opacity: 0 }, { scale: 1, rotation: -3, opacity: 1, duration: .6, ease: 'back.out(2.4)' });
      }
    });
  };

  // stamps she already had are shown as-is (no thunk) once the cover opens
  render().forEach(id => shown.add(id));

  stamps.onChange(() => {
    const fresh = render();
    if (opened && visible) thunkFresh(fresh);
    else fresh.forEach(id => shown.add(id));
    maybeCelebrate();
  });

  const open = () => {
    if (opened) return;
    opened = true;
    if (reduced()) {
      cover.hidden = true;
      maybeCelebrate();
      return;
    }
    gsap.timeline({ onComplete: () => { cover.hidden = true; maybeCelebrate(); } })
      .to(cover, { rotationY: -160, duration: 1.25, ease: 'power3.inOut' })
      .to(cover, { opacity: 0, duration: .25 }, '-=.35')
      .from(slotsEl.children, { scale: .7, opacity: 0, duration: .45, stagger: .07, ease: 'back.out(2)' }, .45);
  };

  const io = new IntersectionObserver(entries => {
    for (const entry of entries) visible = entry.isIntersecting && entry.intersectionRatio >= .65;
    if (visible) {
      open();
      maybeCelebrate();
    }
  }, { threshold: [.7, .95] });
  io.observe(pp);

  splitReveal(root.querySelector('.land-h'));
}

/* ---------- sign-off (#signoff) ---------- */

function renderSignoff(root) {
  const phrase = daysAgoPhrase(daysSince(MET_DATE, new Date()));
  root.innerHTML = `
    <div class="note">
      <span class="note-tape" aria-hidden="true"></span>
      <div class="note-paper">
        <p class="note-p">${phrase} I didn't know you. Now I know your favorite chocolate, that you draw way better than me, and that you hate being called Shood. Can't wait to learn the rest.</p>
        <p class="note-crew">Crew note: best passenger we've ever had. Not even close.</p>
        <p class="note-sign">— Yousef, your co-pilot (for any flight you want ✈️)</p>
        <p class="note-ar"><span lang="ar" dir="rtl">يلا قوليلي، اتبسطتي؟ 😄</span></p>
      </div>
    </div>`;
}

/* ---------- motion for the landing ---------- */

function landingMotion(rootEl) {
  const mm = gsap.matchMedia();
  mm.add(MOTION, ctx => {
    if (ctx.conditions.reduce) return;
    // postcards drop in like they're being pinned up
    gsap.utils.toArray(rootEl.querySelectorAll('.postcard')).forEach((card, i) => {
      gsap.from(card, {
        y: 46, rotation: i % 2 ? 6 : -6, opacity: 0, duration: .8, ease: 'back.out(1.5)',
        scrollTrigger: { trigger: card, start: 'top 88%', once: true },
      });
    });
    gsap.from(rootEl.querySelectorAll('#next .nx-viewport, #next .nx-dots'), {
      y: 40, opacity: 0, duration: .8, ease: 'power3.out', stagger: .1,
      scrollTrigger: { trigger: rootEl.querySelector('#next'), start: 'top 80%', once: true },
    });
    gsap.from(rootEl.querySelector('#globe .globe-legend'), {
      y: 14, opacity: 0, duration: .6, ease: 'power2.out',
      scrollTrigger: { trigger: rootEl.querySelector('#globe'), start: 'top 75%', once: true },
    });
    // the note unfolds
    const note = rootEl.querySelector('.note');
    const paper = rootEl.querySelector('.note-paper');
    if (note && paper) {
      gsap.set(note, { transformPerspective: 900 });
      gsap.timeline({ scrollTrigger: { trigger: note, start: 'top 82%', once: true } })
        .from(note, { rotationX: -82, transformOrigin: '50% 0%', opacity: 0, duration: 1, ease: 'power3.out' })
        .from(rootEl.querySelector('.note-tape'), { scaleX: 0, duration: .35, ease: 'power2.out' }, .1)
        .from(paper.children, { y: 14, opacity: 0, duration: .55, stagger: .22, ease: 'power2.out' }, .45)
        .from(rootEl.querySelector('.note-ar'), { scale: .6, duration: .6, ease: 'back.out(3)' }, '>-.3');
    }
  });
}

/* ---------- globe (lazy) ---------- */

function renderGlobe(root, onPick) {
  root.innerHTML = `
    <div class="globe-stage">
      <div class="globe-halo" aria-hidden="true"></div>
      <div class="globe-ph" aria-hidden="true"></div>
    </div>
    <div class="globe-legend">
      <span class="lg lg-been"><i aria-hidden="true"></i>Places you've been</span>
      <span class="lg lg-next"><i aria-hidden="true"></i>Where to next?</span>
    </div>`;
  const stage = root.querySelector('.globe-stage');
  const ph = root.querySelector('.globe-ph');
  let started = false;

  const fallback = err => {
    if (import.meta.env.DEV && err) console.warn('[landing] globe unavailable, using the route map:', err?.message ?? err);
    stage.classList.add('is-flat');
    stage.querySelector('.globe-canvas')?.remove();
    stage.querySelector('.globe-labels')?.remove();
    mountRouteMap(stage, { places: PLACES, onPick });
    ph.remove();
  };

  const start = () => {
    if (started) return;
    started = true;
    import('./globe.js')
      .then(m => m.mountGlobe(stage, { places: PLACES, onPick }))
      .then(() => ph.remove())
      .catch(fallback);
  };

  if (typeof IntersectionObserver === 'undefined') { start(); return; }
  const io = new IntersectionObserver(entries => {
    if (entries.some(e => e.isIntersecting)) {
      io.disconnect();
      start();
    }
  }, { rootMargin: '600px 0px 600px 0px' });
  io.observe(root);
}

/* ---------- entry ---------- */

export function initLanding(rootEl, { stamps, booked }) {
  delete rootEl.dataset.stub;
  rootEl.classList.add('landing-ready');

  const been = renderBeen(rootEl.querySelector('#been'));
  const next = renderNext(rootEl.querySelector('#next'), booked);
  renderPassport(rootEl.querySelector('#passport-spread'), stamps);
  renderSignoff(rootEl.querySelector('#signoff'));

  const onPick = (id, pt) => {
    const place = PLACE[id];
    if (!place) return;
    if (pt) burst(pt.x, pt.y, place.kind === 'next' ? ['🧳', '✨'] : ['📍', '✨'], 8);
    haptic(10);
    if (place.kind === 'been') been.flip(id);
    else if (place.kind === 'next') next.show(id);
  };
  renderGlobe(rootEl.querySelector('#globe'), onPick);

  landingMotion(rootEl);
  // the landing changed the page height: let the flight path and triggers re-measure
  requestAnimationFrame(() => ScrollTrigger.refresh());
}

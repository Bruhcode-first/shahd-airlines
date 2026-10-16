// Passport: stamp artwork, the fixed badge and the passport sheet.
import { STOP_IDS } from './stamps.js';
import { gsap, reduced, stampThunk } from './motion.js';
import { burst } from './fx.js';

export const STAMP_INFO = {
  pingpong: { emoji: '🏓', label: 'PING PONG ISLAND' },
  sudoku: { emoji: '🌙', label: 'SUDOKU LOUNGE' },
  doodle: { emoji: '🎨', label: 'DOODLE STUDIO' },
  sweets: { emoji: '🍫', label: 'THE SWEET SHOP' },
  badminton: { emoji: '🏸', label: 'BADMINTON COURT' },
};

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const formatDate = d => `${String(d.getDate()).padStart(2, '0')} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;

let uid = 0;

/** A 120×120 inky passport stamp as an SVG string. */
export function stampSVG(id, date = new Date()) {
  const info = STAMP_INFO[id] ?? { emoji: '✈️', label: String(id).toUpperCase() };
  const index = Math.max(0, STOP_IDS.indexOf(id));
  const color = index % 2 === 1 ? '#FF6B6B' : '#2EC4B6';
  const deep = index % 2 === 1 ? '#E04848' : '#12867C';
  const pathId = `stamp-arc-${id}-${++uid}`;
  const dateText = formatDate(date);
  return `<svg class="stamp" data-stamp="${id}" viewBox="0 0 120 120" width="120" height="120" role="img" aria-label="${info.label} stamp, ${dateText}" xmlns="http://www.w3.org/2000/svg">
  <defs><path id="${pathId}" d="M 19 60 A 41 41 0 0 1 101 60"/></defs>
  <g filter="url(#ink)">
    <circle cx="60" cy="60" r="56" fill="none" stroke="${color}" stroke-width="3.2"/>
    <circle cx="60" cy="60" r="50.5" fill="none" stroke="${color}" stroke-width="1.3"/>
    <circle cx="60" cy="60" r="31" fill="${color}" fill-opacity=".09" stroke="${color}" stroke-width="1.3" stroke-dasharray="2.4 2.6"/>
    <text font-family="'Space Mono', monospace" font-size="9.4" font-weight="700" letter-spacing="1.1" fill="${deep}">
      <textPath href="#${pathId}" startOffset="50%" text-anchor="middle">${info.label}</textPath>
    </text>
    <circle cx="13" cy="60" r="2" fill="${color}"/>
    <circle cx="107" cy="60" r="2" fill="${color}"/>
    <rect x="17" y="76" width="86" height="17" rx="3" fill="#FFFFFF" fill-opacity=".6" stroke="${color}" stroke-width="1.6"/>
    <text x="60" y="88.4" text-anchor="middle" font-family="'Space Mono', monospace" font-size="10.5" font-weight="700" letter-spacing=".6" fill="${deep}">${dateText}</text>
    <text x="40" y="104" font-family="'Space Mono', monospace" font-size="6.5" font-weight="700" letter-spacing="1.4" fill="${color}">SH024 · OK</text>
  </g>
  <text x="60" y="66" text-anchor="middle" font-size="27" style="font-family:'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji',sans-serif">${info.emoji}</text>
</svg>`;
}

/** Wires the fixed badge and the passport sheet to a stamp store. */
export function initPassport(store) {
  const badge = document.getElementById('passport-badge');
  const sheet = document.getElementById('passport-sheet');
  if (!badge) return;
  const countEl = badge.querySelector('.pb-count') ?? badge;
  const slotsEl = sheet?.querySelector('.ps-slots');
  const sheetCount = sheet?.querySelector('.ps-count');
  const unseen = new Set();
  const total = STOP_IDS.length;

  const renderBadge = () => {
    const n = Math.min(store.count(), total);
    countEl.textContent = `${n}/${total}`;
    badge.setAttribute('aria-label', `Passport: ${n} of ${total} stamps`);
    badge.classList.toggle('complete', n >= total);
  };

  const bump = () => {
    badge.classList.remove('bump');
    void badge.offsetWidth; // restart the CSS animation
    badge.classList.add('bump');
  };
  badge.addEventListener('animationend', () => badge.classList.remove('bump'));

  const renderSheet = () => {
    if (!slotsEl) return;
    const today = new Date();
    const earned = STOP_IDS.filter(id => store.has(id)).length;
    if (sheetCount) sheetCount.textContent = `${earned}/${total} · ${earned === total ? 'COMPLETE' : 'STAMPS'}`;
    slotsEl.innerHTML = STOP_IDS.map((id, i) => {
      const info = STAMP_INFO[id];
      const rot = [-7, 5, -3, 8, -5][i];
      const inner = store.has(id)
        ? stampSVG(id, today)
        : `<span class="ps-empty" aria-hidden="true">${info.emoji}</span>`;
      return `<div class="ps-slot${store.has(id) ? ' has-stamp' : ''}" data-id="${id}" style="--rot:${rot}deg">${inner}<span class="ps-label">${info.label}</span></div>`;
    }).join('');
  };

  const playUnseen = () => {
    if (!slotsEl || unseen.size === 0) return;
    let delay = .25;
    for (const id of unseen) {
      const svg = slotsEl.querySelector(`[data-id="${id}"] .stamp`);
      if (svg) {
        gsap.set(svg, { opacity: 0 });
        gsap.delayedCall(delay, () => stampThunk(svg));
        delay += .35;
      }
    }
    unseen.clear();
  };

  const open = () => {
    if (!sheet) return;
    renderSheet();
    if (typeof sheet.showModal === 'function') {
      if (!sheet.open) sheet.showModal();
    } else {
      sheet.setAttribute('open', '');
    }
    const inner = sheet.querySelector('.ps-inner');
    if (!reduced() && inner) {
      gsap.fromTo(inner, { yPercent: 100 }, { yPercent: 0, duration: .5, ease: 'expo.out' });
      gsap.fromTo(sheet.querySelectorAll('.ps-slot'), { y: 24, opacity: 0 }, {
        y: 0, opacity: 1, duration: .4, stagger: .05, delay: .12, ease: 'back.out(1.6)',
      });
    }
    playUnseen();
  };

  const close = () => {
    if (!sheet?.open) return;
    const inner = sheet.querySelector('.ps-inner');
    const done = () => (typeof sheet.close === 'function' ? sheet.close() : sheet.removeAttribute('open'));
    if (reduced() || !inner) return done();
    gsap.to(inner, { yPercent: 100, duration: .3, ease: 'power2.in', onComplete: () => { done(); gsap.set(inner, { yPercent: 0 }); } });
  };

  badge.addEventListener('click', open);
  sheet?.querySelector('.ps-close')?.addEventListener('click', close);
  sheet?.addEventListener('click', e => { if (e.target === sheet) close(); });
  sheet?.addEventListener('cancel', e => { e.preventDefault(); close(); });

  store.onChange((ids, id) => {
    renderBadge();
    bump();
    if (id) unseen.add(id);
    const r = badge.getBoundingClientRect();
    burst(r.left + r.width / 2, r.top + r.height / 2, ['✨', STAMP_INFO[id]?.emoji ?? '⭐'], 8);
    if (sheet?.open) {
      renderSheet();
      playUnseen();
    }
  });

  renderBadge();
  return { open, close, bump, render: renderBadge };
}

import '../../css/stops/doodle.css';
import { gsap, reduced } from '../motion.js';
import { toast, burst, celebrate, shake, haptic, onVisible } from '../fx.js';
import { setupCanvas, localPoint } from './canvas.js';
import { shareMethod } from './doodle-share.js';

const SIZE = 360;
const COLORS = [
  ['#1F2A44', 'Ink'], ['#FF6B6B', 'Coral'], ['#2EC4B6', 'Sea'],
  ['#F5B841', 'Honey'], ['#8EC5FF', 'Sky'], ['#FF8FB1', 'Candy'],
];
const BRUSHES = [[4, 'Thin brush'], [10, 'Thick brush']];
const ANSWERS = ['A jellyfish', 'A lamp', 'An ice cream', 'A shuttlecock'];
const RIGHT = 'A shuttlecock';

// A deliberately wobbly shuttlecock: cork, rim band, feather cone, two ribs.
const PATHS = [
  'M66 151 C64 172 80 187 101 186 C122 187 137 171 134 150',
  'M64 149 L135 152 L137 136 L62 134 Z',
  'M63 134 C56 104 42 70 33 44 C52 33 72 41 88 33 C104 41 120 31 143 35 C160 33 168 43 166 46 C158 72 146 104 138 135',
  'M86 135 C83 108 78 80 72 49',
  'M114 136 C116 108 122 80 130 48',
];

const el = (tag, cls, html) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (html != null) n.innerHTML = html;
  return n;
};

export function init(stageEl, ctx) {
  const award = ctx?.award ?? (() => {});

  /* ================= Part 1: guess my drawing ================= */
  const guess = el('div', 'dd-guess');
  guess.innerHTML = `
    <div class="dd-book card">
      <span class="dd-tape dd-tape-l" aria-hidden="true"></span>
      <span class="dd-tape dd-tape-r" aria-hidden="true"></span>
      <svg class="dd-art" viewBox="0 0 200 200" role="img" aria-label="A wobbly pencil drawing of something. Guess what it is." focusable="false">
        ${PATHS.map(d => `<path d="${d}" />`).join('')}
      </svg>
      <span class="dd-pencil" aria-hidden="true">✏️</span>
    </div>
    <div class="dd-answers" role="group" aria-label="What is it?">
      ${ANSWERS.map(a => `<button type="button" class="dd-answer" data-a="${a}" disabled>${a}</button>`).join('')}
    </div>
    <div class="dd-result" role="status" aria-live="polite"></div>`;
  const svg = guess.querySelector('.dd-art');
  const paths = [...svg.querySelectorAll('path')];
  const pencil = guess.querySelector('.dd-pencil');
  const book = guess.querySelector('.dd-book');
  const answerBtns = [...guess.querySelectorAll('.dd-answer')];
  const result = guess.querySelector('.dd-result');

  const enableAnswers = () => {
    svg.dataset.drawn = '1';
    answerBtns.forEach(b => { b.disabled = false; });
    gsap.to(pencil, { opacity: 0, scale: .6, duration: .3 });
  };

  let started = false;
  const drawIt = () => {
    if (started) return;
    started = true;
    if (reduced()) {
      gsap.set(paths, { drawSVG: '100%' });
      gsap.set(pencil, { display: 'none' });
      enableAnswers();
      return;
    }
    const tl = gsap.timeline({ onComplete: enableAnswers });
    setTimeout(() => { if (!svg.dataset.drawn) { tl.progress(1); } }, 9000); // never leave her stuck on a slow phone
    gsap.set(pencil, { opacity: 1, scale: 1 });
    paths.forEach((p, i) => {
      const len = p.getTotalLength();
      const dur = i === 2 ? 1.25 : i === 1 ? .6 : .7;
      const st = { t: 0 };
      tl.fromTo(p, { drawSVG: '0%' }, { drawSVG: '100%', duration: dur, ease: 'sine.inOut' });
      // the pencil tip follows the stroke being drawn
      tl.to(st, {
        t: 1, duration: dur, ease: 'sine.inOut',
        onUpdate() {
          const pt = p.getPointAtLength(len * st.t);
          const off = svg.getBoundingClientRect();
          const bb = book.getBoundingClientRect();
          const k = off.width / 200;
          gsap.set(pencil, { x: off.left - bb.left + pt.x * k, y: off.top - bb.top + pt.y * k });
        },
      }, '<');
      tl.to({}, { duration: .12 });
    });
  };
  gsap.set(paths, { drawSVG: '0%' });

  let answered = false;
  answerBtns.forEach(btn => btn.addEventListener('click', () => {
    if (answered || btn.disabled) return;
    answered = true;
    const correct = btn.dataset.a === RIGHT;
    answerBtns.forEach(b => {
      b.disabled = true;
      if (b.dataset.a === RIGHT) b.classList.add('is-right');
    });
    btn.classList.add(correct ? 'is-picked-right' : 'is-picked-wrong');
    result.innerHTML = '';
    const line = el('p', `dd-line ${correct ? 'is-good' : 'is-oops'}`,
      correct ? "You actually got it?! That's more talent than my drawing deserves."
              : "Honestly… fair. It's a shuttlecock 😭");
    const then = el('p', 'dd-line dd-then', 'Now you see why you won the drawing round.');
    result.append(line, then);
    haptic(18);
    const r = btn.getBoundingClientRect();
    if (correct) {
      burst(r.left + r.width / 2, r.top + r.height / 2, ['🏸', '⭐', '🎨'], 12);
      celebrate('small', ['🏸', '⭐']);
    } else {
      shake(book, 5);
      burst(r.left + r.width / 2, r.top + r.height / 2, ['😭', '🏸'], 6);
    }
    if (!reduced()) {
      gsap.from(line, { opacity: 0, y: 14, duration: .45, ease: 'back.out(1.6)' });
      gsap.from(then, { opacity: 0, y: 14, duration: .45, delay: .9, ease: 'power2.out' });
    }
    award('doodle');
  }));

  /* ================= Part 2: your turn ================= */
  const studio = el('div', 'dd-studio');
  studio.innerHTML = `
    <h3 class="dd-prompt">Your turn: draw your dream destination</h3>
    <div class="dd-paper card">
      <span class="dd-tape dd-tape-l" aria-hidden="true"></span>
      <span class="dd-tape dd-tape-r" aria-hidden="true"></span>
      <canvas class="dd-canvas" aria-label="Drawing canvas. Draw with your finger."></canvas>
      <div class="dd-hint" aria-hidden="true"><span>✏️</span> draw here</div>
    </div>
    <p class="dd-artist" role="status" aria-live="polite"></p>
    <div class="dd-tools">
      <div class="dd-swatches" role="radiogroup" aria-label="Colour">
        ${COLORS.map(([c, n], i) => `<button type="button" class="dd-swatch" role="radio" aria-checked="${i === 0}" aria-label="${n}" data-c="${c}" style="--c:${c}"></button>`).join('')}
      </div>
      <div class="dd-brushes" role="radiogroup" aria-label="Brush size">
        ${BRUSHES.map(([s, n], i) => `<button type="button" class="dd-brush" role="radio" aria-checked="${i === 0}" aria-label="${n}" data-s="${s}"><i style="--d:${s + 4}px"></i></button>`).join('')}
      </div>
    </div>
    <div class="dd-row">
      <button type="button" class="btn btn-ghost dd-undo" disabled>↩️ Undo</button>
      <button type="button" class="btn btn-ghost dd-clear" disabled>🧽 Clear</button>
    </div>
    <div class="dd-row dd-actions">
      <button type="button" class="btn dd-save">💾 Save</button>
      <button type="button" class="btn btn-coral dd-send">💌 Send to Yousef</button>
    </div>`;
  stageEl.replaceChildren(guess, studio);
  delete stageEl.dataset.stub;

  const canvas = studio.querySelector('.dd-canvas');
  const c2d = setupCanvas(canvas, SIZE, SIZE);
  const hint = studio.querySelector('.dd-hint');
  const artist = studio.querySelector('.dd-artist');
  const undoBtn = studio.querySelector('.dd-undo');
  const clearBtn = studio.querySelector('.dd-clear');

  let color = COLORS[0][0];
  let brush = BRUSHES[0][0];
  const ops = []; // strokes {color,size,pts} and {clear:true}
  let cur = null;
  let announced = false;

  const style = (s) => {
    c2d.strokeStyle = s.color; c2d.fillStyle = s.color;
    c2d.lineWidth = s.size; c2d.lineCap = 'round'; c2d.lineJoin = 'round';
  };
  const whiten = () => { c2d.fillStyle = '#FFFFFF'; c2d.fillRect(0, 0, SIZE, SIZE); };
  const drawStroke = (s) => {
    const p = s.pts;
    style(s);
    if (p.length === 1) {
      c2d.beginPath(); c2d.arc(p[0].x, p[0].y, s.size / 2, 0, Math.PI * 2); c2d.fill();
      return;
    }
    c2d.beginPath();
    c2d.moveTo(p[0].x, p[0].y);
    for (let i = 1; i < p.length - 1; i++) {
      c2d.quadraticCurveTo(p[i].x, p[i].y, (p[i].x + p[i + 1].x) / 2, (p[i].y + p[i + 1].y) / 2);
    }
    c2d.lineTo(p[p.length - 1].x, p[p.length - 1].y);
    c2d.stroke();
  };
  const render = () => {
    whiten();
    for (const o of ops) {
      if (o.clear) whiten(); else drawStroke(o);
    }
  };
  const syncButtons = () => {
    undoBtn.disabled = ops.length === 0;
    clearBtn.disabled = ops.length === 0 || ops[ops.length - 1].clear;
  };
  whiten();

  const down = (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.preventDefault();
    try { canvas.setPointerCapture(e.pointerId); } catch { /* ignore */ }
    const pt = localPoint(canvas, e, SIZE, SIZE);
    cur = { color, size: brush, pts: [pt] };
    ops.push(cur);
    drawStroke(cur); // shows a dot immediately
    hint.classList.add('is-gone');
  };
  const move = (e) => {
    if (!cur) return;
    e.preventDefault();
    const pt = localPoint(canvas, e, SIZE, SIZE);
    const last = cur.pts[cur.pts.length - 1];
    if (Math.hypot(pt.x - last.x, pt.y - last.y) < .8) return;
    cur.pts.push(pt);
    const p = cur.pts, n = p.length;
    style(cur);
    c2d.beginPath();
    if (n === 2) {
      c2d.moveTo(p[0].x, p[0].y);
      c2d.lineTo((p[0].x + p[1].x) / 2, (p[0].y + p[1].y) / 2);
    } else {
      const a = p[n - 3], b = p[n - 2], c = p[n - 1];
      c2d.moveTo((a.x + b.x) / 2, (a.y + b.y) / 2);
      c2d.quadraticCurveTo(b.x, b.y, (b.x + c.x) / 2, (b.y + c.y) / 2);
    }
    c2d.stroke();
  };
  const up = () => {
    if (!cur) return;
    cur = null;
    render(); // identical smoothing as undo/redraw
    syncButtons();
    if (!announced) {
      announced = true;
      artist.textContent = "Artist of the night: Shahd 🎨 (it wasn't close)";
      if (!reduced()) gsap.from(artist, { opacity: 0, y: 10, duration: .5, ease: 'back.out(1.6)' });
      celebrate('small', ['🎨', '✨']);
    }
  };
  canvas.addEventListener('pointerdown', down);
  canvas.addEventListener('pointermove', move);
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', up);
  canvas.addEventListener('contextmenu', e => e.preventDefault());

  const radio = (sel, apply) => {
    const btns = [...studio.querySelectorAll(sel)];
    btns.forEach(b => b.addEventListener('click', () => {
      btns.forEach(x => x.setAttribute('aria-checked', String(x === b)));
      apply(b);
      haptic(8);
      if (!reduced()) gsap.fromTo(b, { scale: .8 }, { scale: 1, duration: .35, ease: 'back.out(3)' });
    }));
  };
  radio('.dd-swatch', b => { color = b.dataset.c; });
  radio('.dd-brush', b => { brush = Number(b.dataset.s); });

  undoBtn.addEventListener('click', () => { ops.pop(); render(); syncButtons(); haptic(8); });
  clearBtn.addEventListener('click', () => {
    ops.push({ clear: true }); render(); syncButtons(); haptic(14);
    shake(canvas.parentElement, 4);
  });

  /* ---- save / send ---- */
  const toBlob = () => new Promise((resolve, reject) => {
    try {
      canvas.toBlob(b => (b ? resolve(b) : reject(new Error('empty'))), 'image/png');
    } catch (err) { reject(err); }
  });
  const makeFile = async () => new File([await toBlob()], 'shahd-doodle.png', { type: 'image/png' });
  const downloadFile = (file) => {
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url; a.download = file.name;
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  };

  let overlay = null;
  const showOverlay = () => {
    overlay?.remove();
    const url = canvas.toDataURL('image/png');
    overlay = el('div', 'dd-overlay');
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'dd-ov-title');
    overlay.innerHTML = `
      <div class="dd-ov-card card">
        <p id="dd-ov-title" class="dd-ov-title">Saved! Send it to me on Discord 😄</p>
        <img class="dd-ov-img" alt="Your doodle" src="${url}">
        <p class="dd-ov-note">If nothing downloaded, long-press the picture to save it.</p>
        <button type="button" class="btn dd-ov-close">Done</button>
      </div>`;
    document.body.append(overlay);
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    const close = () => {
      overlay?.remove(); overlay = null;
      document.removeEventListener('keydown', onKey);
      studio.querySelector('.dd-send').focus({ preventScroll: true });
    };
    document.addEventListener('keydown', onKey);
    overlay.querySelector('.dd-ov-close').addEventListener('click', close);
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
    overlay.querySelector('.dd-ov-close').focus({ preventScroll: true });
    if (!reduced()) {
      gsap.from(overlay, { opacity: 0, duration: .25 });
      gsap.from(overlay.firstElementChild, { y: 40, scale: .94, duration: .45, ease: 'back.out(1.5)' });
    }
  };

  studio.querySelector('.dd-save').addEventListener('click', async () => {
    try {
      downloadFile(await makeFile());
      toast('Saved shahd-doodle.png ✅');
    } catch { toast('Could not save that one 😅'); }
  });

  studio.querySelector('.dd-send').addEventListener('click', async () => {
    let file;
    try { file = await makeFile(); } catch { toast('Could not make the picture 😅'); return; }
    if (shareMethod(navigator, file) === 'share') {
      try {
        await navigator.share({ files: [file], title: 'My doodle for you' });
        return;
      } catch (err) {
        if (err && err.name === 'AbortError') return;
        // any other failure: fall through to saving it
      }
    }
    try { downloadFile(file); } catch { /* the overlay still lets her long-press */ }
    showOverlay();
  });

  /* ---- start drawing when the sketchbook is on screen ---- */
  onVisible(book, drawIt, .45);
  if (import.meta.env.DEV && window.__sh024?.games) {
    window.__sh024.games.doodle = { get strokes() { return ops.filter(o => !o.clear).length; } };
  }
}

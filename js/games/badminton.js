import '../../css/stops/badminton.css';
import { gsap, MOTION } from '../motion.js';
import { celebrate, shake, haptic } from '../fx.js';
import { createProgress } from './progress.js';
import { setupCanvas, loop } from './canvas.js';

/* Badminton Court: tap when the shuttle is inside the glowing zone. */

const W = 360;
const H = 480;
const CX = W / 2;
const ZONE_Y = 395;
const GOAL = 5;
const SERVE_SECONDS = 1.8;
const NET_TOP = 166;
const NET_BOTTOM = 216;
const PIVOT_Y = 492; // racket grip pivot (just below the canvas edge)

const COLORS = {
  coral: '#FF6B6B',
  coralDeep: '#D84F4F',
  sea: '#2EC4B6',
  seaDeep: '#12867C',
  sky: '#EAF6FF',
  skyDeep: '#8EC5FF',
  sand: '#F6E7C8',
  ink: '#1F2A44',
  honey: '#FFD66B',
};

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (a, b) => a + Math.random() * (b - a);

/* ---------- static background (drawn once into an offscreen canvas) ---------- */

// The floor is a trapezoid seen from behind her baseline: narrow at the net, wide at her feet.
const floorLeft = y => lerp(70, -70, (y - NET_BOTTOM) / (H - NET_BOTTOM));
const floorRight = y => lerp(290, 430, (y - NET_BOTTOM) / (H - NET_BOTTOM));
const floorX = (f, y) => lerp(floorLeft(y), floorRight(y), f);

function paintBackground(ctx) {
  // wall
  const wall = ctx.createLinearGradient(0, 0, 0, NET_BOTTOM);
  wall.addColorStop(0, '#BFE0FF');
  wall.addColorStop(1, '#EAF6FF');
  ctx.fillStyle = wall;
  ctx.fillRect(0, 0, W, NET_BOTTOM + 2);

  // soft sun glow behind the net
  const glow = ctx.createRadialGradient(CX, 130, 6, CX, 130, 190);
  glow.addColorStop(0, 'rgba(255,255,255,.85)');
  glow.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, NET_BOTTOM);

  // wall panels
  ctx.strokeStyle = 'rgba(255,255,255,.55)';
  ctx.lineWidth = 2;
  for (let x = 30; x < W; x += 60) {
    ctx.beginPath();
    ctx.moveTo(x, 20);
    ctx.lineTo(x, NET_BOTTOM);
    ctx.stroke();
  }

  // sponsor boards
  const board = (x, y, w, h, fill, emoji) => {
    ctx.fillStyle = 'rgba(31,42,68,.08)';
    roundRect(ctx, x + 2, y + 4, w, h, 9);
    ctx.fill();
    ctx.fillStyle = fill;
    roundRect(ctx, x, y, w, h, 9);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.8)';
    ctx.lineWidth = 2.5;
    roundRect(ctx, x + 4, y + 4, w - 8, h - 8, 6);
    ctx.stroke();
    ctx.font = '26px system-ui, "Apple Color Emoji", "Segoe UI Emoji", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(emoji, x + w / 2, y + h / 2 + 1);
  };
  board(20, 62, 74, 52, COLORS.sea, '🏸');
  board(266, 62, 74, 52, COLORS.coral, '✈️');

  // padded lower wall
  const pad = ctx.createLinearGradient(0, 150, 0, NET_BOTTOM);
  pad.addColorStop(0, '#F6E7C8');
  pad.addColorStop(1, '#E9D2A4');
  ctx.fillStyle = pad;
  ctx.fillRect(0, 168, W, NET_BOTTOM - 168 + 2);
  ctx.strokeStyle = 'rgba(31,42,68,.08)';
  ctx.lineWidth = 1;
  for (let x = 24; x < W; x += 48) {
    ctx.beginPath();
    ctx.moveTo(x, 168);
    ctx.lineTo(x, NET_BOTTOM);
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(255,255,255,.6)';
  ctx.fillRect(0, 168, W, 3);

  // bunting
  const flags = [COLORS.coral, COLORS.sea, COLORS.honey, COLORS.skyDeep, '#FFFBF4'];
  ctx.strokeStyle = 'rgba(31,42,68,.35)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  for (let i = 0; i <= 36; i++) {
    const x = (i / 36) * W;
    const y = 6 + Math.sin((i / 36) * Math.PI) * 24;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.stroke();
  for (let i = 0; i < 11; i++) {
    const u = (i + 0.5) / 11;
    const x = u * W;
    const y = 6 + Math.sin(u * Math.PI) * 24;
    ctx.fillStyle = flags[i % flags.length];
    ctx.beginPath();
    ctx.moveTo(x - 10, y);
    ctx.lineTo(x + 10, y);
    ctx.lineTo(x, y + 20);
    ctx.closePath();
    ctx.fill();
  }

  // floor
  const floor = ctx.createLinearGradient(0, NET_BOTTOM, 0, H);
  floor.addColorStop(0, '#5DDBCE');
  floor.addColorStop(0.55, '#2EC4B6');
  floor.addColorStop(1, '#16A093');
  ctx.fillStyle = floor;
  ctx.beginPath();
  ctx.moveTo(floorLeft(NET_BOTTOM), NET_BOTTOM);
  ctx.lineTo(floorRight(NET_BOTTOM), NET_BOTTOM);
  ctx.lineTo(floorRight(H), H);
  ctx.lineTo(floorLeft(H), H);
  ctx.closePath();
  ctx.fill();

  // surrounding floor outside the court (warm sand)
  ctx.save();
  ctx.globalCompositeOperation = 'destination-over';
  const out = ctx.createLinearGradient(0, NET_BOTTOM, 0, H);
  out.addColorStop(0, '#F3DDB0');
  out.addColorStop(1, '#E2C48C');
  ctx.fillStyle = out;
  ctx.fillRect(0, NET_BOTTOM, W, H - NET_BOTTOM);
  ctx.restore();

  // floorboards
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(floorLeft(NET_BOTTOM), NET_BOTTOM);
  ctx.lineTo(floorRight(NET_BOTTOM), NET_BOTTOM);
  ctx.lineTo(floorRight(H), H);
  ctx.lineTo(floorLeft(H), H);
  ctx.closePath();
  ctx.clip();
  ctx.strokeStyle = 'rgba(255,255,255,.12)';
  ctx.lineWidth = 1;
  for (let f = 0; f <= 1.001; f += 1 / 14) {
    ctx.beginPath();
    ctx.moveTo(floorX(f, NET_BOTTOM), NET_BOTTOM);
    ctx.lineTo(floorX(f, H), H);
    ctx.stroke();
  }
  ctx.restore();

  // court lines
  ctx.strokeStyle = 'rgba(255,255,255,.96)';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  const vline = (f, y0 = NET_BOTTOM, y1 = H + 4) => {
    ctx.beginPath();
    ctx.moveTo(floorX(f, y0), y0);
    ctx.lineTo(floorX(f, y1), y1);
    ctx.stroke();
  };
  const hline = (f0, f1, y) => {
    ctx.beginPath();
    ctx.moveTo(floorX(f0, y), y);
    ctx.lineTo(floorX(f1, y), y);
    ctx.stroke();
  };
  vline(0.04);
  vline(0.96);
  vline(0.12);
  vline(0.88);
  vline(0.5, 262, H + 4);
  hline(0.04, 0.96, 262);
  hline(0.04, 0.96, 318);

  // shade just under the net
  const shade = ctx.createLinearGradient(0, NET_BOTTOM, 0, NET_BOTTOM + 40);
  shade.addColorStop(0, 'rgba(18,134,124,.35)');
  shade.addColorStop(1, 'rgba(18,134,124,0)');
  ctx.fillStyle = shade;
  ctx.fillRect(0, NET_BOTTOM, W, 40);

  // vignette
  const vig = ctx.createRadialGradient(CX, H * 0.55, H * 0.35, CX, H * 0.55, H * 0.85);
  vig.addColorStop(0, 'rgba(31,42,68,0)');
  vig.addColorStop(1, 'rgba(31,42,68,.14)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, W, H);
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/* ---------- module ---------- */

export function init(stageEl, { award = () => {} } = {}) {

  /* reduced-motion branch for every tween (gsap.matchMedia keeps this live) */
  const flags = { motion: true };
  const mm = gsap.matchMedia();
  mm.add(MOTION, ctx => {
    flags.motion = !ctx.conditions.reduce;
  });

  /* ----- markup ----- */
  stageEl.innerHTML = '';
  const wrap = el('div', 'bd-wrap');
  const hudRow = el('div', 'bd-hud');
  const hudText = el('span', 'bd-hud-text');
  hudText.setAttribute('aria-live', 'polite');
  const pips = el('span', 'bd-pips');
  pips.setAttribute('aria-hidden', 'true');
  const pipEls = [];
  for (let i = 0; i < GOAL; i++) {
    const p = el('span', 'bd-pip', '🏸');
    pips.append(p);
    pipEls.push(p);
  }
  hudRow.append(hudText, pips);

  const court = el('div', 'bd-court');
  const canvas = document.createElement('canvas');
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'Badminton court. Tap when the shuttle is inside the glowing zone.');
  court.append(canvas);

  const actions = el('div', 'bd-actions');
  const smashBtn = el('button', 'btn btn-coral bd-smash', 'SMASH 🏸');
  smashBtn.type = 'button';
  const skipBtn = el('button', 'btn btn-ghost bd-skip', "Skip, I'll stamp it anyway 😅");
  skipBtn.type = 'button';
  skipBtn.hidden = true;
  actions.append(smashBtn, skipBtn);

  const winPanel = el('div', 'bd-win card');
  winPanel.hidden = true;
  winPanel.setAttribute('role', 'status');
  const winText = el('p', 'bd-win-text', 'No net can stop you 🏸');
  const againBtn = el('button', 'btn bd-again', 'Play again');
  againBtn.type = 'button';
  winPanel.append(winText, againBtn);

  wrap.append(hudRow, court, actions, winPanel);
  stageEl.append(wrap);

  const ctx = setupCanvas(canvas, W, H);

  // pre-rendered background
  const bg = document.createElement('canvas');
  const bgCtx = setupCanvas(bg, W, H);
  paintBackground(bgCtx);

  /* ----- state ----- */
  const progress = createProgress({ goal: GOAL, skipAfter: 4 });
  let phase = 'wait'; // wait | serve | done
  let done = false;
  let finishing = false;
  let timer = 0.5;
  let rt = 0; // real-time clock
  let slowUntil = 0;
  let net = 0; // net wobble energy

  let shuttle = null; // { u, x0, x1, x, y, vx, trail }
  let drop = null; // { x, y, vy, alpha, s, tilt }
  let flights = []; // smashed shuttles flying away
  let sparks = [];
  let rings = [];
  let rack = { angle: 0, glow: 0 };
  let zoneH = 110;
  let zoneLit = 0;

  const zoneTarget = () => Math.max(60, 110 - 10 * progress.hits);

  function setPhase(p) {
    phase = p;
    stageEl.dataset.state = p;
  }

  function updateHud() {
    hudText.textContent = `Smashes: ${progress.hits}/${GOAL}`;
    pipEls.forEach((p, i) => {
      const on = i < progress.hits;
      const was = p.classList.contains('on');
      p.classList.toggle('on', on);
      if (on && !was && flags.motion) {
        gsap.fromTo(p, { scale: 0.4, rotation: -40 }, { scale: 1, rotation: 0, duration: 0.5, ease: 'back.out(3)' });
      }
    });
    const showSkip = progress.canSkip && !done;
    if (showSkip && skipBtn.hidden) {
      skipBtn.hidden = false;
      if (flags.motion) gsap.from(skipBtn, { opacity: 0, y: 10, duration: 0.4, ease: 'power2.out' });
    } else if (!showSkip) {
      skipBtn.hidden = true;
    }
  }

  /* ----- serving ----- */
  function serve() {
    const x0 = CX + rand(-40, 40);
    const x1 = CX + rand(-40, 40);
    shuttle = { u: 0, x0, x1, x: x0, y: -20, vx: 0, trail: [] };
    setPhase('serve');
  }

  const shuttleScale = y => 0.65 + 0.85 * Math.pow(clamp((y + 20) / 500, 0, 1), 1.15);

  /* ----- input ----- */
  function attempt() {
    if (done || finishing || phase !== 'serve' || !shuttle) return;
    const inZone = Math.abs(shuttle.y - ZONE_Y) <= zoneTarget() / 2;
    if (inZone) {
      smash();
    } else {
      swing(false);
      miss();
    }
  }

  function swing(contact) {
    gsap.killTweensOf(rack, 'angle');
    if (!flags.motion) {
      rack.angle = 0;
      return;
    }
    gsap.timeline()
      .to(rack, { angle: -0.55, duration: 0.07, ease: 'power2.out' })
      .to(rack, { angle: contact ? 0.7 : 0.55, duration: 0.11, ease: 'power3.in' })
      .to(rack, { angle: 0, duration: 0.45, ease: 'elastic.out(1, 0.5)' });
  }

  function smash() {
    if (done || finishing || progress.won) return;
    const from = phase === 'serve' && shuttle
      ? { x: shuttle.x, y: shuttle.y }
      : { x: CX + rand(-24, 24), y: ZONE_Y };
    const startScale = shuttleScale(from.y);
    progress.hit();
    updateHud();

    flights.push({
      t: 0,
      dur: 0.6,
      fx: from.x,
      fy: from.y,
      tx: clamp(from.x + rand(-70, 70), 40, W - 40),
      ty: -70,
      s0: startScale,
      x: from.x,
      y: from.y,
      s: startScale,
      tilt: Math.PI,
      trail: [],
    });
    shuttle = null;
    setPhase('wait');
    timer = 0.7;
    swing(true);
    net = 1;
    if (flags.motion) slowUntil = rt + 0.35;
    impact(from.x, from.y);
    popArabic(from.x, from.y);
    haptic(15);

    if (progress.won) {
      finishing = true;
      gsap.delayedCall(flags.motion ? 0.95 : 0.4, () => finish());
    }
  }

  function miss() {
    if (done || finishing) return;
    progress.miss();
    shake(stageEl);
    if (shuttle) {
      drop = { x: shuttle.x, y: Math.min(shuttle.y, H), vy: 140, alpha: 1, bounced: false, tilt: shuttle.vx * 0.004 };
    }
    shuttle = null;
    setPhase('wait');
    timer = 0.6;
    updateHud();
  }

  function finish() {
    if (done) return;
    done = true;
    finishing = false;
    ctl.stop();
    shuttle = null;
    drop = null;
    flights = [];
    sparks = [];
    rings = [];
    setPhase('done');
    actions.hidden = true;
    winPanel.hidden = false;
    if (flags.motion) {
      gsap.fromTo(winPanel, { opacity: 0, y: 22, scale: 0.92 }, { opacity: 1, y: 0, scale: 1, duration: 0.6, ease: 'back.out(1.8)' });
      gsap.fromTo(winText, { scale: 0.9 }, { scale: 1, duration: 0.8, ease: 'elastic.out(1, 0.45)', delay: 0.1 });
    }
    celebrate('small', ['🏸', '⭐']);
    award('badminton');
    draw();
  }

  function reset() {
    progress.reset();
    done = false;
    finishing = false;
    shuttle = null;
    drop = null;
    flights = [];
    sparks = [];
    rings = [];
    zoneH = 110;
    rack.angle = 0;
    timer = 0.5;
    setPhase('wait');
    winPanel.hidden = true;
    actions.hidden = false;
    updateHud();
    if (flags.motion) gsap.from(actions, { opacity: 0, y: 12, duration: 0.4, ease: 'power2.out' });
    ctl.start();
  }

  /* ----- juice ----- */
  function impact(x, y) {
    rings.push({ x, y, r: 6, life: 0.4 });
    rings.push({ x, y, r: 3, life: 0.28 });
    const colors = ['#FFFFFF', COLORS.honey, COLORS.coral, '#FFE9A8'];
    const n = flags.motion ? 22 : 8;
    for (let i = 0; i < n; i++) {
      const a = rand(0, Math.PI * 2);
      const sp = rand(90, 300);
      sparks.push({
        x, y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 60,
        life: rand(0.35, 0.7),
        max: 0.7,
        r: rand(1.6, 3.6),
        color: colors[i % colors.length],
      });
    }
  }

  function popArabic(x, y) {
    const pop = document.createElement('span');
    pop.className = 'bd-pop';
    pop.lang = 'ar';
    pop.dir = 'rtl';
    pop.textContent = 'زين!';
    pop.style.left = `${(x / W) * 100}%`;
    pop.style.top = `${(clamp(y, 130, H - 60) / H) * 100}%`; // room to float up inside the court
    court.append(pop);
    if (flags.motion) {
      const rot = rand(-9, 9);
      gsap.timeline({ onComplete: () => pop.remove() })
        .fromTo(pop, { xPercent: -50, yPercent: -50, scale: 0.2, rotation: rot - 18, opacity: 0 },
          { scale: 1.15, rotation: rot, opacity: 1, duration: 0.35, ease: 'back.out(3)' })
        .to(pop, { yPercent: -150, duration: 0.7, ease: 'power2.out' }, '<0.1')
        .to(pop, { opacity: 0, scale: 1.3, duration: 0.3, ease: 'power1.in' }, '>-0.25');
    } else {
      gsap.set(pop, { xPercent: -50, yPercent: -50, opacity: 1 });
      gsap.to(pop, { opacity: 0, delay: 0.7, duration: 0.2, onComplete: () => pop.remove() });
    }
  }

  /* ----- update ----- */
  function tick(dt) {
    rt += dt;
    const slow = flags.motion && rt < slowUntil;
    const gdt = dt * (slow ? 0.35 : 1);

    // zone shrinks smoothly
    zoneH = lerp(zoneH, zoneTarget(), 1 - Math.pow(0.001, dt));

    if (phase === 'wait') {
      timer -= dt;
      if (timer <= 0 && !finishing && !done) serve();
    } else if (phase === 'serve' && shuttle) {
      const prevX = shuttle.x;
      shuttle.u += gdt / SERVE_SECONDS;
      const u = Math.min(shuttle.u, 1);
      shuttle.y = -20 + (H + 20) * u * u;
      shuttle.x = lerp(shuttle.x0, shuttle.x1, u);
      shuttle.vx = gdt > 0 ? (shuttle.x - prevX) / gdt : 0;
      shuttle.trail.push({ x: shuttle.x, y: shuttle.y });
      if (shuttle.trail.length > 7) shuttle.trail.shift();
      if (shuttle.u >= 1) {
        // fell past her: a miss
        miss();
      }
    }

    // zone feedback
    const lit = phase === 'serve' && shuttle && Math.abs(shuttle.y - ZONE_Y) <= zoneTarget() / 2 ? 1 : 0;
    zoneLit = lerp(zoneLit, lit, 1 - Math.pow(0.0001, dt));

    // dropped shuttle
    if (drop) {
      drop.vy += 1100 * dt;
      drop.y += drop.vy * dt;
      if (drop.y > 470 && !drop.bounced) {
        drop.y = 470;
        drop.vy = -drop.vy * 0.3;
        drop.bounced = true;
      } else if (drop.y > 470) {
        drop.y = 470;
        drop.vy = 0;
      }
      drop.alpha -= dt * 1.7;
      if (drop.alpha <= 0) drop = null;
    }

    // flights
    for (const f of flights) {
      f.t += gdt;
      const u = clamp(f.t / f.dur, 0, 1);
      const e = u * u * (3 - 2 * u) * 0.35 + u * u * u * 0.65;
      f.y = lerp(f.fy, f.ty, e);
      f.x = lerp(f.fx, f.tx, 1 - Math.pow(1 - u, 2));
      f.s = lerp(f.s0, 0.35, e);
      f.tilt = Math.PI + (f.tx - f.fx) * 0.002;
      f.trail.push({ x: f.x, y: f.y, s: f.s });
      if (f.trail.length > 16) f.trail.shift();
    }
    flights = flights.filter(f => f.t < f.dur + 0.05);

    for (const s of sparks) {
      s.life -= dt;
      s.vy += 520 * dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
    }
    sparks = sparks.filter(s => s.life > 0);
    for (const r of rings) {
      r.life -= dt;
      r.r += dt * 170;
    }
    rings = rings.filter(r => r.life > 0);
    net = Math.max(0, net - dt * 1.4);

    draw();
  }

  /* ----- drawing ----- */
  function draw() {
    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(bg, 0, 0, W, H);

    drawNet();
    drawZone();
    drawRacket();

    if (shuttle) {
      for (let i = 0; i < shuttle.trail.length - 1; i++) {
        const p = shuttle.trail[i];
        const a = (i / shuttle.trail.length) * 0.22;
        ctx.fillStyle = `rgba(255,255,255,${a})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4 + i * 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
      drawShuttle(shuttle.x, shuttle.y, shuttleScale(shuttle.y), clamp(shuttle.vx * 0.006, -0.35, 0.35), 1, true);
    }
    if (drop) {
      drawShuttle(drop.x, drop.y, shuttleScale(drop.y), 0.6 + drop.tilt, Math.max(0, drop.alpha), true);
    }
    for (const f of flights) drawFlight(f);

    for (const r of rings) {
      ctx.strokeStyle = `rgba(255,255,255,${clamp(r.life / 0.4, 0, 1) * 0.9})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2);
      ctx.stroke();
    }
    for (const s of sparks) {
      ctx.globalAlpha = clamp(s.life / s.max, 0, 1);
      ctx.fillStyle = s.color;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawNet() {
    const x0 = 36;
    const x1 = W - 36;
    const wob = net * 3.2;
    ctx.save();
    // soft shadow of the net on the wall
    ctx.fillStyle = 'rgba(31,42,68,.07)';
    ctx.fillRect(x0, NET_TOP + 6, x1 - x0, NET_BOTTOM - NET_TOP);
    // mesh
    ctx.strokeStyle = 'rgba(31,42,68,.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = x0; x <= x1; x += 9) {
      const sway = Math.sin(rt * 1.7 + x * 0.04) * (0.6 + wob);
      ctx.moveTo(x + sway * 0.4, NET_TOP + 4);
      ctx.lineTo(x + sway, NET_BOTTOM - 3);
    }
    for (let y = NET_TOP + 8; y < NET_BOTTOM - 3; y += 9) {
      const sway = Math.sin(rt * 1.3 + y * 0.1) * (0.5 + wob * 0.4);
      ctx.moveTo(x0, y + sway * 0.3);
      ctx.lineTo(x1, y + sway);
    }
    ctx.stroke();
    // top tape
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(x0 - 2, NET_TOP, x1 - x0 + 4, 7);
    ctx.fillStyle = 'rgba(31,42,68,.18)';
    ctx.fillRect(x0 - 2, NET_TOP + 6, x1 - x0 + 4, 1.5);
    // posts
    const post = x => {
      const g = ctx.createLinearGradient(x - 4, 0, x + 4, 0);
      g.addColorStop(0, '#6B7794');
      g.addColorStop(0.5, '#C5CCDB');
      g.addColorStop(1, '#5F6B85');
      ctx.fillStyle = g;
      roundRect(ctx, x - 4, NET_TOP - 10, 8, NET_BOTTOM - NET_TOP + 16, 3);
      ctx.fill();
      ctx.fillStyle = COLORS.coral;
      ctx.beginPath();
      ctx.arc(x, NET_TOP - 10, 5, 0, Math.PI * 2);
      ctx.fill();
    };
    post(x0 - 6);
    post(x1 + 6);
    ctx.restore();
  }

  function drawZone() {
    const h = zoneH;
    const y0 = ZONE_Y - h / 2;
    const x0 = 22;
    const x1 = W - 22;
    const t = rt;
    const pulse = 0.5 + 0.5 * Math.sin(t * 4);
    const lit = zoneLit;

    ctx.save();
    // wide soft glow (additive, so it shines on the green court)
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createLinearGradient(0, y0 - 34, 0, y0 + h + 34);
    const a = 0.3 + 0.12 * pulse + 0.28 * lit;
    g.addColorStop(0, 'rgba(255,200,90,0)');
    g.addColorStop(0.28, `rgba(255,190,80,${a * 0.55})`);
    g.addColorStop(0.5, `rgba(255,226,140,${a})`);
    g.addColorStop(0.72, `rgba(255,190,80,${a * 0.55})`);
    g.addColorStop(1, 'rgba(255,200,90,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, y0 - 34, W, h + 68);
    ctx.globalCompositeOperation = 'source-over';

    // the band itself
    ctx.fillStyle = `rgba(255,248,225,${0.12 + 0.2 * lit})`;
    roundRect(ctx, x0, y0, x1 - x0, h, 16);
    ctx.fill();

    // moving dashed edges
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.setLineDash([12, 9]);
    ctx.lineDashOffset = -t * 22;
    ctx.strokeStyle = lit > 0.5 ? '#FFFFFF' : COLORS.coral;
    ctx.beginPath();
    ctx.moveTo(x0 + 14, y0);
    ctx.lineTo(x1 - 14, y0);
    ctx.moveTo(x0 + 14, y0 + h);
    ctx.lineTo(x1 - 14, y0 + h);
    ctx.stroke();
    ctx.setLineDash([]);

    // sparkles at both ends
    const star = (cx, cy, r, ph) => {
      const rr = r * (0.7 + 0.3 * Math.sin(t * 5 + ph));
      ctx.fillStyle = lit > 0.5 ? '#FFFFFF' : COLORS.honey;
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const ang = (i / 8) * Math.PI * 2 - Math.PI / 2;
        const rad = i % 2 === 0 ? rr : rr * 0.32;
        const px = cx + Math.cos(ang) * rad;
        const py = cy + Math.sin(ang) * rad;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
    };
    star(x0 + 4, ZONE_Y, 10, 0);
    star(x1 - 4, ZONE_Y, 10, 2);
    star(x0 + 20, y0 + 8, 5, 1);
    star(x1 - 20, y0 + h - 8, 5, 3);

    // chevrons pointing at the racket
    ctx.strokeStyle = `rgba(255,107,107,${0.35 + 0.4 * lit})`;
    ctx.lineWidth = 3;
    ctx.lineJoin = 'round';
    for (let i = 0; i < 3; i++) {
      const cy = ZONE_Y - 12 + i * 12 + ((t * 10) % 12) * 0 + Math.sin(t * 4 - i) * 1.5;
      ctx.globalAlpha = 0.35 + 0.15 * i;
      ctx.beginPath();
      ctx.moveTo(CX - 24, cy - 5);
      ctx.lineTo(CX, cy + 4);
      ctx.lineTo(CX + 24, cy - 5);
      ctx.stroke();
    }
    ctx.restore();
  }

  /** Shuttle with its origin at the visual center. tilt 0 = cork down. */
  function drawShuttle(x, y, s, tilt, alpha, shadow) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x, y);
    ctx.rotate(tilt);
    ctx.scale(s, s);

    // skirt
    const skirt = ctx.createLinearGradient(-12, 0, 12, 0);
    skirt.addColorStop(0, '#E4EEF9');
    skirt.addColorStop(0.5, '#FFFFFF');
    skirt.addColorStop(1, '#D6E4F4');
    ctx.fillStyle = skirt;
    ctx.beginPath();
    ctx.moveTo(-4, 8);
    ctx.lineTo(-13, -19);
    ctx.quadraticCurveTo(0, -25, 13, -19);
    ctx.lineTo(4, 8);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(31,42,68,.4)';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // feather ribs
    ctx.strokeStyle = 'rgba(31,42,68,.22)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (const k of [-0.66, -0.33, 0, 0.33, 0.66]) {
      ctx.moveTo(k * 6, 8);
      ctx.lineTo(k * 19, -20 + Math.abs(k) * 2);
    }
    ctx.stroke();

    // rim band
    ctx.strokeStyle = COLORS.coral;
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(-12.4, -17.5);
    ctx.quadraticCurveTo(0, -23, 12.4, -17.5);
    ctx.stroke();
    // thread band
    ctx.strokeStyle = 'rgba(31,42,68,.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-8.4, -5);
    ctx.quadraticCurveTo(0, -2, 8.4, -5);
    ctx.stroke();

    // cork
    const cork = ctx.createRadialGradient(-2, 10, 1, 0, 13, 7);
    cork.addColorStop(0, '#FFF3D6');
    cork.addColorStop(1, '#E7B976');
    ctx.fillStyle = cork;
    ctx.beginPath();
    ctx.arc(0, 13, 6.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(31,42,68,.45)';
    ctx.lineWidth = 1.1;
    ctx.stroke();
    ctx.restore();
  }

  function drawFlight(f) {
    // streak
    for (let i = 0; i < f.trail.length; i++) {
      const p = f.trail[i];
      const k = i / f.trail.length;
      ctx.fillStyle = `rgba(255,${Math.round(lerp(240, 214, 1 - k))},${Math.round(lerp(210, 130, 1 - k))},${k * 0.55})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2 + k * 7 * p.s, 0, Math.PI * 2);
      ctx.fill();
    }
    drawShuttle(f.x, f.y, f.s, f.tilt, 1, false);
  }

  function drawRacket() {
    const sway = flags.motion && phase !== 'done' ? Math.sin(rt * 2.2) * 0.035 : 0;
    ctx.save();
    ctx.translate(CX, PIVOT_Y);
    ctx.rotate(rack.angle + sway);
    ctx.scale(0.82, 0.82);

    // cast shadow on the floor
    ctx.fillStyle = 'rgba(31,42,68,.12)';
    ctx.beginPath();
    ctx.ellipse(10, -60, 30, 52, 0, 0, Math.PI * 2);
    ctx.fill();

    // grip
    const grip = ctx.createLinearGradient(-6, 0, 6, 0);
    grip.addColorStop(0, '#2A3A5E');
    grip.addColorStop(1, COLORS.ink);
    ctx.fillStyle = grip;
    roundRect(ctx, -6, -42, 12, 44, 5);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.28)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let y = -38; y < 0; y += 8) {
      ctx.moveTo(-6, y + 4);
      ctx.lineTo(6, y);
    }
    ctx.stroke();

    // shaft
    ctx.strokeStyle = '#C5CCDB';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, -42);
    ctx.lineTo(0, -66);
    ctx.stroke();
    ctx.strokeStyle = COLORS.coral;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-1, -64);
    ctx.lineTo(-17, -92);
    ctx.moveTo(1, -64);
    ctx.lineTo(17, -92);
    ctx.stroke();

    // head
    const cy = -128;
    const rx = 28;
    const ry = 38;
    ctx.fillStyle = 'rgba(255,255,255,.2)';
    ctx.beginPath();
    ctx.ellipse(0, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(0, cy, rx - 2, ry - 2, 0, 0, Math.PI * 2);
    ctx.clip();
    ctx.strokeStyle = 'rgba(255,255,255,.85)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = -rx; x <= rx; x += 6) {
      ctx.moveTo(x, cy - ry);
      ctx.lineTo(x, cy + ry);
    }
    for (let y = cy - ry; y <= cy + ry; y += 6) {
      ctx.moveTo(-rx, y);
      ctx.lineTo(rx, y);
    }
    ctx.stroke();
    ctx.restore();
    ctx.strokeStyle = COLORS.coral;
    ctx.lineWidth = 5.5;
    ctx.beginPath();
    ctx.ellipse(0, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.55)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(-1, cy - 1, rx - 2.5, ry - 2.5, 0, Math.PI * 1.1, Math.PI * 1.55);
    ctx.stroke();
    ctx.restore();
  }

  /* ----- wiring ----- */
  const ctl = loop(tick, canvas);

  canvas.addEventListener('pointerdown', e => {
    e.preventDefault();
    // tap position is irrelevant: timing is the whole game
    attempt();
  });
  smashBtn.addEventListener('pointerdown', () => attempt());
  smashBtn.addEventListener('click', e => {
    if (e.detail === 0) attempt(); // keyboard activation
  });
  skipBtn.addEventListener('click', () => {
    if (done || finishing) return;
    finishing = true;
    finish();
  });
  againBtn.addEventListener('click', reset);

  if (import.meta.env.DEV && window.__sh024) {
    window.__sh024.games.badminton = {
      hit: () => smash(),
      miss: () => miss(),
      probe: () => ({
        phase,
        y: shuttle ? shuttle.y : null,
        inZone: !!shuttle && Math.abs(shuttle.y - ZONE_Y) <= zoneTarget() / 2,
      }),
    };
  }

  // a calm entrance when the court scrolls into view
  mm.add(MOTION, mctx => {
    if (mctx.conditions.reduce) return;
    gsap.from(wrap, {
      opacity: 0,
      y: 26,
      duration: 0.7,
      ease: 'power3.out',
      scrollTrigger: { trigger: wrap, start: 'top 92%', once: true },
    });
  });

  updateHud();
  setPhase('wait');
  draw();
  ctl.start();

}

function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
}

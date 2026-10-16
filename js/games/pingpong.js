import '../../css/stops/pingpong.css';
import { gsap, MOTION } from '../motion.js';
import { toast, celebrate, shake, haptic } from '../fx.js';
import { createProgress } from './progress.js';
import { setupCanvas, localPoint, loop } from './canvas.js';

/* ---------- copy (spec 3.2, verbatim) ---------- */
const FIRST_RETURN = 'Great serve! (not the only great thing about you, but let\'s stay focused 😌)';
const WIN_LINE = 'Not bad! But a screen is easy… real table one day? Loser buys the chocolate 😏';
const SKIP_LABEL = 'Skip, I\'ll stamp it anyway 😅';

/* ---------- tuning ---------- */
const W = 360;
const H = 520;
const GOAL = 5;
const PADDLE_W = 84;
const PADDLE_H = 12;
const PADDLE_Y = 490;
const OPP_Y = 30;
const OPP_SPEED = 170;
const BALL_R = 8;
const SERVE_SPEED = 260;
const MAX_SPEED = 460;
const HIT_BOOST = 1.06;
const HIT_ANGLE = 60 * Math.PI / 180;
const SERVE_ANGLE = 35 * Math.PI / 180;
const SLOWMO_SCALE = 0.3;
const SLOWMO_MS = 500;
const HOVER = 28; // how high bats and the struck ball float above the table (px at full scale)

/* ---------- perspective: world (x 0..360, y 0..520) to screen ---------- */
const PERSP = 0.9;
const S_FAR = 1 / (1 + PERSP);
const Y_FAR = 46;
const Y_NEAR = 496;
const X_SQUEEZE = 0.94;
const scaleAt = y => 1 / (1 + PERSP * (1 - y / H));
const sy = y => Y_FAR + (Y_NEAR - Y_FAR) * (scaleAt(y) - S_FAR) / (1 - S_FAR);
const sx = (x, y) => W / 2 + (x - W / 2) * scaleAt(y) * X_SQUEEZE;
const wx = (screenX, y) => W / 2 + (screenX - W / 2) / (scaleAt(y) * X_SQUEEZE);

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const rand = (a, b) => a + Math.random() * (b - a);

/* ---------- the static scene: sand, sea, palms, table, net ---------- */
function paintScene(dpr) {
  const c = document.createElement('canvas');
  c.width = W * dpr;
  c.height = H * dpr;
  const g = c.getContext('2d');
  g.scale(dpr, dpr);

  // sand
  const sand = g.createLinearGradient(0, 0, 0, H);
  sand.addColorStop(0, '#F9ECCF');
  sand.addColorStop(1, '#EFD8A6');
  g.fillStyle = sand;
  g.fillRect(0, 0, W, H);

  // converging deck planks give the floor its own perspective
  g.strokeStyle = 'rgba(190, 150, 80, .16)';
  g.lineWidth = 1.2;
  for (let i = -8; i <= 8; i++) {
    g.beginPath();
    g.moveTo(W / 2 + i * 18, 20);
    g.lineTo(W / 2 + i * 62, H);
    g.stroke();
  }
  // sand speckle (seeded so it never changes)
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 160; i++) {
    g.fillStyle = `rgba(176, 132, 62, ${.08 + rnd() * .1})`;
    g.beginPath();
    g.arc(rnd() * W, rnd() * H, .6 + rnd() * 1.4, 0, Math.PI * 2);
    g.fill();
  }

  // sea at the far edge, with a foam line
  const sea = g.createLinearGradient(0, 0, 0, 34);
  sea.addColorStop(0, '#8EC5FF');
  sea.addColorStop(1, '#2EC4B6');
  g.fillStyle = sea;
  g.fillRect(0, 0, W, 34);
  g.beginPath();
  g.moveTo(0, 34);
  for (let x = 0; x <= W; x += 6) g.lineTo(x, 34 + Math.sin(x / 9) * 2.2);
  g.lineTo(W, 30);
  g.lineTo(0, 30);
  g.closePath();
  g.fillStyle = 'rgba(255, 255, 255, .9)';
  g.fill();
  g.beginPath();
  g.moveTo(0, 30);
  for (let x = 0; x <= W; x += 6) g.lineTo(x, 31 + Math.sin(x / 9) * 2.2);
  g.lineTo(W, 29);
  g.lineTo(0, 29);
  g.closePath();
  g.fillStyle = '#2EC4B6';
  g.fill();

  // table shadow and slab
  const FL = [sx(0, 0), sy(0)], FR = [sx(W, 0), sy(0)];
  const NR = [sx(W, H), sy(H)], NL = [sx(0, H), sy(H)];
  const tablePath = () => {
    g.beginPath();
    g.moveTo(FL[0], FL[1]);
    g.lineTo(FR[0], FR[1]);
    g.lineTo(NR[0], NR[1]);
    g.lineTo(NL[0], NL[1]);
    g.closePath();
  };
  g.save();
  g.shadowColor = 'rgba(31, 42, 68, .32)';
  g.shadowBlur = 22 * dpr;
  g.shadowOffsetY = 16 * dpr;
  tablePath();
  g.fillStyle = '#12867C';
  g.fill();
  g.restore();

  // front face (thickness)
  g.beginPath();
  g.moveTo(NL[0], NL[1] - 1);
  g.lineTo(NR[0], NR[1] - 1);
  g.lineTo(NR[0] - 2, NR[1] + 14);
  g.lineTo(NL[0] + 2, NL[1] + 14);
  g.closePath();
  const face = g.createLinearGradient(0, NL[1], 0, NL[1] + 14);
  face.addColorStop(0, '#12867C');
  face.addColorStop(1, '#0C5F58');
  g.fillStyle = face;
  g.fill();

  // top
  tablePath();
  const top = g.createLinearGradient(0, FL[1], 0, NL[1]);
  top.addColorStop(0, '#38D6C7');
  top.addColorStop(1, '#22AE9F');
  g.fillStyle = top;
  g.fill();
  g.save();
  tablePath();
  g.clip();
  const sheen = g.createRadialGradient(W / 2, 250, 10, W / 2, 250, 230);
  sheen.addColorStop(0, 'rgba(255, 255, 255, .26)');
  sheen.addColorStop(1, 'rgba(255, 255, 255, 0)');
  g.fillStyle = sheen;
  g.fillRect(0, 0, W, H);
  g.restore();

  // white lines
  const line = (pts, width, alpha) => {
    g.beginPath();
    pts.forEach(([x, y], i) => (i ? g.lineTo(sx(x, y), sy(y)) : g.moveTo(sx(x, y), sy(y))));
    g.lineWidth = width;
    g.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
    g.lineCap = 'round';
    g.lineJoin = 'round';
    g.stroke();
  };
  line([[7, 7], [W - 7, 7], [W - 7, H - 7], [7, H - 7], [7, 7]], 2.6, .96);
  line([[W / 2, 7], [W / 2, H - 7]], 1.5, .8);

  // net: shadow, mesh, tape, posts
  const ny = H / 2;
  const ns = scaleAt(ny);
  const nx0 = sx(-6, ny), nx1 = sx(W + 6, ny);
  const nb = sy(ny);
  const nh = 30 * ns;
  g.fillStyle = 'rgba(8, 70, 66, .28)';
  g.beginPath();
  g.ellipse(W / 2 + 3, nb + 4 * ns, (nx1 - nx0) / 2, 5 * ns, 0, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = 'rgba(255, 255, 255, .24)';
  g.fillRect(nx0, nb - nh, nx1 - nx0, nh);
  g.strokeStyle = 'rgba(255, 255, 255, .55)';
  g.lineWidth = .8;
  for (let x = nx0; x <= nx1; x += 6.5 * ns) {
    g.beginPath();
    g.moveTo(x, nb - nh);
    g.lineTo(x, nb);
    g.stroke();
  }
  for (let y = nb - nh; y <= nb; y += 6 * ns) {
    g.beginPath();
    g.moveTo(nx0, y);
    g.lineTo(nx1, y);
    g.stroke();
  }
  g.fillStyle = '#FFFFFF';
  g.fillRect(nx0, nb - nh - 2.5 * ns, nx1 - nx0, 5 * ns);
  g.fillStyle = '#FF6B6B';
  for (const px of [nx0, nx1]) {
    g.beginPath();
    g.roundRect(px - 3.5 * ns, nb - nh - 5 * ns, 7 * ns, nh + 9 * ns, 3 * ns);
    g.fill();
  }

  // palm fronds in the corners
  const frond = (px, py, ang, len, fill) => {
    const tx = px + Math.cos(ang) * len, ty = py + Math.sin(ang) * len + len * .18;
    const nxv = -Math.sin(ang), nyv = Math.cos(ang);
    const mx = px + Math.cos(ang) * len * .5, my = py + Math.sin(ang) * len * .5;
    g.beginPath();
    g.moveTo(px, py);
    g.quadraticCurveTo(mx + nxv * len * .2, my + nyv * len * .2 - len * .06, tx, ty);
    g.quadraticCurveTo(mx - nxv * len * .2, my - nyv * len * .2 + len * .1, px, py);
    g.fillStyle = fill;
    g.fill();
  };
  g.save();
  g.globalAlpha = .92;
  [[-6, -6, 0.15, 'L'], [W + 6, -6, Math.PI - 0.15, 'R']].forEach(([px, py, base, side]) => {
    const dir = side === 'L' ? 1 : -1;
    for (let i = 0; i < 6; i++) {
      const a = base + dir * (i * .3 + .02);
      frond(px, py, a, 96 - i * 6, i % 2 ? '#12867C' : '#1AA79A');
    }
  });
  g.restore();

  // a couple of beach treasures
  g.globalAlpha = .75;
  g.font = '19px system-ui, "Apple Color Emoji", "Segoe UI Emoji", sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText('⭐', 24, 330);
  g.fillText('🐚', 337, 395);
  g.globalAlpha = 1;
  return c;
}

/* ---------- init ---------- */
export function init(stageEl, ctx) {
  const progress = createProgress({ goal: GOAL, skipAfter: 3 });

  // DOM
  stageEl.removeAttribute('data-stub');
  stageEl.innerHTML = `
    <div class="pp">
      <div class="pp-hud card">
        <span class="pp-count" role="status" aria-live="polite">Returns: 0/${GOAL}</span>
        <span class="pp-pips" aria-hidden="true">${'<i class="pp-pip"></i>'.repeat(GOAL)}</span>
      </div>
      <div class="pp-board">
        <canvas class="pp-canvas" tabindex="0" role="img" aria-label="Ping pong table. Drag left and right, or use the arrow keys, to move your paddle."></canvas>
        <div class="pp-hint" aria-hidden="true"><span>◀</span> drag to move <span>▶</span></div>
        <div class="pp-win" hidden>
          <div class="pp-win-card card" role="status">
            <div class="pp-win-emoji" aria-hidden="true">🏓</div>
            <p class="pp-win-line"></p>
            <button type="button" class="btn pp-again">Play again</button>
          </div>
        </div>
      </div>
      <div class="pp-actions"><button type="button" class="btn btn-ghost pp-skip" hidden></button></div>
    </div>`;
  const root = stageEl.querySelector('.pp');
  const countEl = root.querySelector('.pp-count');
  const pips = [...root.querySelectorAll('.pp-pip')];
  const board = root.querySelector('.pp-board');
  const canvas = root.querySelector('canvas');
  const hint = root.querySelector('.pp-hint');
  const winEl = root.querySelector('.pp-win');
  const winCard = root.querySelector('.pp-win-card');
  const skipBtn = root.querySelector('.pp-skip');
  const againBtn = root.querySelector('.pp-again');
  root.querySelector('.pp-win-line').textContent = WIN_LINE;
  skipBtn.textContent = SKIP_LABEL;

  const g = setupCanvas(canvas, W, H);
  const dpr = canvas.width / W;
  const scene = paintScene(dpr);

  // motion preference, via gsap.matchMedia
  let motionOK = true;
  const mm = gsap.matchMedia();
  mm.add({ motion: MOTION.motion, reduce: MOTION.reduce }, mctx => {
    motionOK = !!mctx.conditions.motion;
    if (motionOK) {
      gsap.from(root, {
        y: 36, opacity: 0, scale: .96, duration: .7, ease: 'power3.out',
        scrollTrigger: { trigger: root, start: 'top 92%', once: true },
      });
    }
  });

  /* ---------- state ---------- */
  const paddle = { x: W / 2, target: W / 2, kick: 0 };
  const opp = { x: W / 2, kick: 0 };
  const ball = { x: W / 2, y: OPP_Y + 14, vx: 0, vy: 0, speed: SERVE_SPEED, live: false, vis: 1 };
  let serveWait = 1;
  let slow = 1;
  let finishing = false;
  let finished = false;
  let toasted = false;
  let flash = 0;
  const trail = [];
  const sparks = [];
  const rings = [];
  const floaters = [];

  /* ---------- HUD ---------- */
  function updateHud(popIndex = -1) {
    countEl.textContent = `Returns: ${progress.hits}/${GOAL}`;
    pips.forEach((p, i) => p.classList.toggle('on', i < progress.hits));
    if (popIndex >= 0 && motionOK) {
      gsap.fromTo(pips[popIndex], { scale: .3 }, { scale: 1, duration: .5, ease: 'back.out(3)' });
    }
  }

  function updateSkip() {
    const show = progress.canSkip && !finished;
    if (show && skipBtn.hidden) {
      skipBtn.hidden = false;
      if (motionOK) gsap.fromTo(skipBtn, { y: 14, opacity: 0, scale: .9 }, { y: 0, opacity: 1, scale: 1, duration: .5, ease: 'back.out(2)' });
    } else if (!show && !skipBtn.hidden) {
      skipBtn.hidden = true;
    }
  }

  /* ---------- serving ---------- */
  function serve(wait) {
    ball.live = false;
    ball.speed = SERVE_SPEED;
    ball.vis = wait > .5 ? 0 : 1;
    serveWait = wait;
    trail.length = 0;
  }

  function launch() {
    const a = rand(-SERVE_ANGLE, SERVE_ANGLE);
    ball.vx = ball.speed * Math.sin(a);
    ball.vy = ball.speed * Math.cos(a);
    ball.live = true;
    ball.vis = 1;
  }

  /* ---------- juice ---------- */
  function sparkBurst(x, y, n, colors) {
    const count = motionOK ? n : Math.ceil(n / 3);
    for (let i = 0; i < count; i++) {
      const a = rand(0, Math.PI * 2);
      const v = rand(60, 190);
      sparks.push({
        x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 40,
        life: rand(.3, .55), max: .55, r: rand(1.6, 3.4), c: colors[i % colors.length],
      });
    }
  }
  const floatText = (text, x, y, color) => floaters.push({ text, x, y, life: 0, color });

  /* ---------- events: hit and miss (real physics and the dev hooks share these) ---------- */
  function onHit(fromHook = false) {
    if (finishing || finished) return;
    if (fromHook) {
      ball.live = true;
      ball.vis = 1;
      ball.x = clamp(paddle.x + rand(-26, 26), BALL_R, W - BALL_R);
      ball.y = PADDLE_Y - PADDLE_H / 2 - BALL_R;
    }
    const n = progress.hit();
    updateHud(n - 1);

    // bounce back with an angle set by where on the paddle it landed
    const off = clamp((ball.x - paddle.x) / (PADDLE_W / 2), -1, 1);
    const angle = off * HIT_ANGLE;
    ball.speed = Math.min(MAX_SPEED, ball.speed * HIT_BOOST);
    ball.vx = ball.speed * Math.sin(angle);
    ball.vy = -ball.speed * Math.cos(angle);
    ball.y = Math.min(ball.y, PADDLE_Y - PADDLE_H / 2 - BALL_R);

    paddle.kick = 1;
    const px = sx(ball.x, PADDLE_Y), py = sy(PADDLE_Y) - HOVER * scaleAt(PADDLE_Y);
    sparkBurst(px, py, 14, ['#FFD166', '#FFFFFF', '#FF6B6B', '#FFB020']);
    rings.push({ x: px, y: py, t: 0 });
    floatText(`+1`, px, py - 18, '#FFFFFF');
    haptic(12);

    if (!toasted) {
      toasted = true;
      toast(FIRST_RETURN, 3600);
    }

    if (progress.won) {
      finishing = true;
      updateSkip();
      if (motionOK) {
        slow = SLOWMO_SCALE;
        gsap.delayedCall(SLOWMO_MS / 1000, () => finish());
      } else {
        finish();
      }
    }
  }

  function onMiss() {
    if (finishing || finished) return;
    progress.miss();
    flash = 1;
    shake(stageEl);
    haptic(20);
    floatText('Oops!', sx(ball.x, Math.min(ball.y, H - 30)), sy(H - 30) - 14, '#FF6B6B');
    serve(.6);
    updateSkip();
  }

  /* ---------- finishing ---------- */
  function finish() {
    if (finished) return;
    finished = true;
    finishing = true;
    slow = 1;
    skipBtn.hidden = true;
    draw();
    runner.stop();
    winEl.hidden = false;
    if (motionOK) {
      gsap.fromTo(winEl, { opacity: 0 }, { opacity: 1, duration: .35, ease: 'power1.out' });
      gsap.fromTo(winCard, { y: 60, scale: .86, opacity: 0 }, { y: 0, scale: 1, opacity: 1, duration: .7, ease: 'back.out(1.7)' });
      gsap.fromTo('.pp-win-emoji', { rotation: -40, scale: .4 }, { rotation: 0, scale: 1, duration: .8, ease: 'elastic.out(1, .45)', delay: .15 });
    } else {
      gsap.set([winEl, winCard], { opacity: 1, y: 0, scale: 1 });
    }
    celebrate('small', ['🏓', '⭐']);
    ctx.award('pingpong');
    againBtn.focus({ preventScroll: true });
  }

  function replay() {
    const done = () => { winEl.hidden = true; };
    if (motionOK) gsap.to(winEl, { opacity: 0, duration: .25, onComplete: done });
    else done();
    progress.reset();
    updateHud();
    finishing = false;
    finished = false;
    slow = 1;
    sparks.length = 0;
    rings.length = 0;
    floaters.length = 0;
    ball.x = opp.x;
    serve(.9);
    updateSkip();
    runner.start();
  }

  skipBtn.addEventListener('click', () => {
    if (!progress.canSkip || finished) return;
    finishing = true;
    finish();
  });
  againBtn.addEventListener('click', replay);

  /* ---------- input: the paddle follows the pointer's x ---------- */
  const moveTo = e => {
    const p = localPoint(canvas, e, W, H);
    paddle.target = clamp(wx(p.x, PADDLE_Y), PADDLE_W / 2, W - PADDLE_W / 2);
  };
  const hideHint = () => {
    if (hint.classList.contains('gone')) return;
    hint.classList.add('gone');
  };
  canvas.addEventListener('pointerdown', e => {
    try { canvas.setPointerCapture(e.pointerId); } catch { /* ignore */ }
    moveTo(e);
    hideHint();
  });
  canvas.addEventListener('pointermove', e => {
    if (e.pointerType === 'mouse' || e.buttons) {
      moveTo(e);
      if (e.buttons) hideHint();
    }
  });
  canvas.addEventListener('keydown', e => {
    const dir = { ArrowLeft: -1, a: -1, ArrowRight: 1, d: 1 }[e.key];
    if (!dir) return;
    e.preventDefault();
    paddle.target = clamp(paddle.target + dir * 30, PADDLE_W / 2, W - PADDLE_W / 2);
    hideHint();
  });

  /* ---------- update ---------- */
  function update(rawDt) {
    const dt = rawDt * slow;

    paddle.x += (paddle.target - paddle.x) * (1 - Math.exp(-rawDt * 26));
    paddle.kick = Math.max(0, paddle.kick - rawDt * 5);
    opp.kick = Math.max(0, opp.kick - rawDt * 5);
    flash = Math.max(0, flash - rawDt * 2.2);

    // opponent drifts toward the ball, capped so she can beat it
    const aim = ball.live && ball.vy < 0 ? ball.x : ball.live ? W / 2 + (ball.x - W / 2) * .4 : W / 2;
    const step = OPP_SPEED * dt;
    opp.x += clamp(aim - opp.x, -step, step);
    opp.x = clamp(opp.x, PADDLE_W / 2, W - PADDLE_W / 2);

    if (!ball.live) {
      serveWait -= dt;
      ball.x = opp.x;
      ball.y = OPP_Y + 14;
      if (serveWait < .35) ball.vis = Math.min(1, ball.vis + dt * 4);
      if (serveWait <= 0 && !finishing) launch();
    } else {
      const prevY = ball.y;
      ball.x += ball.vx * dt;
      ball.y += ball.vy * dt;
      if (ball.x < BALL_R) { ball.x = BALL_R; ball.vx = Math.abs(ball.vx); }
      if (ball.x > W - BALL_R) { ball.x = W - BALL_R; ball.vx = -Math.abs(ball.vx); }

      // her paddle
      if (ball.vy > 0 && !finishing
        && ball.y + BALL_R >= PADDLE_Y - PADDLE_H / 2
        && ball.y - BALL_R <= PADDLE_Y + PADDLE_H / 2 + 10
        && prevY - BALL_R < PADDLE_Y + PADDLE_H / 2
        && Math.abs(ball.x - paddle.x) <= PADDLE_W / 2 + BALL_R) {
        onHit(false);
      } else if (ball.y > H && ball.vy > 0) {
        if (finishing) serve(.6); else onMiss();
      }

      // opponent paddle returns it if she reached it
      if (ball.vy < 0 && ball.y <= OPP_Y + PADDLE_H / 2 + BALL_R && ball.y > OPP_Y - 20
        && Math.abs(ball.x - opp.x) <= PADDLE_W / 2 + BALL_R) {
        const a = rand(-30, 30) * Math.PI / 180 + clamp((ball.x - opp.x) / PADDLE_W, -.4, .4);
        ball.vx = ball.speed * Math.sin(a);
        ball.vy = ball.speed * Math.cos(a);
        ball.y = OPP_Y + PADDLE_H / 2 + BALL_R;
        opp.kick = 1;
        sparkBurst(sx(ball.x, OPP_Y), sy(OPP_Y) - HOVER * scaleAt(OPP_Y), 6, ['#8EC5FF', '#FFFFFF']);
      } else if (ball.vy < 0 && ball.y < -40) {
        // she wasn't fast enough: opponent missed, new serve
        floatText('Missed it!', sx(ball.x, 6), sy(6) + 12, '#FFFFFF');
        serve(.55);
      }

      // trail
      trail.push({ x: sx(ball.x, ball.y), y: sy(ball.y) - ballLift(ball.y) * scaleAt(ball.y), s: scaleAt(ball.y) });
      if (trail.length > 8) trail.shift();
    }

    for (let i = sparks.length - 1; i >= 0; i--) {
      const p = sparks[i];
      p.life -= dt;
      p.vy += 420 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.life <= 0) sparks.splice(i, 1);
    }
    for (let i = rings.length - 1; i >= 0; i--) {
      rings[i].t += rawDt * 2.6;
      if (rings[i].t >= 1) rings.splice(i, 1);
    }
    for (let i = floaters.length - 1; i >= 0; i--) {
      floaters[i].life += rawDt;
      if (floaters[i].life > .9) floaters.splice(i, 1);
    }
  }

  // ball height above the table: bounces on each half, highest over the net
  function ballLift(y) {
    if (!ball.live) return HOVER * .85 + Math.sin(performance.now() / 260) * 2.5;
    const t = clamp((y - OPP_Y) / (PADDLE_Y - OPP_Y), 0, 1);
    return HOVER * Math.pow(Math.abs(Math.cos(t * Math.PI * 2)), .85);
  }

  /* ---------- draw ---------- */
  function drawBat(x, y, s, rubber, rubberDark, dir, kick) {
    const rx = 42 * s * (1 + kick * .08);
    const ry = 14 * s * (1 - kick * .14);
    // soft shadow on the table
    g.fillStyle = 'rgba(8, 70, 66, .24)';
    g.beginPath();
    g.ellipse(x, y + HOVER * s + 3 * s, rx * .95, ry * .7, 0, 0, Math.PI * 2);
    g.fill();
    // handle
    const hy0 = y + dir * ry * .55;
    const hy1 = y + dir * (ry + 20 * s);
    const hw = 10 * s;
    const wood = g.createLinearGradient(x - hw, 0, x + hw, 0);
    wood.addColorStop(0, '#D9A35F');
    wood.addColorStop(.5, '#F2C98A');
    wood.addColorStop(1, '#C48B45');
    g.fillStyle = wood;
    g.beginPath();
    g.roundRect(x - hw / 2, Math.min(hy0, hy1), hw, Math.abs(hy1 - hy0), 4 * s);
    g.fill();
    // rim (thickness)
    g.fillStyle = '#1F2A44';
    g.beginPath();
    g.ellipse(x, y + 3.2 * s, rx, ry, 0, 0, Math.PI * 2);
    g.fill();
    // rubber face
    const face = g.createRadialGradient(x - rx * .3, y - ry * .5, 2, x, y, rx);
    face.addColorStop(0, rubber);
    face.addColorStop(1, rubberDark);
    g.fillStyle = face;
    g.beginPath();
    g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = 'rgba(255, 255, 255, .55)';
    g.lineWidth = 1.4 * s;
    g.beginPath();
    g.ellipse(x, y, rx * .8, ry * .68, 0, Math.PI * 1.05, Math.PI * 1.85);
    g.stroke();
  }

  function drawBall() {
    const s = scaleAt(ball.y);
    const lift = ballLift(ball.y);
    const bx = sx(ball.x, ball.y);
    const by = sy(ball.y);
    const z = clamp(lift / HOVER, 0, 1);
    const r = BALL_R * 1.6 * s * (ball.vis);
    if (r < .5) return;

    // trail
    for (let i = 0; i < trail.length - 1; i++) {
      const tp = trail[i];
      const k = (i + 1) / trail.length;
      g.fillStyle = `rgba(255, 190, 70, ${k * .38})`;
      g.beginPath();
      g.arc(tp.x, tp.y, BALL_R * 1.6 * tp.s * (.35 + .6 * k), 0, Math.PI * 2);
      g.fill();
    }
    // shadow shrinks and fades as the ball rises
    g.fillStyle = `rgba(8, 70, 66, ${.34 - z * .18})`;
    g.beginPath();
    g.ellipse(bx, by + 1, r * (1.15 - z * .35), r * (1.15 - z * .35) * .42, 0, 0, Math.PI * 2);
    g.fill();
    // ball
    const cy = by - lift * s;
    const body = g.createRadialGradient(bx - r * .35, cy - r * .4, r * .1, bx, cy, r);
    body.addColorStop(0, '#FFE2A8');
    body.addColorStop(.45, '#FFA53B');
    body.addColorStop(1, '#E2701C');
    g.fillStyle = body;
    g.beginPath();
    g.arc(bx, cy, r, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = 'rgba(255, 255, 255, .85)';
    g.beginPath();
    g.ellipse(bx - r * .32, cy - r * .38, r * .22, r * .14, -.6, 0, Math.PI * 2);
    g.fill();
  }

  function draw() {
    g.clearRect(0, 0, W, H);
    g.drawImage(scene, 0, 0, W, H);

    // opponent (far, small) then ball then her paddle (near)
    const os = scaleAt(OPP_Y);
    drawBat(sx(opp.x, OPP_Y), sy(OPP_Y) - HOVER * os - opp.kick * 4, os, '#8EC5FF', '#4F95E0', -1, opp.kick);
    drawBall();
    const ps = scaleAt(PADDLE_Y);
    drawBat(sx(paddle.x, PADDLE_Y), sy(PADDLE_Y) - HOVER * ps - paddle.kick * 5, ps, '#FF7A7A', '#E24848', 1, paddle.kick);

    // effects
    for (const r of rings) {
      g.strokeStyle = `rgba(255, 255, 255, ${(1 - r.t) * .9})`;
      g.lineWidth = 2.2 * (1 - r.t) + .6;
      g.beginPath();
      g.ellipse(r.x, r.y, 12 + r.t * 40, (12 + r.t * 40) * .45, 0, 0, Math.PI * 2);
      g.stroke();
    }
    for (const p of sparks) {
      g.globalAlpha = clamp(p.life / p.max, 0, 1);
      g.fillStyle = p.c;
      g.beginPath();
      g.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      g.fill();
    }
    g.globalAlpha = 1;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = '700 20px Fredoka, Rubik, system-ui, sans-serif';
    for (const f of floaters) {
      const k = f.life / .9;
      g.globalAlpha = clamp(1 - k * k, 0, 1);
      const y = f.y - k * 34;
      g.lineWidth = 4;
      g.strokeStyle = 'rgba(31, 42, 68, .55)';
      g.lineJoin = 'round';
      g.strokeText(f.text, f.x, y);
      g.fillStyle = f.color;
      g.fillText(f.text, f.x, y);
    }
    g.globalAlpha = 1;

    if (flash > 0) {
      const fg = g.createLinearGradient(0, H, 0, H - 150);
      fg.addColorStop(0, `rgba(255, 107, 107, ${flash * .55})`);
      fg.addColorStop(1, 'rgba(255, 107, 107, 0)');
      g.fillStyle = fg;
      g.fillRect(0, H - 150, W, 150);
    }
  }

  /* ---------- go ---------- */
  const runner = loop(dt => { update(dt); draw(); }, canvas);
  updateHud();
  serve(1);
  draw();
  runner.start();

  if (import.meta.env.DEV && window.__sh024?.games) {
    window.__sh024.games.pingpong = {
      hit: () => onHit(true),
      miss: () => onMiss(),
      paddleX: () => paddle.x,
      ballX: () => sx(ball.x, PADDLE_Y),
      ballLive: () => ball.live,
      state: () => ({ hits: progress.hits, misses: progress.misses, finished, ball: { x: Math.round(ball.x), y: Math.round(ball.y), vx: Math.round(ball.vx), vy: Math.round(ball.vy), live: ball.live }, paddle: Math.round(paddle.x), opp: Math.round(opp.x) }),
    };
  }
}

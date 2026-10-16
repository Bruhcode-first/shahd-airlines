// Candy physics for the Sweet Shop: roughly thirty chocolates and sweets spill out of the
// opened gift box, pile up on the counter and can be flicked around.
// Loaded with import() only when the box opens, so matter-js stays out of the first load.
import Matter from 'matter-js';
import { loop } from './canvas.js';

const { Engine, Composite, Bodies, Body, Mouse, MouseConstraint, Query, Sleeping } = Matter;

const EMOJI_FONT = "'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji',sans-serif";
const STEP_MS = 1000 / 60;
const IDLE_MS = 10_000;
const SPAWN_GAP = 0.034; // seconds between pieces leaving the box
const MAX_SPEED = 26;
const WALL = 120;

/** Emoji pre-rendered to an offscreen canvas, soft shadow baked in. */
function makeSprite(emoji, diameter, dpr) {
  const pad = 9;
  const size = Math.ceil(diameter + pad * 2);
  const c = document.createElement('canvas');
  c.width = size * dpr;
  c.height = size * dpr;
  const g = c.getContext('2d');
  g.scale(dpr, dpr);
  g.font = `${Math.round(diameter * 0.84)}px ${EMOJI_FONT}`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.shadowColor = 'rgba(70, 38, 20, .38)';
  g.shadowBlur = 5;
  g.shadowOffsetY = 3;
  g.fillText(emoji, size / 2, size / 2 + diameter * 0.04);
  return { canvas: c, size };
}

/**
 * Spills `count` candies inside `container` (an element with a size). The container is
 * position: relative/absolute. Returns { stop() }.
 */
export function startCandyPhysics(container, emojis, count = 30) {
  const pieces = emojis?.length ? emojis : ['🍫', '🍬', '🍭', '🍯'];
  const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
  const calm = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

  let w = Math.max(container.clientWidth, 120);
  let h = Math.max(container.clientHeight, 120);

  const canvas = document.createElement('canvas');
  canvas.className = 'sw-pile-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  canvas.setAttribute('data-dpr', String(dpr));
  Object.assign(canvas.style, {
    position: 'absolute',
    inset: '0',
    width: '100%',
    height: '100%',
    display: 'block',
    // Vertical swipes still scroll the page; a touch that lands on a candy takes over instead.
    touchAction: 'pan-y',
    userSelect: 'none',
    webkitUserSelect: 'none',
  });
  const ctx = canvas.getContext('2d');
  const fit = () => {
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  fit();
  container.append(canvas);

  const engine = Engine.create({ enableSleeping: true, gravity: { x: 0, y: 1.25 } });
  const world = engine.world;

  /* walls: left, right, floor and a high ceiling so a hard flick can't escape */
  let walls = [];
  const floorGap = 12;
  const buildWalls = () => {
    if (walls.length) Composite.remove(world, walls);
    const o = { isStatic: true, friction: 0.25, restitution: 0.3, label: 'wall' };
    walls = [
      Bodies.rectangle(w / 2, h - floorGap + WALL / 2, w + WALL * 2, WALL, o),
      Bodies.rectangle(-WALL / 2, h / 2 - 150, WALL, h + 700, o),
      Bodies.rectangle(w + WALL / 2, h / 2 - 150, WALL, h + 700, o),
      Bodies.rectangle(w / 2, -330 - WALL / 2, w + WALL * 2, WALL, o),
    ];
    Composite.add(world, walls);
  };
  buildWalls();

  /* sprites (three sizes per emoji) */
  const sizes = [34, 41, 48];
  const sprites = new Map();
  for (const e of new Set(pieces)) {
    sprites.set(e, sizes.map(d => ({ d, ...makeSprite(e, d, dpr) })));
  }

  const bodies = [];
  const makeBody = (i, x, y) => {
    const emoji = pieces[i % pieces.length];
    const variant = sprites.get(emoji)[(i * 7 + (i >> 1)) % sizes.length];
    const r = variant.d * 0.46;
    const b = Bodies.circle(x, y, r, {
      restitution: 0.46,
      friction: 0.06,
      frictionAir: 0.006,
      density: 0.0014,
      slop: 0.03,
      label: 'candy',
    });
    b.plugin = { sprite: variant };
    Body.setAngle(b, Math.random() * Math.PI * 2);
    Composite.add(world, b);
    bodies.push(b);
    return b;
  };

  const spawnX = () => w / 2;
  const spawnY = () => h - (Number(container.dataset.spawnBottom) || 100);

  const draw = () => {
    ctx.clearRect(0, 0, w, h);
    for (const b of bodies) {
      const { sprite } = b.plugin;
      ctx.save();
      ctx.translate(b.position.x, b.position.y);
      ctx.rotate(b.angle);
      ctx.drawImage(sprite.canvas, -sprite.size / 2, -sprite.size / 2, sprite.size, sprite.size);
      ctx.restore();
    }
  };

  /* ---------- reduced motion: a static pile, drawn once ---------- */
  if (calm) {
    for (let i = 0; i < count; i++) {
      makeBody(i, w * 0.12 + Math.random() * w * 0.76, h - 50 - (i % 8) * 34 - Math.random() * 20);
    }
    engine.enableSleeping = false;
    for (let s = 0; s < 420; s++) Engine.update(engine, STEP_MS);
    draw();
    return {
      stop() {
        Composite.clear(world, false);
        Engine.clear(engine);
        canvas.remove();
      },
    };
  }

  /* ---------- live physics ---------- */
  const mouse = Mouse.create(canvas);
  mouse.pixelRatio = dpr;
  // Matter would swallow the wheel and every touch on the canvas: take those listeners back.
  canvas.removeEventListener('wheel', mouse.mousewheel);
  canvas.removeEventListener('touchstart', mouse.mousedown);
  canvas.removeEventListener('touchmove', mouse.mousemove);
  canvas.removeEventListener('touchend', mouse.mouseup);

  const mc = MouseConstraint.create(engine, {
    mouse,
    constraint: { stiffness: 0.22, damping: 0.08, render: { visible: false } },
  });
  Composite.add(world, mc);

  let queue = count;
  let spawned = 0;
  let spawnClock = 0;
  let acc = 0;
  let lastActive = performance.now();
  let asleep = false;
  let grabbing = false;

  const spawnOne = () => {
    const b = makeBody(spawned, spawnX() + (Math.random() - 0.5) * 34, spawnY());
    const dir = Math.random() < 0.5 ? -1 : 1;
    Body.setVelocity(b, {
      x: dir * (0.6 + Math.random() * 3.6),
      y: -(5.5 + Math.random() * 5.2),
    });
    Body.setAngularVelocity(b, (Math.random() - 0.5) * 0.34);
    spawned += 1;
    queue -= 1;
  };

  const step = dt => {
    if (queue > 0) {
      spawnClock += dt;
      while (queue > 0 && spawnClock >= SPAWN_GAP) {
        spawnClock -= SPAWN_GAP;
        spawnOne();
      }
    }
    acc = Math.min(acc + dt, 0.1);
    while (acc >= STEP_MS / 1000) {
      Engine.update(engine, STEP_MS);
      acc -= STEP_MS / 1000;
    }
    for (const b of bodies) {
      const v = b.velocity;
      const sp = Math.hypot(v.x, v.y);
      if (sp > MAX_SPEED) Body.setVelocity(b, { x: (v.x / sp) * MAX_SPEED, y: (v.y / sp) * MAX_SPEED });
    }
    draw();
    if (queue === 0 && performance.now() - lastActive > IDLE_MS) {
      asleep = true;
      lp.stop();
    }
  };

  const lp = loop(step, container);

  const wake = () => {
    lastActive = performance.now();
    if (asleep) {
      asleep = false;
      lp.start();
    }
  };

  /* A touch that lands on a candy flicks it; anywhere else the page scrolls as normal. */
  const touchPoint = e => {
    const t = e.changedTouches[0];
    const r = canvas.getBoundingClientRect();
    return { x: ((t.clientX - r.left) / r.width) * w, y: ((t.clientY - r.top) / r.height) * h };
  };
  const onTouchStart = e => {
    wake();
    if (grabbing) return;
    if (Query.point(bodies, touchPoint(e)).length) {
      grabbing = true;
      mouse.mousedown(e);
    }
  };
  const onTouchMove = e => {
    if (!grabbing) return;
    lastActive = performance.now();
    mouse.mousemove(e);
  };
  const onTouchEnd = e => {
    if (!grabbing) return;
    grabbing = false;
    lastActive = performance.now();
    mouse.mouseup(e);
  };
  canvas.addEventListener('touchstart', onTouchStart, { passive: false });
  canvas.addEventListener('touchmove', onTouchMove, { passive: false });
  canvas.addEventListener('touchend', onTouchEnd, { passive: false });
  canvas.addEventListener('touchcancel', onTouchEnd, { passive: false });
  canvas.addEventListener('mousedown', wake);
  canvas.addEventListener('mousemove', e => { if (e.buttons) lastActive = performance.now(); });

  /* wake sleeping bodies when the held piece moves */
  const unsleep = () => { for (const b of bodies) Sleeping.set(b, false); };
  canvas.addEventListener('mouseup', unsleep);

  /* keep the walls matched to the container if it resizes */
  let ro = null;
  if (typeof ResizeObserver !== 'undefined') {
    ro = new ResizeObserver(() => {
      const nw = container.clientWidth;
      const nh = container.clientHeight;
      if (!nw || !nh || (Math.abs(nw - w) < 1 && Math.abs(nh - h) < 1)) return;
      w = nw;
      h = nh;
      fit();
      buildWalls();
      for (const b of bodies) {
        const r = b.circleRadius;
        Body.setPosition(b, {
          x: Math.min(Math.max(b.position.x, r), w - r),
          y: Math.min(b.position.y, h - floorGap - r),
        });
        Sleeping.set(b, false);
      }
      wake();
    });
    ro.observe(container);
  }

  lp.start();
  if (import.meta.env.DEV) {
    // Test hook: the live piece count and engine state.
    canvas.__candy = { bodies, engine, get asleep() { return asleep; } };
  }

  return {
    stop() {
      lp.stop();
      ro?.disconnect();
      Composite.clear(world, false);
      Engine.clear(engine);
      canvas.remove();
    },
  };
}

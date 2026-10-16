// The landing globe: three-globe in palette colors, hex-dot land, coral arcs to the
// places she's been, dashed sea-green arcs to the next stops, a tiny plane riding
// the been-there arcs, HTML labels and tap-to-pick. Loaded lazily with import().
import {
  WebGLRenderer, Scene, PerspectiveCamera, AmbientLight, DirectionalLight, HemisphereLight,
  Group, MeshPhongMaterial, Color, Sprite, SpriteMaterial, CanvasTexture, Vector3,
  CubicBezierCurve3, SRGBColorSpace,
} from 'three';
import ThreeGlobe from 'three-globe';
import { gsap, reduced } from './motion.js';

const DEG = Math.PI / 180;
const CORAL = '#FF6B6B';
const SEA_DEEP = '#12867C';
const CAM_DIST = 330;
const FOV = 40;
const TILT = 24 * DEG; // tilt so the northern hemisphere faces her
const START_LNG = 66; // between Egypt and China
const AUTO_SPEED = .07; // rad/s

/** The same plane artwork as the scroll flight path, pointing right. */
const PLANE_PATHS = [
  ['M5 -4.2 L-5 -21 C-6.2 -22.8 -10.4 -22.4 -10 -19.6 L-6.5 -4.2 Z M5 4.2 L-5 21 C-6.2 22.8 -10.4 22.4 -10 19.6 L-6.5 4.2 Z', CORAL],
  ['M-14 -3.6 L-20 -11 C-21 -12.4 -23.6 -12 -23.2 -10.2 L-21 -3.6 Z M-14 3.6 L-20 11 C-21 12.4 -23.6 12 -23.2 10.2 L-21 3.6 Z', CORAL],
  ['M-23 -4.4 C-10 -5.8 9 -5.8 15 -4 C21.5 -2.4 21.5 2.4 15 4 C9 5.8 -10 5.8 -23 4.4 C-24.4 2 -24.4 -2 -23 -4.4 Z', '#FFFFFF'],
];

function webglAvailable() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

/** Great-circle interpolation between two [lng, lat] points (same as d3 geoInterpolate). */
function geoInterpolate([lng1, lat1], [lng2, lat2]) {
  const toV = (lng, lat) => [Math.cos(lat * DEG) * Math.cos(lng * DEG), Math.cos(lat * DEG) * Math.sin(lng * DEG), Math.sin(lat * DEG)];
  const a = toV(lng1, lat1);
  const b = toV(lng2, lat2);
  const dot = Math.min(1, Math.max(-1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]));
  const ang = Math.acos(dot);
  return t => {
    if (ang < 1e-9) return [lng1, lat1];
    const s = Math.sin(ang);
    const ka = Math.sin((1 - t) * ang) / s;
    const kb = Math.sin(t * ang) / s;
    const v = [ka * a[0] + kb * b[0], ka * a[1] + kb * b[1], ka * a[2] + kb * b[2]];
    return [Math.atan2(v[1], v[0]) / DEG, Math.asin(Math.max(-1, Math.min(1, v[2]))) / DEG];
  };
}

function angularDistance(a, b) {
  const toV = p => [Math.cos(p.lat * DEG) * Math.cos(p.lng * DEG), Math.cos(p.lat * DEG) * Math.sin(p.lng * DEG), Math.sin(p.lat * DEG)];
  const u = toV(a);
  const v = toV(b);
  return Math.acos(Math.min(1, Math.max(-1, u[0] * v[0] + u[1] * v[1] + u[2] * v[2])));
}

const arcAlt = (a, b) => Math.min(.32, Math.max(.11, angularDistance(a, b) * .3));

function planeTexture() {
  const size = 128;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  g.translate(size / 2, size / 2);
  g.scale(2.3, 2.3);
  g.lineJoin = 'round';
  g.shadowColor = 'rgba(31, 42, 68, .35)';
  g.shadowBlur = 4;
  g.shadowOffsetY = 1.5;
  for (const [d, fill] of PLANE_PATHS) {
    const p = new Path2D(d);
    g.fillStyle = fill;
    g.fill(p);
  }
  g.shadowColor = 'transparent';
  g.strokeStyle = '#1F2A44';
  g.lineWidth = 1.3;
  for (const [d] of PLANE_PATHS) g.stroke(new Path2D(d));
  g.fillStyle = '#8EC5FF';
  g.fill(new Path2D('M13.6 -2.6 C17 -2.2 18.6 -1 18.8 0 C18.6 1 17 2.2 13.6 2.6 C14.2 1 14.2 -1 13.6 -2.6 Z'));
  g.strokeStyle = '#2EC4B6';
  g.lineWidth = 1.8;
  g.lineCap = 'round';
  g.beginPath(); g.moveTo(-16, 0); g.lineTo(8, 0); g.stroke();
  const tex = new CanvasTexture(c);
  tex.colorSpace = SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/**
 * Mounts the globe into `el`. Rejects if WebGL is unavailable so the caller can
 * fall back to the flat route map.
 */
export async function mountGlobe(el, { places, onPick } = {}) {
  if (!webglAvailable()) throw new Error('WebGL unavailable');

  const still = reduced();
  let raf = 0;
  let visible = true;
  let destroyed = false;
  let last = performance.now();
  let needsRender = true;
  const byId = Object.fromEntries(places.map(p => [p.id, p]));
  const origin = places.find(p => p.kind === 'origin') ?? places[0];
  const been = places.filter(p => p.kind === 'been');
  const next = places.filter(p => p.kind === 'next');

  /* ---- renderer ---- */
  const renderer = new WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = SRGBColorSpace;
  const canvas = renderer.domElement;
  canvas.className = 'globe-canvas';
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'A 3D globe with routes from Muscat to Egypt, Turkey, Dubai and China, and dashed routes to the next stops');

  const scene = new Scene();
  const camera = new PerspectiveCamera(FOV, 1, 1, 2000);
  camera.position.set(0, 0, CAM_DIST);

  scene.add(new HemisphereLight(0xffffff, 0xbfe0ff, 1.6));
  scene.add(new AmbientLight(0xffffff, .55));
  const sun = new DirectionalLight(0xffffff, 1.35);
  sun.position.set(-160, 220, 260);
  scene.add(sun);

  /* ---- globe ---- */
  const globe = new ThreeGlobe({ animateIn: false })
    .showAtmosphere(true)
    .atmosphereColor('#EAF6FF')
    .atmosphereAltitude(.16)
    .showGraticules(false);

  globe.globeMaterial(new MeshPhongMaterial({
    color: new Color('#8EC5FF'),
    emissive: new Color('#4C8FD6'),
    emissiveIntensity: .18,
    shininess: 9,
    specular: new Color('#7FA9D9'),
  }));

  // Arcs: a soft solid coral line plus a bright pulse running along it (been),
  // and a marching dashed sea-green line (next).
  const arcs = [];
  for (const p of been) {
    const alt = arcAlt(origin, p);
    arcs.push({ kind: 'been-base', from: origin, to: p, alt });
    arcs.push({ kind: 'been-pulse', from: origin, to: p, alt });
  }
  for (const p of next) arcs.push({ kind: 'next', from: origin, to: p, alt: arcAlt(origin, p) });

  globe
    .arcsData(arcs)
    .arcStartLat(d => d.from.lat).arcStartLng(d => d.from.lng)
    .arcEndLat(d => d.to.lat).arcEndLng(d => d.to.lng)
    .arcAltitude(d => d.alt)
    .arcColor(d => (d.kind === 'next' ? SEA_DEEP
      : d.kind === 'been-base' ? 'rgba(255, 107, 107, 0.9)'
        : ['rgba(255, 220, 200, 0)', 'rgba(255, 255, 255, 1)']))
    .arcStroke(d => (d.kind === 'next' ? .75 : d.kind === 'been-base' ? 1.25 : 1.5))
    .arcDashLength(d => (d.kind === 'next' ? .035 : d.kind === 'been-base' ? 1 : .22))
    .arcDashGap(d => (d.kind === 'next' ? .028 : d.kind === 'been-base' ? 0 : 1.2))
    .arcDashInitialGap(d => (d.kind === 'been-pulse' ? Math.random() : 0))
    .arcDashAnimateTime(d => (still ? 0 : d.kind === 'next' ? 9000 : d.kind === 'been-pulse' ? 2600 : 0))
    .arcCurveResolution(48)
    .arcsTransitionDuration(0);

  globe
    .pointsData(places)
    .pointLat(d => d.lat).pointLng(d => d.lng)
    .pointColor(d => (d.kind === 'origin' ? '#1F2A44' : d.kind === 'been' ? CORAL : SEA_DEEP))
    .pointAltitude(d => (d.kind === 'origin' ? .022 : .014))
    .pointRadius(d => (d.kind === 'origin' ? .9 : .7))
    .pointResolution(16)
    .pointsMerge(false)
    .pointsTransitionDuration(0);

  globe
    .ringsData(still ? [] : [origin, ...been])
    .ringLat(d => d.lat).ringLng(d => d.lng)
    .ringColor(d => (d.kind === 'origin'
      ? t => `rgba(31, 42, 68, ${(1 - t) * .7})`
      : t => `rgba(255, 107, 107, ${(1 - t) * .8})`))
    .ringMaxRadius(d => (d.kind === 'origin' ? 4.2 : 2.8))
    .ringPropagationSpeed(d => (d.kind === 'origin' ? 2.4 : 1.8))
    .ringRepeatPeriod(d => (d.kind === 'origin' ? 1500 : 2200))
    .ringAltitude(.004);

  const tilt = new Group();
  const spin = new Group();
  tilt.rotation.x = TILT;
  spin.rotation.y = -START_LNG * DEG;
  spin.add(globe);
  tilt.add(spin);
  scene.add(tilt);

  /* ---- land (hex dots), loaded alongside ---- */
  fetch(import.meta.env.BASE_URL + 'data/countries-110m.geojson')
    .then(r => (r.ok ? r.json() : null))
    .then(geo => {
      if (!geo || destroyed) return;
      globe
        .hexPolygonsData(geo.features)
        .hexPolygonResolution(3)
        .hexPolygonMargin(.3)
        .hexPolygonAltitude(.006)
        .hexPolygonColor(() => '#FFFBF4')
        .hexPolygonsTransitionDuration(0);
      requestRender();
    })
    .catch(() => { /* the globe still works without land */ });

  /* ---- the tiny plane ---- */
  const planeMat = new SpriteMaterial({ map: planeTexture(), transparent: true, depthWrite: false });
  const plane = new Sprite(planeMat);
  plane.scale.set(15, 15, 1);
  plane.renderOrder = 5;
  globe.add(plane);

  const vecAt = (lng, lat, alt) => {
    const c = globe.getCoords(lat, lng, alt);
    return new Vector3(c.x, c.y, c.z);
  };
  // The same cubic curve three-globe draws for an arc with a fixed altitude.
  const curveFor = (a, b, alt) => {
    const s = [a.lng, a.lat];
    const e = [b.lng, b.lat];
    const interp = geoInterpolate(s, e);
    const cp = alt * 1.5;
    const m1 = interp(.25);
    const m2 = interp(.75);
    return new CubicBezierCurve3(vecAt(s[0], s[1], 0), vecAt(m1[0], m1[1], cp), vecAt(m2[0], m2[1], cp), vecAt(e[0], e[1], 0));
  };
  const legs = been.map(p => {
    const alt = arcAlt(origin, p);
    return { curve: curveFor(origin, p, alt), dur: 1.6 + angularDistance(origin, p) * 2.6 };
  });
  let legIndex = 0;
  let legT = 0;

  /* ---- labels ---- */
  const labelLayer = document.createElement('div');
  labelLayer.className = 'globe-labels';
  labelLayer.setAttribute('aria-hidden', 'true');
  const labels = places.filter(p => p.side).map(p => {
    const node = document.createElement('span');
    node.className = `gl-label gl-${p.kind} gl-side-${p.side}`;
    node.innerHTML = `<i class="gl-dot"></i><b>${p.name}</b>`;
    labelLayer.append(node);
    return { p, node, local: vecAt(p.lng, p.lat, .02) };
  });

  el.append(canvas, labelLayer);

  /* ---- sizing ---- */
  let W = 1;
  let H = 1;
  const resize = () => {
    const r = el.getBoundingClientRect();
    W = Math.max(1, Math.round(r.width));
    H = Math.max(1, Math.round(r.height));
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    // keep the whole globe (plus arcs) in frame on narrow screens
    const fitDist = 128 / Math.tan((FOV * DEG) / 2) / Math.min(1, camera.aspect);
    camera.position.z = Math.max(CAM_DIST, fitDist);
    camera.updateProjectionMatrix();
    requestRender();
  };
  const ro = new ResizeObserver(resize);
  ro.observe(el);
  resize();

  /* ---- interaction: horizontal drag spins, vertical swipes scroll, taps pick ---- */
  let rotY = spin.rotation.y;
  let vel = 0;
  let dragging = false;
  let lastInteract = -1e9;
  let down = null;
  let lastMove = null;

  const tmp = new Vector3();
  const camDir = new Vector3();
  const screenOf = local => {
    tmp.copy(local).applyMatrix4(globe.matrixWorld);
    camDir.copy(camera.position).sub(tmp).normalize();
    const facing = tmp.clone().normalize().dot(camDir);
    tmp.project(camera);
    return { x: (tmp.x * .5 + .5) * W, y: (-tmp.y * .5 + .5) * H, facing };
  };

  const pick = (cx, cy) => {
    const rect = canvas.getBoundingClientRect();
    const x = cx - rect.left;
    const y = cy - rect.top;
    // labels first (they're bigger targets)
    for (const l of labels) {
      if (l.facing < .15) continue;
      const r = l.node.getBoundingClientRect();
      if (cx >= r.left - 4 && cx <= r.right + 4 && cy >= r.top - 4 && cy <= r.bottom + 4) return l.p.id;
    }
    let best = null;
    let bestD = 34;
    for (const p of places) {
      const s = screenOf(vecAt(p.lng, p.lat, .02));
      if (s.facing < .1) continue;
      const d = Math.hypot(s.x - x, s.y - y);
      if (d < bestD) { bestD = d; best = p.id; }
    }
    return best;
  };

  const onDown = e => {
    if (e.button != null && e.button !== 0) return;
    down = { x: e.clientX, y: e.clientY, t: performance.now(), id: e.pointerId, moved: 0 };
    lastMove = { x: e.clientX, t: performance.now() };
    dragging = true;
    vel = 0;
    lastInteract = performance.now();
    wake();
  };
  const onMove = e => {
    if (!down || e.pointerId !== down.id) return;
    const now = performance.now();
    const dx = e.clientX - lastMove.x;
    down.moved = Math.max(down.moved, Math.hypot(e.clientX - down.x, e.clientY - down.y));
    if (down.moved > 6 && !down.captured) {
      try { canvas.setPointerCapture(e.pointerId); down.captured = true; } catch { /* ignore */ }
    }
    const k = 0.0062 * Math.max(.75, 360 / Math.max(W, 1));
    rotY += dx * k;
    const dt = Math.max(16, now - lastMove.t) / 1000;
    vel = vel * .35 + gsap.utils.clamp(-3.2, 3.2, (dx * k) / dt) * .65;
    lastMove = { x: e.clientX, t: now };
    lastInteract = now;
    requestRender();
  };
  const onUp = e => {
    if (!down || e.pointerId !== down.id) return;
    const isTap = down.moved < 9 && performance.now() - down.t < 600;
    if (performance.now() - lastMove.t > 90) vel = 0;
    dragging = false;
    lastInteract = performance.now();
    down = null;
    if (isTap) {
      const id = pick(e.clientX, e.clientY);
      if (id && byId[id]) onPick?.(id, { x: e.clientX, y: e.clientY });
    }
  };
  const onCancel = () => { dragging = false; down = null; };

  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointercancel', onCancel);
  canvas.addEventListener('lostpointercapture', () => { if (down) onCancel(); });

  /* ---- loop (paused offscreen and in background tabs) ---- */

  const updatePlane = dt => {
    if (!legs.length) { plane.visible = false; return; }
    const leg = legs[legIndex];
    legT += dt / leg.dur;
    // a short rest at the destination, invisible, before the next leg
    if (legT >= 1.18) {
      legT = 0;
      legIndex = (legIndex + 1) % legs.length;
    }
    const t = Math.min(1, legT);
    const e = t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    const pos = leg.curve.getPoint(e);
    plane.position.copy(pos);
    planeMat.opacity = legT > 1 ? 0 : Math.max(0, Math.min(1, t / .1, (1 - t) / .1));
    const s = 13 + Math.sin(Math.PI * e) * 5;
    plane.scale.set(s, s, 1);
    // point the plane along the arc, in screen space
    const ahead = leg.curve.getPoint(Math.min(1, e + .02));
    const behind = leg.curve.getPoint(Math.max(0, e - .02));
    const a = screenOf(behind);
    const b = screenOf(ahead);
    planeMat.rotation = Math.atan2(-(b.y - a.y), b.x - a.x);
  };

  const placeStill = () => {
    // reduced motion: park the plane mid-way along the China arc
    const leg = legs[legs.length - 1];
    if (!leg) { plane.visible = false; return; }
    plane.position.copy(leg.curve.getPoint(.55));
    planeMat.opacity = 1;
    const a = screenOf(leg.curve.getPoint(.53));
    const b = screenOf(leg.curve.getPoint(.57));
    planeMat.rotation = Math.atan2(-(b.y - a.y), b.x - a.x);
  };

  const updateLabels = () => {
    for (const l of labels) {
      const s = screenOf(l.local);
      l.facing = s.facing;
      const o = Math.max(0, Math.min(1, (s.facing - .12) / .22));
      l.node.style.transform = `translate3d(${s.x.toFixed(1)}px, ${s.y.toFixed(1)}px, 0)`;
      l.node.style.opacity = o.toFixed(3);
      l.node.style.visibility = o < .02 ? 'hidden' : 'visible';
    }
  };

  function frame(now) {
    raf = 0;
    if (destroyed) return;
    const dt = Math.min(.05, (now - last) / 1000);
    last = now;
    let animating = false;
    if (!still) {
      if (!dragging) {
        const idle = now - lastInteract > 2200;
        const target = idle ? AUTO_SPEED : 0;
        vel += (target - vel) * Math.min(1, dt * (Math.abs(vel) > AUTO_SPEED * 1.5 ? 3.2 : 1.1));
        rotY += vel * dt;
      }
      animating = true;
    } else if (!dragging && Math.abs(vel) > .002) {
      vel *= Math.pow(.02, dt);
      rotY += vel * dt;
      animating = true;
    }
    spin.rotation.y = rotY;
    scene.updateMatrixWorld();
    if (!still) updatePlane(dt);
    else placeStill();
    renderer.render(scene, camera);
    updateLabels();
    needsRender = false;
    if ((animating || dragging) && visible && !document.hidden) raf = requestAnimationFrame(frame);
  }

  function wake() {
    if (destroyed || raf || !visible || document.hidden) return;
    last = performance.now();
    raf = requestAnimationFrame(frame);
  }
  function requestRender() {
    needsRender = true;
    wake();
  }

  const io = new IntersectionObserver(entries => {
    for (const entry of entries) visible = entry.isIntersecting;
    if (visible) {
      if (!still) globe.resumeAnimation?.();
      wake();
    } else {
      globe.pauseAnimation?.();
      cancelAnimationFrame(raf);
      raf = 0;
    }
  }, { rootMargin: '80px 0px' });
  io.observe(el);

  const onVis = () => {
    if (document.hidden) {
      cancelAnimationFrame(raf);
      raf = 0;
    } else {
      wake();
    }
  };
  document.addEventListener('visibilitychange', onVis);

  if (still) globe.pauseAnimation?.();

  // entrance
  if (!still) {
    gsap.fromTo(canvas, { opacity: 0, scale: .86 }, { opacity: 1, scale: 1, duration: 1.1, ease: 'expo.out' });
    gsap.fromTo(labelLayer, { opacity: 0 }, { opacity: 1, duration: .6, delay: .5 });
  }
  requestRender();

  return {
    destroy() {
      destroyed = true;
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      document.removeEventListener('visibilitychange', onVis);
      try { globe._destructor?.(); } catch { /* ignore */ }
      planeMat.map?.dispose();
      planeMat.dispose();
      renderer.dispose();
      canvas.remove();
      labelLayer.remove();
    },
    get needsRender() { return needsRender; },
  };
}

// Canvas helpers shared by the canvas games.

/**
 * Sizes a canvas for crisp drawing at any devicePixelRatio. Draw in logical
 * units (w × h); CSS scales it to the column width with a fixed aspect ratio.
 */
export function setupCanvas(canvas, w, h) {
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  Object.assign(canvas.style, {
    display: 'block',
    width: '100%',
    height: 'auto',
    aspectRatio: `${w} / ${h}`,
    touchAction: 'none',
    userSelect: 'none',
    webkitUserSelect: 'none',
  });
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return ctx;
}

/** Pointer/mouse/touch event position in the canvas's logical units. */
export function localPoint(canvas, evt, w, h) {
  const rect = canvas.getBoundingClientRect();
  const src = evt.touches?.[0] ?? evt.changedTouches?.[0] ?? evt;
  return {
    x: ((src.clientX - rect.left) / (rect.width || 1)) * w,
    y: ((src.clientY - rect.top) / (rect.height || 1)) * h,
  };
}

/**
 * requestAnimationFrame loop. dt is in seconds, clamped to 0.05.
 * It pauses while `el` is offscreen and while the tab is hidden.
 */
export function loop(fn, el) {
  let wanted = false;
  let onscreen = !el || typeof IntersectionObserver === 'undefined';
  let raf = 0;
  let last = 0;

  const canRun = () => wanted && onscreen && !document.hidden;

  const frame = now => {
    raf = 0;
    if (!canRun()) return;
    const dt = last ? Math.min((now - last) / 1000, 0.05) : 0;
    last = now;
    fn(dt);
    if (canRun() && !raf) raf = requestAnimationFrame(frame);
  };

  const sync = () => {
    if (canRun()) {
      if (!raf) {
        last = 0;
        raf = requestAnimationFrame(frame);
      }
    } else if (raf) {
      cancelAnimationFrame(raf);
      raf = 0;
    }
  };

  let io = null;
  if (el && typeof IntersectionObserver !== 'undefined') {
    io = new IntersectionObserver(entries => {
      onscreen = entries[entries.length - 1].isIntersecting;
      sync();
    }, { threshold: 0 });
    io.observe(el);
  }
  document.addEventListener('visibilitychange', sync);

  return {
    start() { wanted = true; sync(); },
    stop() { wanted = false; sync(); },
    get running() { return canRun(); },
  };
}

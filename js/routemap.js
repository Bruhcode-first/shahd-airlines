// The flat route map: the fallback when WebGL isn't available. An equirectangular
// world (land drawn from the same GeoJSON as the globe), curved routes from Muscat
// in the globe's colors, and tappable place buttons.

const NS = 'http://www.w3.org/2000/svg';
// Crop: longitudes -180..180, latitudes 72N..-42S
const LAT_TOP = 72;
const LAT_BOTTOM = -42;
const VB_W = 360;
const VB_H = LAT_TOP - LAT_BOTTOM;

const px = lng => lng + 180;
const py = lat => LAT_TOP - lat;

function ringPath(ring) {
  let d = '';
  let prev = null;
  for (const [lng, lat] of ring) {
    // skip the antimeridian jump
    const cmd = prev && Math.abs(lng - prev) > 180 ? 'M' : (d ? 'L' : 'M');
    d += `${cmd}${px(lng).toFixed(1)} ${py(lat).toFixed(1)}`;
    prev = lng;
  }
  return d + 'Z';
}

function landPath(features) {
  let d = '';
  for (const f of features) {
    const g = f.geometry;
    if (!g) continue;
    const polys = g.type === 'Polygon' ? [g.coordinates] : g.type === 'MultiPolygon' ? g.coordinates : [];
    for (const poly of polys) d += ringPath(poly[0]);
  }
  return d;
}

function routeD(a, b) {
  const x1 = px(a.lng);
  const y1 = py(a.lat);
  const x2 = px(b.lng);
  const y2 = py(b.lat);
  const dist = Math.hypot(x2 - x1, y2 - y1);
  const lift = Math.min(46, 6 + dist * .32);
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2 - lift;
  return `M${x1.toFixed(1)} ${y1.toFixed(1)} Q${mx.toFixed(1)} ${my.toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}`;
}

const el = (name, attrs = {}) => {
  const node = document.createElementNS(NS, name);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  return node;
};

/** Mounts the flat map into `el`. Returns { destroy() }. */
export function mountRouteMap(host, { places, onPick } = {}) {
  const origin = places.find(p => p.kind === 'origin') ?? places[0];
  const wrap = document.createElement('div');
  wrap.className = 'routemap';

  const svg = el('svg', {
    class: 'routemap-svg',
    viewBox: `0 0 ${VB_W} ${VB_H}`,
    role: 'img',
    'aria-label': 'A map with routes from Muscat to Egypt, Turkey, Dubai and China, and dashed routes to the next stops',
  });
  const land = el('path', { class: 'rm-land', d: '' });
  svg.append(el('rect', { class: 'rm-sea', x: 0, y: 0, width: VB_W, height: VB_H, rx: 10 }), land);

  const routes = el('g', { class: 'rm-routes' });
  for (const p of places) {
    if (p === origin) continue;
    routes.append(el('path', { class: `rm-route rm-${p.kind}`, d: routeD(origin, p) }));
  }
  svg.append(routes);

  const dots = el('g', { class: 'rm-dots' });
  for (const p of places) {
    dots.append(el('circle', { class: `rm-dot rm-${p.kind}`, cx: px(p.lng).toFixed(1), cy: py(p.lat).toFixed(1), r: p.kind === 'origin' ? 3.2 : 2.4 }));
  }
  svg.append(dots);

  // Muscat gets a pin on the map; every labelled place gets a tappable chip below it.
  const pin = document.createElement('span');
  pin.className = 'rm-pin gl-label gl-origin';
  pin.style.left = `${(px(origin.lng) / VB_W) * 100}%`;
  pin.style.top = `${(py(origin.lat) / VB_H) * 100}%`;
  pin.innerHTML = `<i class="gl-dot"></i><b>${origin.name}</b>`;
  pin.setAttribute('aria-hidden', 'true');
  const mapBox = document.createElement('div');
  mapBox.className = 'rm-map';
  mapBox.append(svg, pin);
  wrap.append(mapBox);

  const layer = document.createElement('div');
  layer.className = 'rm-places';
  for (const p of places.filter(q => q.side && q !== origin)) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `rm-place gl-label gl-${p.kind}`;
    b.innerHTML = `<i class="gl-dot"></i><b>${p.name}</b>`;
    b.addEventListener('click', e => {
      const r = b.getBoundingClientRect();
      onPick?.(p.id, { x: e.clientX || r.left + r.width / 2, y: e.clientY || r.top + r.height / 2 });
    });
    layer.append(b);
  }
  wrap.append(layer);
  host.append(wrap);

  let alive = true;
  fetch(import.meta.env.BASE_URL + 'data/countries-110m.geojson')
    .then(r => (r.ok ? r.json() : null))
    .then(geo => { if (alive && geo) land.setAttribute('d', landPath(geo.features)); })
    .catch(() => { /* routes still show without land */ });

  return {
    destroy() {
      alive = false;
      wrap.remove();
    },
  };
}

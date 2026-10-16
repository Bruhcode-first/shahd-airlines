// The scroll flight path: a dotted S-curve route down the page, a plane scrubbed
// along it by scroll, and a contrail drawn behind the plane.
import { gsap, ScrollTrigger, MOTION } from './motion.js';

const NS = 'http://www.w3.org/2000/svg';
const PLANE_Y = .42; // where the plane rides, as a fraction of the viewport height

const el = (name, attrs = {}) => {
  const node = document.createElementNS(NS, name);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  return node;
};

const PLANE_SHAPE = `
  <path d="M5 -4.2 L-5 -21 C-6.2 -22.8 -10.4 -22.4 -10 -19.6 L-6.5 -4.2 Z M5 4.2 L-5 21 C-6.2 22.8 -10.4 22.4 -10 19.6 L-6.5 4.2 Z" fill="#FF6B6B" stroke="#1F2A44" stroke-width="1.1" stroke-linejoin="round"/>
  <path d="M-14 -3.6 L-20 -11 C-21 -12.4 -23.6 -12 -23.2 -10.2 L-21 -3.6 Z M-14 3.6 L-20 11 C-21 12.4 -23.6 12 -23.2 10.2 L-21 3.6 Z" fill="#FF6B6B" stroke="#1F2A44" stroke-width="1.1" stroke-linejoin="round"/>
  <path d="M-23 -4.4 C-10 -5.8 9 -5.8 15 -4 C21.5 -2.4 21.5 2.4 15 4 C9 5.8 -10 5.8 -23 4.4 C-24.4 2 -24.4 -2 -23 -4.4 Z" fill="#FFFFFF" stroke="#1F2A44" stroke-width="1.2" stroke-linejoin="round"/>
  <path d="M13.6 -2.6 C17 -2.2 18.6 -1 18.8 0 C18.6 1 17 2.2 13.6 2.6 C14.2 1 14.2 -1 13.6 -2.6 Z" fill="#8EC5FF"/>
  <path d="M-16 0 L8 0" stroke="#2EC4B6" stroke-width="1.6" stroke-linecap="round"/>`;

function docTop(node) {
  return node.getBoundingClientRect().top + window.scrollY;
}

function routeD(W, startY, endY, vh) {
  const cx = W / 2;
  const amp = Math.min(W * .36, 210);
  const span = Math.max(1, endY - startY);
  const steps = Math.max(2, Math.round(span / Math.min(Math.max(vh * .8, 440), 720)));
  const step = span / steps;
  const k = step * .55;
  const xAt = i => (i % 2 === 0 ? cx + amp : cx - amp);
  let d = `M ${xAt(0).toFixed(1)} ${startY.toFixed(1)}`;
  for (let i = 1; i <= steps; i++) {
    const y0 = startY + step * (i - 1);
    const y1 = startY + step * i;
    d += ` C ${xAt(i - 1).toFixed(1)} ${(y0 + k).toFixed(1)}, ${xAt(i).toFixed(1)} ${(y1 - k).toFixed(1)}, ${xAt(i).toFixed(1)} ${y1.toFixed(1)}`;
  }
  return d;
}

export function initFlightPath() {
  const svg = document.getElementById('flightpath');
  const main = document.getElementById('app');
  if (!svg || !main) return;

  const mm = gsap.matchMedia();
  mm.add(MOTION, ctx => {
    const animated = !ctx.conditions.reduce;
    let tl = null;
    let timer = 0;
    let lastKey = '';

    const build = () => {
      const W = document.documentElement.clientWidth;
      const H = Math.ceil(svg.getBoundingClientRect().height);
      const vh = window.innerHeight;
      const first = document.getElementById('welcome') ?? main.firstElementChild;
      const last = document.getElementById('landing') ?? main.lastElementChild;
      if (!first || !last || !W || !H) return;
      // start just under the welcome card, so the plane waits by the scroll cue
      const firstCard = first.firstElementChild ?? first;
      const startY = Math.max(docTop(firstCard) + firstCard.offsetHeight + 24, vh * PLANE_Y);
      const endY = Math.min(H - 40, docTop(last) + Math.min(last.offsetHeight, vh) * .6);
      const key = [W, H, vh, Math.round(startY), Math.round(endY)].join(':');
      if (key === lastKey) return;
      lastKey = key;

      const progress = tl ? tl.progress() : 0;
      tl?.scrollTrigger?.kill();
      tl?.kill();
      tl = null;

      svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
      svg.setAttribute('preserveAspectRatio', 'none');
      svg.textContent = '';
      const d = routeD(W, startY, endY, vh);
      const route = el('path', { d, class: 'fp-route' });
      svg.append(route);
      if (!animated) return;

      const trail = el('path', { d, class: 'fp-trail' });
      const tail = el('path', { d, class: 'fp-tail' });
      const plane = el('g', { class: 'fp-plane' });
      const shadow = PLANE_SHAPE.replace(/fill="[^"]+"/g, '').replace(/stroke="[^"]+"/g, '');
      plane.innerHTML = `<g transform="scale(1.2)"><g transform="translate(6 10)" opacity=".1" fill="#1F2A44">${shadow}</g>${PLANE_SHAPE}</g>`;
      svg.append(trail, tail, plane);

      const maxScroll = Math.max(0, document.documentElement.scrollHeight - vh);
      const start = Math.max(0, startY - vh * PLANE_Y);
      const end = Math.min(maxScroll, endY - vh * PLANE_Y);
      if (end <= start + 10) return;

      gsap.set([trail, tail], { drawSVG: '0% 0%' });
      tl = gsap.timeline({
        scrollTrigger: { start, end, scrub: .8 },
        onUpdate() {
          const p = this.progress();
          gsap.set(tail, { drawSVG: `${Math.max(0, p - .035) * 100}% ${p * 100}%` });
        },
      });
      tl.to(plane, {
        motionPath: { path: route, align: route, alignOrigin: [.5, .5], autoRotate: true },
        ease: 'none',
        duration: 1,
      }, 0);
      tl.to(trail, { drawSVG: '0% 100%', ease: 'none', duration: 1 }, 0);
      tl.progress(1e-4).progress(progress);
    };

    const schedule = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        build();
        ScrollTrigger.refresh();
      }, 180);
    };

    build();
    const ro = new ResizeObserver(schedule);
    ro.observe(main);
    window.addEventListener('resize', schedule);
    document.fonts?.ready?.then(schedule);

    return () => {
      clearTimeout(timer);
      ro.disconnect();
      window.removeEventListener('resize', schedule);
      tl?.scrollTrigger?.kill();
      tl?.kill();
      svg.textContent = '';
    };
  });
}

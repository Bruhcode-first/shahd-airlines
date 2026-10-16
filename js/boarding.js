// The boarding pass: tilt, the Shood gag, the stub tear and the fly-through-the-clouds transition.
import { gsap, MOTION, reduced } from './motion.js';
import { haptic, shake } from './fx.js';

const SHOOD_LINE = "Noted. Won't happen again 😤";
const TEAR_DRAG = 40;

/**
 * Runs the boarding intro. `onBoarded` is called synchronously the moment the
 * page unlocks (before the overlay is removed). Resolves when boarding is done.
 */
export function initBoarding({ onBoarded } = {}) {
  const root = document.getElementById('boarding');
  if (!root) {
    document.body.classList.remove('locked');
    onBoarded?.();
    return Promise.resolve();
  }

  const ticket = root.querySelector('.ticket');
  const stage = root.querySelector('.ticket-stage');
  const stub = root.querySelector('.stub');
  const shood = root.querySelector('.shood');
  const bubble = root.querySelector('.shood-bubble');
  const plane = root.querySelector('.b-plane');
  const sky = root.querySelector('.b-sky');
  const layers = [...root.querySelectorAll('.b-clouds:not(.b-clouds-rush)')];
  const rush = root.querySelector('.b-clouds-rush');
  const welcomeCard = document.querySelector('#welcome .welcome-card');

  let torn = false;
  let idle = null;
  let removeTilt = null;

  /* ---- entrance, tilt and idle sway ---- */
  const mm = gsap.matchMedia();
  mm.add({ ...MOTION, fine: '(pointer: fine)' }, ctx => {
    const { reduce, fine } = ctx.conditions;
    if (reduce) return;

    gsap.fromTo(ticket,
      { y: 70, rotationX: -28, opacity: 0, scale: .94 },
      { y: 0, rotationX: 0, rotationY: 0, opacity: 1, scale: 1, duration: 1.1, ease: 'expo.out' });
    gsap.from(layers, { opacity: 0, scale: .85, duration: 1.4, stagger: .12, ease: 'power2.out' });

    if (fine) {
      const rx = gsap.quickTo(ticket, 'rotationX', { duration: .7, ease: 'power3' });
      const ry = gsap.quickTo(ticket, 'rotationY', { duration: .7, ease: 'power3' });
      // ease back to flat when the pointer rests (keeps the text crisp)
      let rest = 0;
      const settle = () => { rx(0); ry(0); ticket.style.setProperty('--hx', '0%'); };
      const onMove = e => {
        if (torn) return;
        clearTimeout(rest);
        rest = setTimeout(settle, 1800);
        const nx = e.clientX / innerWidth - .5;
        const ny = e.clientY / innerHeight - .5;
        ry(nx * 16);
        rx(-ny * 16);
        ticket.style.setProperty('--hx', `${(nx * 60).toFixed(1)}%`);
      };
      window.addEventListener('pointermove', onMove, { passive: true });
      removeTilt = () => { clearTimeout(rest); window.removeEventListener('pointermove', onMove); };
      return removeTilt;
    }

    // Touch: a gentle idle sway. Each swing returns to exactly 0° and rests there,
    // so the pass is rasterized crisp (and tappable) between swings.
    const swing = dir => [
      [{ rotationY: 3 * dir, rotationX: -1.5 * dir, y: -4, duration: 1.1, ease: 'sine.inOut' }],
      [{ rotationY: 0, rotationX: 0, y: 0, duration: 1.1, ease: 'sine.inOut' }],
    ];
    idle = gsap.timeline({ repeat: -1, delay: 1.2 });
    for (const dir of [1, -1]) {
      for (const [vars] of swing(dir)) idle.to(ticket, vars);
      idle.to({}, { duration: 1.2 });
    }
    return () => idle?.kill();
  });

  /* ---- Shood ---- */
  let bubbleTimer = 0;
  shood?.addEventListener('click', () => {
    if (!bubble) return;
    bubble.textContent = SHOOD_LINE;
    bubble.hidden = false;
    // sit the bubble just above SHOOD, without spilling off the pass
    const field = bubble.parentElement;
    const left = Math.max(0, Math.min(shood.offsetLeft - 8, field.clientWidth - bubble.offsetWidth + 8));
    bubble.style.left = `${left}px`;
    haptic(10);
    clearTimeout(bubbleTimer);
    gsap.killTweensOf(bubble);
    if (reduced()) {
      gsap.set(bubble, { opacity: 1, scale: 1, y: 0 });
    } else {
      gsap.fromTo(bubble, { opacity: 0, scale: .4, y: 10, rotation: -6 }, {
        opacity: 1, scale: 1, y: 0, rotation: 0, duration: .45, ease: 'back.out(2.4)',
      });
      shake(shood, 3);
    }
    bubbleTimer = setTimeout(() => {
      gsap.to(bubble, {
        opacity: 0, scale: .85, y: 6, duration: reduced() ? .01 : .22, ease: 'power2.in',
        onComplete: () => { bubble.hidden = true; },
      });
    }, 2400);
  });

  return new Promise(resolve => {
    const finish = () => {
      mm.revert();
      document.body.classList.remove('locked');
      try {
        onBoarded?.();
      } finally {
        root.remove();
        window.scrollTo(0, 0);
        const welcome = document.getElementById('welcome');
        if (welcome) {
          welcome.setAttribute('tabindex', '-1');
          welcome.focus({ preventScroll: true });
        }
        resolve();
      }
    };

    const tear = () => {
      if (torn) return;
      torn = true;
      haptic(18);
      idle?.kill();
      removeTilt?.();
      clearTimeout(bubbleTimer);

      if (reduced()) {
        gsap.to(root, { opacity: 0, duration: .3, ease: 'none', onComplete: finish });
        return;
      }

      ticket.classList.add('torn');
      const vw = innerWidth;
      const vh = innerHeight;
      const tl = gsap.timeline({ onComplete: finish });

      // 1. the stub rips and falls away
      tl.to(ticket, { rotationX: 0, rotationY: 0, y: 0, duration: .3, ease: 'power2.out' }, 0)
        .to(stub, { y: '+=16', rotation: 5, duration: .12, ease: 'power2.out' }, 0)
        .to(stub, { y: vh * .9, x: 40, rotation: 18, opacity: .9, duration: .8, ease: 'power2.in' }, .12);

      // 2. a plane takes off across the pass
      tl.fromTo(plane,
        { x: -110, y: vh * .62, opacity: 1, scale: .7, rotation: 6 },
        { x: vw + 40, y: vh * .2, scale: 1.15, rotation: -6, duration: 1, ease: 'power1.in' }, .28);

      // the pass lifts off toward the sky
      tl.to(stage, { y: -vh * .16, scale: .8, rotationX: 22, opacity: 0, duration: .55, ease: 'power2.in' }, .62);

      // a bank of cloud rushes at the camera (white-out), then parts
      if (rush) {
        tl.set(rush, { visibility: 'visible' }, .5)
          .fromTo(rush, { scale: .3, opacity: 0 }, { scale: 1.15, opacity: 1, duration: .55, ease: 'power2.in' }, .5)
          .to(rush, { scale: 3.6, opacity: 0, duration: .85, ease: 'power2.inOut' }, 1.05);
      }

      // 3. fly through the clouds: the layers rush past the camera
      tl.to(layers, {
        scale: 3.5,
        opacity: 0,
        duration: 1.15,
        ease: 'power2.in',
        stagger: { each: .22, from: 'end' },
      }, .62);
      tl.to(sky, { opacity: 0, duration: .3, ease: 'none' }, .95);

      // 4. the welcome card opens up underneath
      if (welcomeCard) {
        tl.fromTo(welcomeCard,
          { y: 46, scale: .94, opacity: 0 },
          { y: 0, scale: 1, opacity: 1, duration: .8, ease: 'expo.out', clearProps: 'transform,opacity' }, 1.2);
      }
    };

    /* ---- stub: tap, or drag it down past 40px ---- */
    let startY = null;
    stub?.addEventListener('pointerdown', e => {
      if (torn) return;
      startY = e.clientY;
      try { stub.setPointerCapture(e.pointerId); } catch { /* ignore */ }
    });
    stub?.addEventListener('pointermove', e => {
      if (torn || startY === null) return;
      const dy = Math.max(0, e.clientY - startY);
      gsap.set(stub, { y: dy * .55, rotation: dy * .06 });
      if (dy > TEAR_DRAG) {
        startY = null;
        tear();
      }
    });
    const release = () => {
      if (torn || startY === null) return;
      startY = null;
      gsap.to(stub, { y: 0, rotation: 0, duration: .6, ease: 'elastic.out(1, .45)' });
    };
    stub?.addEventListener('pointerup', release);
    stub?.addEventListener('pointercancel', release);
    stub?.addEventListener('click', tear);
  });
}

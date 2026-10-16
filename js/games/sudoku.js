import '../../css/stops/sudoku.css';
import { gsap, reduced } from '../motion.js';
import { celebrate, burst, haptic, toast } from '../fx.js';
import { PUZZLE, SOLUTION, conflicts, isSolved, place, hint } from './sudoku-logic.js';

const STARS = [[8, 12, 2], [22, 6, 1.5], [41, 16, 2.5], [63, 8, 1.5], [82, 14, 2], [93, 5, 1.5], [14, 38, 1.5], [91, 42, 2]];

export function init(stageEl, ctx = { award() {} }) {
  stageEl.innerHTML = `
    <div class="sdk card">
      <div class="sdk-sky" aria-hidden="true">
        <span class="sdk-moon"></span>
        ${STARS.map(([x, y, s], i) => `<i class="sdk-star" style="left:${x}%;top:${y}%;--s:${s}px;--d:${(i * 0.45).toFixed(2)}s"></i>`).join('')}
      </div>
      <div class="sdk-board" role="grid" aria-label="Sudoku, 4 by 4"></div>
      <div class="sdk-pad" role="group" aria-label="Number pad">
        ${[1, 2, 3, 4].map(n => `<button type="button" class="sdk-num" data-n="${n}" aria-label="Place ${n}">${n}</button>`).join('')}
      </div>
      <button type="button" class="sdk-hint">💡 Hint</button>
      <p class="sdk-status" aria-live="polite">Tap an empty square, then a number.</p>
    </div>
    <div class="sdk-result card" hidden>
      <p class="sdk-result-kicker">🏆 Case closed</p>
      <h3>Official results of the Great Sudoku Night 🏆</h3>
      <p class="sdk-line">Winner: Yousef.</p>
      <p class="sdk-line">Shahd filed an appeal. <strong>Appeal rejected.</strong></p>
      <p class="sdk-quote">You said you had fun that night. Same here.</p>
    </div>`;

  const boardEl = stageEl.querySelector('.sdk-board');
  const resultEl = stageEl.querySelector('.sdk-result');
  const statusEl = stageEl.querySelector('.sdk-status');
  const hintBtn = stageEl.querySelector('.sdk-hint');
  const pad = stageEl.querySelector('.sdk-pad');

  let grid = PUZZLE.map(r => [...r]);
  let sel = null;
  let done = false;
  const cells = {};

  for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
    const given = PUZZLE[r][c];
    const el = document.createElement(given ? 'div' : 'button');
    el.className = 'sdk-cell' + (given ? ' is-given' : '');
    el.dataset.r = r; el.dataset.c = c;
    if (given) { el.textContent = given; el.setAttribute('role', 'gridcell'); }
    else { el.type = 'button'; el.setAttribute('aria-label', `Row ${r + 1}, column ${c + 1}, empty`); }
    if (r === 1) el.classList.add('r-mid');
    if (c === 1) el.classList.add('c-mid');
    boardEl.append(el);
    cells[`${r},${c}`] = el;
  }

  function paint(popKey) {
    const bad = conflicts(grid);
    for (const [key, el] of Object.entries(cells)) {
      const [r, c] = key.split(',').map(Number);
      const v = grid[r][c];
      if (!PUZZLE[r][c]) {
        el.textContent = v || '';
        el.setAttribute('aria-label', `Row ${r + 1}, column ${c + 1}, ${v || 'empty'}`);
        el.classList.toggle('is-filled', !!v);
      }
      el.classList.toggle('is-selected', sel === key);
      const wasBad = el.classList.contains('is-bad');
      const isBad = bad.has(key);
      el.classList.toggle('is-bad', isBad);
      if (isBad && !wasBad && !reduced()) {
        gsap.fromTo(el, { x: -4 }, { x: 0, duration: .5, ease: 'elastic.out(1, .25)', clearProps: 'x' });
      }
    }
    if (popKey && !reduced() && cells[popKey].textContent) {
      gsap.fromTo(cells[popKey], { scale: .55 }, { scale: 1, duration: .5, ease: 'back.out(2.6)', clearProps: 'scale' });
    }
    const left = grid.flat().filter(v => !v).length;
    statusEl.textContent = done ? 'Solved!' : bad.size ? 'Some squares clash. Fix the coral ones.' : left ? `${left} squares to go.` : '';
  }

  function select(key) {
    if (done) return;
    sel = key;
    paint();
  }

  function put(r, c, v) {
    if (done) return;
    grid = place(grid, PUZZLE, r, c, v);
    haptic(10);
    paint(`${r},${c}`);
    if (isSolved(grid)) win();
  }

  function win() {
    done = true;
    sel = null;
    paint();
    boardEl.classList.add('is-solved');
    pad.classList.add('is-off');
    hintBtn.disabled = true;
    pad.querySelectorAll('button').forEach(b => { b.disabled = true; });
    Object.values(cells).forEach(el => { if (el.tagName === 'BUTTON') el.disabled = true; });
    if (!reduced()) {
      // ripple wave across the grid, from the top-left
      const els = Object.entries(cells).map(([k, el]) => [k.split(',').map(Number), el]);
      els.forEach(([[r, c], el]) => {
        gsap.fromTo(el, { scale: 1 }, { scale: 1.16, duration: .22, yoyo: true, repeat: 1, delay: (r + c) * .1, ease: 'sine.inOut', clearProps: 'scale' });
      });
    }
    const rect = boardEl.getBoundingClientRect();
    setTimeout(() => {
      burst(rect.left + rect.width / 2, rect.top + rect.height / 2, ['⭐', '🌙', '✨'], 12);
      resultEl.hidden = false;
      if (!reduced()) {
        gsap.fromTo(resultEl, { y: 70, opacity: 0, scale: .96 }, { y: 0, opacity: 1, scale: 1, duration: .8, ease: 'back.out(1.5)', clearProps: 'transform' });
        resultEl.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }
      celebrate('big', ['🏆', '🌙', '⭐']);
      ctx.award('sudoku');
    }, reduced() ? 0 : 750);
  }

  boardEl.addEventListener('click', e => {
    const b = e.target.closest('button.sdk-cell');
    if (b) select(`${b.dataset.r},${b.dataset.c}`);
  });
  pad.addEventListener('click', e => {
    const b = e.target.closest('.sdk-num');
    if (!b) return;
    if (!sel) { toast('Pick an empty square first 🌙', 1800); return; }
    const [r, c] = sel.split(',').map(Number);
    put(r, c, Number(b.dataset.n));
  });
  hintBtn.addEventListener('click', () => {
    const h = hint(grid, SOLUTION);
    if (!h) return;
    sel = `${h.r},${h.c}`;
    // a wrong value in the way is replaced, never toggled off
    if (grid[h.r][h.c] && grid[h.r][h.c] !== h.value) grid[h.r][h.c] = 0;
    put(h.r, h.c, h.value);
  });

  // Keyboard: digits fill the selected cell.
  stageEl.addEventListener('keydown', e => {
    if (!sel || !/^[1-4]$/.test(e.key)) return;
    const [r, c] = sel.split(',').map(Number);
    put(r, c, Number(e.key));
  });

  paint();
}

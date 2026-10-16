// Pure 4x4 sudoku logic. No DOM, no npm.

export const PUZZLE = [[1, 0, 0, 4], [0, 4, 0, 0], [0, 0, 4, 0], [0, 3, 2, 0]];
export const SOLUTION = [[1, 2, 3, 4], [3, 4, 1, 2], [2, 1, 4, 3], [4, 3, 2, 1]];

const units = () => {
  const list = [];
  for (let i = 0; i < 4; i++) {
    list.push([0, 1, 2, 3].map(j => [i, j]));
    list.push([0, 1, 2, 3].map(j => [j, i]));
  }
  for (const br of [0, 2]) for (const bc of [0, 2]) {
    list.push([[br, bc], [br, bc + 1], [br + 1, bc], [br + 1, bc + 1]]);
  }
  return list;
};
const UNITS = units();

/** Cells ("r,c") that share a row, column or box with an equal non-zero value. */
export function conflicts(grid) {
  const bad = new Set();
  for (const unit of UNITS) {
    const seen = new Map();
    for (const [r, c] of unit) {
      const v = grid[r][c];
      if (!v) continue;
      if (seen.has(v)) { bad.add(`${r},${c}`); bad.add(seen.get(v)); } else seen.set(v, `${r},${c}`);
    }
  }
  return bad;
}

export function isSolved(grid) {
  return grid.every(row => row.every(v => v >= 1 && v <= 4)) && conflicts(grid).size === 0;
}

/** Returns a new grid. Givens never change; the same value again clears the cell. */
export function place(grid, puzzle, r, c, value) {
  const next = grid.map(row => [...row]);
  if (puzzle[r][c]) return next;
  next[r][c] = next[r][c] === value ? 0 : value;
  return next;
}

/** First empty or wrong cell in row-major order. */
export function hint(grid, solution) {
  for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
    if (grid[r][c] !== solution[r][c]) return { r, c, value: solution[r][c] };
  }
  return null;
}

/** Backtracking solution counter, stops at `limit`. */
export function countSolutions(grid, limit = 2) {
  const g = grid.map(row => [...row]);
  let count = 0;
  const walk = () => {
    if (count >= limit) return;
    let pr = -1, pc = -1;
    outer: for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) if (!g[r][c]) { pr = r; pc = c; break outer; }
    if (pr < 0) { if (conflicts(g).size === 0) count++; return; }
    for (let v = 1; v <= 4; v++) {
      g[pr][pc] = v;
      const bad = conflicts(g);
      if (!bad.has(`${pr},${pc}`)) walk();
      if (count >= limit) break;
    }
    g[pr][pc] = 0;
  };
  walk();
  return count;
}

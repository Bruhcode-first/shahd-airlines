import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PUZZLE, SOLUTION, conflicts, isSolved, place, hint, countSolutions } from '../js/games/sudoku-logic.js';
const empty = () => [[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]];

test('shipped puzzle has six givens and exactly one solution', () => {
  assert.equal(PUZZLE.flat().filter(Boolean).length, 6);
  assert.equal(countSolutions(PUZZLE), 1);
});
test('SOLUTION agrees with every given and is solved', () => {
  PUZZLE.forEach((row, r) => row.forEach((v, c) => { if (v) assert.equal(SOLUTION[r][c], v); }));
  assert.equal(isSolved(SOLUTION), true);
});
test('conflicts flags row, column and box duplicates', () => {
  const row = empty(); row[0][0] = 1; row[0][1] = 1;
  assert.deepEqual([...conflicts(row)].sort(), ['0,0', '0,1']);
  const col = empty(); col[0][0] = 2; col[2][0] = 2;
  assert.deepEqual([...conflicts(col)].sort(), ['0,0', '2,0']);
  const box = empty(); box[0][0] = 3; box[1][1] = 3;
  assert.deepEqual([...conflicts(box)].sort(), ['0,0', '1,1']);
  assert.equal(conflicts(SOLUTION).size, 0);
});
test('isSolved is false for incomplete or conflicting grids', () => {
  assert.equal(isSolved(PUZZLE), false);
  const bad = SOLUTION.map(r => [...r]); [bad[0][0], bad[0][1]] = [bad[0][1], bad[0][0]];
  assert.equal(isSolved(bad), false);
});
test('place never changes a given, toggles the same number off, and never mutates', () => {
  assert.equal(place(PUZZLE, PUZZLE, 0, 0, 3)[0][0], 1);
  const g = place(PUZZLE, PUZZLE, 0, 1, 2);
  assert.equal(g[0][1], 2);
  assert.equal(PUZZLE[0][1], 0);
  assert.equal(place(g, PUZZLE, 0, 1, 2)[0][1], 0);
  assert.equal(place(g, PUZZLE, 0, 1, 3)[0][1], 3);
});
test('hint returns the first empty or wrong cell with its solution value', () => {
  assert.deepEqual(hint(PUZZLE, SOLUTION), { r: 0, c: 1, value: 2 });
  assert.deepEqual(hint(place(PUZZLE, PUZZLE, 0, 1, 3), SOLUTION), { r: 0, c: 1, value: 2 });
  assert.equal(hint(SOLUTION, SOLUTION), null);
});

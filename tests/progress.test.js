import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createProgress } from '../js/games/progress.js';

test('wins at goal hits; misses do not reset hits', () => {
  const p = createProgress({ goal: 5, skipAfter: 3 });
  p.hit(); p.hit(); p.miss(); p.hit(); p.hit();
  assert.equal(p.won, false);
  p.hit();
  assert.equal(p.won, true);
  assert.equal(p.hits, 5);
});
test('skip is offered after skipAfter misses, never after a win', () => {
  const p = createProgress({ goal: 5, skipAfter: 3 });
  p.miss(); p.miss();
  assert.equal(p.canSkip, false);
  p.miss();
  assert.equal(p.canSkip, true);
  for (let i = 0; i < 5; i++) p.hit();
  assert.equal(p.canSkip, false);
});
test('hits after winning are ignored and reset starts over', () => {
  const p = createProgress({ goal: 2, skipAfter: 3 });
  p.hit(); p.hit(); p.hit();
  assert.equal(p.hits, 2);
  p.reset();
  assert.deepEqual([p.hits, p.misses, p.won, p.canSkip], [0, 0, false, false]);
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createStampStore, STOP_IDS } from '../js/stamps.js';

function memStorage(initial = {}) {
  const data = { ...initial };
  return { data, getItem: k => (k in data ? data[k] : null), setItem: (k, v) => { data[k] = String(v); } };
}

test('STOP_IDS lists the five stops in order', () => {
  assert.deepEqual(STOP_IDS, ['pingpong', 'sudoku', 'doodle', 'sweets', 'badminton']);
});
test('award is idempotent and persists as a JSON array', () => {
  const s = memStorage();
  const store = createStampStore(s, 'sh024-stamps');
  assert.equal(store.award('sudoku'), true);
  assert.equal(store.award('sudoku'), false);
  assert.equal(store.count(), 1);
  assert.deepEqual(JSON.parse(s.data['sh024-stamps']), ['sudoku']);
});
test('restores saved stamps', () => {
  const store = createStampStore(memStorage({ 'sh024-stamps': '["pingpong","doodle"]' }), 'sh024-stamps');
  assert.equal(store.has('doodle'), true);
  assert.equal(store.count(), 2);
});
test('corrupt or non-array saved values start empty', () => {
  for (const junk of ['{oops', '5', '{"a":1}', 'null', '[1,2]']) {
    const store = createStampStore(memStorage({ k: junk }), 'k');
    assert.equal(store.count(), 0);
    assert.equal(store.award('sweets'), true);
  }
});
test('works in memory when storage throws or is null', () => {
  const throwing = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } };
  for (const storage of [throwing, null]) {
    const store = createStampStore(storage, 'k');
    assert.equal(store.award('sweets'), true);
    assert.equal(store.has('sweets'), true);
    assert.deepEqual(store.list(), ['sweets']);
  }
});
test('onChange fires only for new stamps and can unsubscribe', () => {
  const store = createStampStore(memStorage(), 'k');
  const seen = [];
  const off = store.onChange(ids => seen.push(ids.length));
  store.award('a');
  store.award('a');
  off();
  store.award('b');
  assert.deepEqual(seen, [1]);
});

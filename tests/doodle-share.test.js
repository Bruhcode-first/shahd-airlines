import { test } from 'node:test';
import assert from 'node:assert/strict';
import { shareMethod } from '../js/games/doodle-share.js';
const file = new File(['x'], 'shahd-doodle.png', { type: 'image/png' });
const share = async () => {};

test('share when the browser can share files', () => {
  assert.equal(shareMethod({ share, canShare: d => Array.isArray(d.files) }, file), 'share');
});
test('download when sharing files is unsupported', () => {
  assert.equal(shareMethod(undefined, file), 'download');
  assert.equal(shareMethod({ share }, file), 'download');
  assert.equal(shareMethod({ share, canShare: () => false }, file), 'download');
  assert.equal(shareMethod({ share, canShare: () => { throw new Error('nope'); } }, file), 'download');
  assert.equal(shareMethod({ canShare: () => true }, file), 'download');
});

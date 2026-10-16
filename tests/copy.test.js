import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MET_DATE, daysSince, daysAgoPhrase } from '../js/copy.js';

test('daysAgoPhrase wording', () => {
  assert.equal(daysAgoPhrase(-1), 'A day ago');
  assert.equal(daysAgoPhrase(0), 'A day ago');
  assert.equal(daysAgoPhrase(1), 'A day ago');
  assert.equal(daysAgoPhrase(2), 'Two days ago');
  assert.equal(daysAgoPhrase(7), 'Seven days ago');
  assert.equal(daysAgoPhrase(10), 'Ten days ago');
  assert.equal(daysAgoPhrase(11), 'A few weeks ago');
});
test('daysSince counts local calendar days from the day they met', () => {
  assert.equal(daysSince(MET_DATE, new Date(2026, 9, 15, 0, 5)), 2);
  assert.equal(daysSince(MET_DATE, new Date(2026, 9, 15, 23, 59)), 2);
  assert.equal(daysSince(MET_DATE, new Date(2026, 10, 1, 9, 0)), 19);
  assert.equal(daysSince(MET_DATE, new Date(2026, 9, 12, 12, 0)), -1);
});

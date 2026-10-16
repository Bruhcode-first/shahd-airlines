import { test, expect } from '@playwright/test';
import { freshPage, board, badge, scrollTo } from './helpers.js';
import { PUZZLE, SOLUTION } from '../js/games/sudoku-logic.js';

async function solve(page) {
  for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
    if (PUZZLE[r][c]) continue;
    const cell = page.locator(`#sudoku button.sdk-cell[data-r="${r}"][data-c="${c}"]`);
    if ((await cell.textContent()) === String(SOLUTION[r][c])) continue;
    await cell.click();
    await page.locator(`#sudoku .sdk-num[data-n="${SOLUTION[r][c]}"]`).click();
  }
}

test('solve with no console errors', async ({ page }) => {
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(String(e)));
  await freshPage(page); await board(page); await scrollTo(page, '#sudoku');
  await page.screenshot({ path: 'test-results/sudoku/start.png' });
  await solve(page);
  await expect(page.getByText('Appeal rejected.')).toBeVisible();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'test-results/sudoku/won.png' });
  expect(errors).toEqual([]);
});

test('solve awards the stamp, fixed cells hold, replay stays 1/5', async ({ page }) => {
  await freshPage(page); await board(page); await scrollTo(page, '#sudoku');
  await expect(page.locator('#sudoku .sdk-result')).toBeHidden();

  // givens never change
  const given = page.locator('#sudoku .sdk-cell.is-given').first();
  await expect(given).toHaveText('1');
  await given.click({ force: true });
  await page.locator('#sudoku .sdk-num[data-n="3"]').click();
  await expect(given).toHaveText('1');

  // the same number twice clears
  const cell = page.locator('#sudoku button.sdk-cell[data-r="0"][data-c="1"]');
  await cell.click();
  await page.locator('#sudoku .sdk-num[data-n="3"]').click();
  await expect(cell).toHaveText('3');
  await page.locator('#sudoku .sdk-num[data-n="3"]').click();
  await expect(cell).toHaveText('');

  // a clashing number glows coral, and the hint fixes it
  await page.locator('#sudoku .sdk-num[data-n="1"]').click();
  await expect(cell).toHaveClass(/is-bad/);
  await page.screenshot({ path: 'test-results/sudoku/conflict.png' });
  await page.locator('#sudoku .sdk-hint').click();
  await expect(cell).toHaveText('2');
  await expect(cell).not.toHaveClass(/is-bad/);

  await solve(page);
  await expect(page.getByText('Appeal rejected.')).toBeVisible();
  await expect.poll(() => badge(page)).toContain('1/5');

  await page.reload(); await board(page); await scrollTo(page, '#sudoku');
  await solve(page);
  await page.waitForTimeout(2500); await page.screenshot({ path: 'test-results/sudoku/replay.png' });
  await expect(page.getByText('Appeal rejected.')).toBeVisible();
  await expect.poll(() => badge(page)).toContain('1/5');
});

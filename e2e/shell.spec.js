import { test, expect } from '@playwright/test';
import { freshPage, board, badge } from './helpers.js';

test('boarding: locked, Shood bubble, tear, welcome', async ({ page }) => {
  await freshPage(page);
  await expect(page.locator('body')).toHaveClass(/locked/);
  await page.locator('.shood').click();
  await expect(page.getByText("Noted. Won't happen again 😤")).toBeVisible();
  await board(page);
  await expect(page.locator('body')).not.toHaveClass(/locked/);
  expect(await badge(page)).toContain('0/5');
});

test('saved stamps restore after reload and show in the passport sheet', async ({ page }) => {
  await freshPage(page);
  await page.evaluate(() => localStorage.setItem('sh024-stamps', '["sudoku"]'));
  await page.reload();
  await board(page);
  expect(await badge(page)).toContain('1/5');
  await page.locator('#passport-badge').click();
  await expect(page.locator('#passport-sheet svg')).toHaveCount(1);
});

test('corrupt storage does not crash the page', async ({ page }) => {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await freshPage(page);
  await page.evaluate(() => localStorage.setItem('sh024-stamps', '{oops'));
  await page.reload();
  await board(page);
  expect(await badge(page)).toContain('0/5');
  expect(errors).toEqual([]);
});

test('no horizontal scroll and only the easter egg in the console', async ({ page }) => {
  const logs = [];
  page.on('console', m => logs.push(m.type() + ':' + m.text()));
  await freshPage(page);
  await board(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(logs.filter(l => l.startsWith('error:'))).toEqual([]);
  expect(logs.some(l => l.includes("you're a better developer than you think"))).toBe(true);
});

test('the whole flight: no horizontal scroll and no console errors from top to bottom', async ({ page }) => {
  test.setTimeout(90_000);
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(String(e)));
  await freshPage(page);
  await board(page);
  const vh = await page.evaluate(() => innerHeight);
  for (let y = 0; ; y += Math.round(vh * 0.6)) {
    await page.evaluate(top => window.scrollTo({ top, behavior: 'instant' }), y);
    await page.waitForTimeout(350);
    const { sw, iw, max } = await page.evaluate(() => ({
      sw: document.documentElement.scrollWidth,
      iw: innerWidth,
      max: document.documentElement.scrollHeight - innerHeight,
    }));
    expect(sw, `horizontal overflow at scrollY=${y}`).toBeLessThanOrEqual(iw);
    if (y >= max) break;
  }
  await expect(page.locator('#signoff')).toContainText('Yousef');
  expect(errors).toEqual([]);
});

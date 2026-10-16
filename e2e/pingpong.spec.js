import { test, expect } from '@playwright/test';
import { freshPage, board, badge, scrollTo } from './helpers.js';

const hits = (page, n) => page.evaluate(count => {
  for (let i = 0; i < count; i++) window.__sh024.games.pingpong.hit();
}, n);
const misses = (page, n) => page.evaluate(count => {
  for (let i = 0; i < count; i++) window.__sh024.games.pingpong.miss();
}, n);

async function setup(page) {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await freshPage(page);
  await board(page);
  await scrollTo(page, '#pingpong');
  return errors;
}

test('win: five returns award the stamp and show the win card', async ({ page }) => {
  const errors = await setup(page);
  await hits(page, 5);
  await expect(page.getByText('Loser buys the chocolate')).toBeVisible();
  expect(await badge(page)).toContain('1/5');
  expect(errors).toEqual([]);
});

test('skip: three misses reveal Skip, which still stamps once', async ({ page }) => {
  const errors = await setup(page);
  await expect(page.locator('#pingpong .pp-skip')).toBeHidden();
  await misses(page, 3);
  const skip = page.locator('#pingpong').getByRole('button', { name: "Skip, I'll stamp it anyway 😅" });
  await expect(skip).toBeVisible();
  await skip.click();
  await expect(page.getByText('Loser buys the chocolate')).toBeVisible();
  expect(await badge(page)).toContain('1/5');
  expect(errors).toEqual([]);
});

test('replay: Play again resets, and winning twice never goes past 1/5', async ({ page }) => {
  const errors = await setup(page);
  await hits(page, 5);
  await expect(page.getByText('Loser buys the chocolate')).toBeVisible();
  await page.getByRole('button', { name: 'Play again' }).click();
  await expect(page.getByText('Loser buys the chocolate')).toBeHidden();
  await expect(page.locator('#pingpong .pp-count')).toHaveText('Returns: 0/5');
  await hits(page, 5);
  await expect(page.getByText('Loser buys the chocolate')).toBeVisible();
  expect(await badge(page)).toContain('1/5');
  expect(errors).toEqual([]);
});

test('dragging across the canvas moves the paddle and never scrolls the page', async ({ page }) => {
  await setup(page);
  const canvas = page.locator('#pingpong canvas');
  const box = await canvas.boundingBox();
  const y = box.y + box.height * .8;
  const scrollY = await page.evaluate(() => scrollY);
  const startX = await page.evaluate(() => window.__sh024.games.pingpong.paddleX());

  await page.mouse.move(box.x + box.width * .2, y);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * .5, y + 30, { steps: 8 });
  await page.mouse.move(box.x + box.width * .85, y + 60, { steps: 8 });
  await page.waitForTimeout(250);
  const midX = await page.evaluate(() => window.__sh024.games.pingpong.paddleX());
  await page.mouse.up();

  expect(await page.evaluate(() => scrollY)).toBe(scrollY);
  expect(midX).toBeGreaterThan(startX + 60);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

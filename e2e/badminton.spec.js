import { test, expect } from '@playwright/test';
import { freshPage, board, badge, scrollTo } from './helpers.js';

const call = async (page, fn, n) => {
  await page.waitForFunction(() => window.__sh024?.games?.badminton);
  await page.evaluate(([f, count]) => { for (let i = 0; i < count; i++) window.__sh024.games.badminton[f](); }, [fn, n]);
};
const hit = (page, n = 1) => call(page, 'hit', n);
const miss = (page, n = 1) => call(page, 'miss', n);

async function start(page) {
  await freshPage(page);
  await board(page);
  await scrollTo(page, '#badminton');
}

test('win: 5 smashes awards the stamp', async ({ page }) => {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await start(page);
  await expect(page.locator('#badminton .bd-hud-text')).toHaveText('Smashes: 0/5');
  await hit(page, 5);
  await expect(page.getByText('No net can stop you')).toBeVisible();
  await expect(page.locator('#badminton .bd-hud-text')).toHaveText('Smashes: 5/5');
  expect(await badge(page)).toContain('1/5');
  expect(errors).toEqual([]);
});

test('skip: 4 misses reveal the skip button', async ({ page }) => {
  await start(page);
  const skip = page.getByRole('button', { name: /Skip, I'll stamp it anyway/ });
  await expect(skip).toBeHidden();
  await miss(page, 3);
  await expect(skip).toBeHidden();
  await miss(page, 1);
  await expect(skip).toBeVisible();
  await skip.click();
  await expect(page.getByText('No net can stop you')).toBeVisible();
  expect(await badge(page)).toContain('1/5');
});

test('replay: play again never goes above 1/5', async ({ page }) => {
  await start(page);
  await hit(page, 5);
  await expect(page.getByText('No net can stop you')).toBeVisible();
  await page.getByRole('button', { name: 'Play again' }).click();
  await expect(page.locator('#badminton .bd-hud-text')).toHaveText('Smashes: 0/5');
  await hit(page, 5);
  await expect(page.getByText('No net can stop you')).toBeVisible();
  expect(await badge(page)).toContain('1/5');
});

test('SMASH button: a tap right after the serve starts is a miss, not a smash', async ({ page }) => {
  await start(page);
  await expect(page.locator('#badminton .stage')).toHaveAttribute('data-state', 'serve');
  await page.getByRole('button', { name: /SMASH/ }).tap();
  await expect(page.locator('#badminton .bd-hud-text')).toHaveText('Smashes: 0/5');
  expect(await badge(page)).toContain('0/5');
});

test('a real tap while the shuttle is in the zone scores a smash', async ({ page }) => {
  await start(page);
  const hud = page.locator('#badminton .bd-hud-text');
  // a real tap has some latency, so retry a few serves
  for (let attempt = 0; attempt < 5; attempt++) {
    await page.waitForFunction(() => window.__sh024.games.badminton.probe().inZone, null, { polling: 'raf' });
    await page.locator('#badminton canvas').tap();
    await page.waitForTimeout(200);
    if ((await hud.textContent()) === 'Smashes: 1/5') break;
  }
  await expect(hud).toHaveText('Smashes: 1/5');
  await expect(page.locator('#badminton .bd-pop')).toBeVisible();
});

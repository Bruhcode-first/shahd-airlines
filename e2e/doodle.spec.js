import { test, expect } from '@playwright/test';
import { freshPage, board, badge, scrollTo } from './helpers.js';


async function setup(page) {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await freshPage(page);
  await board(page);
  await scrollTo(page, '#doodle .dd-book');
  return errors;
}

test('guess: wrong answer still awards the stamp', async ({ page }) => {
  const errors = await setup(page);
  await expect(page.locator('#doodle .dd-art[data-drawn]')).toHaveCount(1, { timeout: 25000 });
  await page.getByRole('button', { name: 'A lamp' }).click();
  await expect(page.getByText("Honestly… fair. It's a shuttlecock 😭")).toBeVisible();
  await expect(page.getByText('Now you see why you won the drawing round.')).toBeVisible();
  await expect.poll(() => badge(page)).toContain('1/5');
  await expect(page.locator('.dd-answer').first()).toBeDisabled();
  expect(errors).toEqual([]);
});

test('guess: right answer gets the proud line, one stamp', async ({ page }) => {
  await setup(page);
  await expect(page.locator('#doodle .dd-art[data-drawn]')).toHaveCount(1, { timeout: 25000 });
  await page.getByRole('button', { name: 'A shuttlecock' }).click();
  await expect(page.getByText("You actually got it?! That's more talent than my drawing deserves.")).toBeVisible();
  await expect.poll(() => badge(page)).toContain('1/5');
});

test('draw a stroke, then undo', async ({ page }) => {
  const errors = await setup(page);
  await scrollTo(page, '#doodle .dd-paper');
  const canvas = page.locator('#doodle canvas');
  const box = await canvas.boundingBox();
  const blankLen = await canvas.evaluate(c => c.toDataURL().length);
  await page.mouse.move(box.x + 60, box.y + 80);
  await page.mouse.down();
  for (let i = 1; i <= 12; i++) await page.mouse.move(box.x + 60 + i * 15, box.y + 80 + Math.sin(i) * 40);
  await page.mouse.up();
  await expect(page.getByText("Artist of the night: Shahd 🎨 (it wasn't close)")).toBeVisible();
  const len = await canvas.evaluate(c => c.toDataURL().length);
  expect(len).toBeGreaterThan(1000);
  expect(len).not.toBe(blankLen);
  await page.locator('.dd-undo').click();
  expect(await canvas.evaluate(c => c.toDataURL().length)).toBe(blankLen);
  expect(errors).toEqual([]);
});

test('send falls back to save + overlay when sharing files is unsupported', async ({ page }) => {
  await page.addInitScript(() => { delete Navigator.prototype.canShare; });
  await setup(page);
  await scrollTo(page, '#doodle .dd-paper');
  await page.locator('.dd-send').click();
  await expect(page.getByText('Saved! Send it to me on Discord 😄')).toBeVisible();
  await expect(page.getByText('If nothing downloaded, long-press the picture to save it.')).toBeVisible();
  await expect(page.locator('.dd-ov-img')).toBeVisible();
  await page.locator('.dd-ov-close').click();
  await expect(page.locator('.dd-overlay')).toHaveCount(0);
});

import { test, expect } from '@playwright/test';
import { freshPage, board, scrollTo } from './helpers.js';

const ALL_STAMPS = '["pingpong","sudoku","doodle","sweets","badminton"]';

/** Collects page errors and console errors (missing photos are allowed: they fall back to gradients). */
function watchErrors(page) {
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => {
    if (m.type() !== 'error') return;
    if (/Failed to load resource/i.test(m.text())) return;
    errors.push('console: ' + m.text());
  });
  return errors;
}

test('globe (or the flat route map) shows, and vertical wheel over it still scrolls', async ({ page }) => {
  const errors = watchErrors(page);
  await freshPage(page);
  await board(page);
  await scrollTo(page, '#landing');
  const globe = page.locator('#globe canvas, #globe .routemap-svg').first();
  await expect(globe).toBeVisible({ timeout: 20_000 });

  await scrollTo(page, '#globe');
  const box = await page.locator('#globe .globe-stage').boundingBox();
  await page.mouse.move(box.x + box.width / 2, Math.min(box.y + box.height / 2, 700));
  const before = await page.evaluate(() => scrollY);
  await page.mouse.wheel(0, 400);
  await expect.poll(() => page.evaluate(() => scrollY)).not.toBe(before);

  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});

test('tapping Egypt on the globe flips the Egypt postcard', async ({ page }) => {
  const errors = watchErrors(page);
  await freshPage(page);
  await board(page);
  await scrollTo(page, '#globe');
  await expect(page.locator('#globe canvas, #globe .routemap-svg').first()).toBeVisible({ timeout: 20_000 });
  if (await page.locator('#globe canvas').count()) {
    const label = page.locator('#globe .gl-label', { hasText: 'Egypt' });
    await expect(label).toBeVisible();
    await page.waitForTimeout(1200); // let the entrance settle
    const b = await label.boundingBox();
    await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2);
  } else {
    await page.locator('.rm-place', { hasText: 'Egypt' }).click();
  }
  await expect(page.locator('.postcard[data-id="egypt"]')).toHaveClass(/flipped/, { timeout: 5000 });
  await expect(page.locator('.postcard[data-id="egypt"]')).toBeInViewport();
  expect(errors).toEqual([]);
});

test('postcards flip, and the China gallery has three photos', async ({ page }) => {
  const errors = watchErrors(page);
  await freshPage(page);
  await board(page);
  await scrollTo(page, '#been');
  const egypt = page.locator('.postcard[data-id="egypt"]');
  await egypt.click();
  await expect(egypt).toHaveClass(/flipped/);
  await expect(egypt).toHaveAttribute('aria-pressed', 'true');
  await egypt.click();
  await expect(egypt).not.toHaveClass(/flipped/);

  const china = page.locator('.postcard[data-id="china"]');
  await expect(china.locator('.pc-slide')).toHaveCount(3);
  await china.locator('.pc-front .pc-flip').click();
  await expect(china).toHaveClass(/flipped/);
  await expect(china.getByText('The main character of your passport.')).toBeVisible();
  expect(errors).toEqual([]);
});

test('booking Italy stamps "BOOKED · one day" and survives a reload', async ({ page }) => {
  const errors = watchErrors(page);
  await freshPage(page);
  await board(page);
  await scrollTo(page, '#next');
  const italy = page.locator('.pass[data-id="italy"]');
  await page.locator('.nx-dot[data-i="1"]').click();
  await expect(italy).toHaveClass(/is-center/);
  await italy.locator('.pass-book').click();
  await expect(italy.getByText('BOOKED · one day')).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('sh024-booked'))).toContain('italy');

  await page.reload();
  await board(page);
  await scrollTo(page, '#next');
  await expect(page.locator('.pass[data-id="italy"]').getByText('BOOKED · one day')).toBeVisible();
  await expect(page.locator('.pass[data-id="italy"] .pass-book')).toBeHidden();
  await expect(page.locator('.pass[data-id="mexico"] .pass-book')).toHaveCount(1);
  expect(errors).toEqual([]);
});

test('passport spread: empty slots, then complete at 5/5', async ({ page }) => {
  const errors = watchErrors(page);
  await freshPage(page);
  await board(page);
  await scrollTo(page, '#passport-spread');
  await expect(page.locator('#passport-spread .pp-empty')).toHaveCount(5);
  await expect(page.getByText('Passport complete!')).toBeHidden();

  await page.evaluate(s => localStorage.setItem('sh024-stamps', s), ALL_STAMPS);
  await page.reload();
  await board(page);
  await scrollTo(page, '#passport-spread');
  await expect(page.getByText('Passport complete!')).toBeVisible();
  await expect(page.locator('#passport-spread svg.stamp')).toHaveCount(5);
  await expect(page.locator('#passport-spread .pp-count')).toHaveText('5/5');
  expect(errors).toEqual([]);
});

test('a stamp earned live appears in the passport spread', async ({ page }) => {
  await freshPage(page);
  await board(page);
  await scrollTo(page, '#passport-spread');
  await page.evaluate(() => window.__sh024.stamps.award('sudoku'));
  await expect(page.locator('#passport-spread svg.stamp[data-stamp="sudoku"]')).toHaveCount(1);
  await expect(page.locator('#passport-spread .pp-count')).toHaveText('1/5');
});

test('sign-off counts the days since they met', async ({ page }) => {
  const errors = watchErrors(page);
  // install (not setFixedTime): GSAP reads Date.now, so a frozen clock would freeze boarding
  await page.clock.install({ time: new Date(2026, 9, 15, 12) });
  await freshPage(page);
  await board(page);
  await scrollTo(page, '#signoff');
  const note = page.locator('#signoff');
  await expect(note).toContainText("Two days ago I didn't know you.");
  await expect(note).toContainText('Crew note: best passenger we\'ve ever had. Not even close.');
  await expect(note.locator('[lang="ar"][dir="rtl"]')).toHaveText('يلا قوليلي، اتبسطتي؟ 😄');
  expect(errors).toEqual([]);
});

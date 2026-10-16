import { test, expect } from '@playwright/test';
import { freshPage, board, badge, scrollTo } from './helpers.js';

test('sweet shop: tracker, gift box, physics, receipt and honey line', async ({ page }) => {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });

  await freshPage(page);
  await board(page);
  await scrollTo(page, '#sweets');

  // the tracker runs by itself once the section is in view
  await expect(page.getByText('Delivered to: the sweetest address in Muscat')).toBeVisible({ timeout: 10_000 });
  await expect(page.locator('#sweets .sw-step.on')).toHaveCount(4);

  const box = page.getByRole('button', { name: /Tap to open/ });
  await expect(box).toBeVisible();
  expect(await badge(page)).toContain('0/5');
  await box.click();

  await expect(page.getByText('literally means honey')).toBeVisible({ timeout: 10_000 });
  expect(await badge(page)).toContain('1/5');
  await expect(page.locator('#sweets .sw-pile canvas')).toHaveCount(1);
  await expect(page.locator('#sweets .rc-total')).toContainText('Total: 0 OMR, paid in smiles');
  await expect(page.locator('#sweets .sw-rule')).toContainText('Candy rule: you can never stop at one.');

  // about thirty pieces spill out and settle inside the stage
  await expect.poll(
    () => page.locator('#sweets .sw-pile canvas').evaluate(c => c.__candy?.bodies.length ?? 0),
    { timeout: 5000 },
  ).toBe(30);
  const inside = await page.locator('#sweets .sw-pile canvas').evaluate(c => {
    const w = c.parentElement.clientWidth;
    const h = c.parentElement.clientHeight;
    return c.__candy.bodies.every(b => b.position.x > 0 && b.position.x < w && b.position.y < h);
  });
  expect(inside).toBe(true);

  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});

test('sweet shop: Track order starts the tracker; replaying keeps one stamp', async ({ page }) => {
  await freshPage(page);
  await board(page);
  // the Track order button is the fallback: it starts the tracker even before the section is in view
  await expect(page.getByRole('button', { name: 'Track order' })).toHaveCount(1);
  await page.locator('.sw-trackbtn').evaluate(b => b.click());
  await scrollTo(page, '#sweets');
  await expect(page.getByText('Delivered to: the sweetest address in Muscat')).toBeVisible({ timeout: 10_000 });
  await page.getByRole('button', { name: /Tap to open/ }).click();
  await expect(page.getByText('literally means honey')).toBeVisible({ timeout: 10_000 });
  expect(await badge(page)).toContain('1/5');

  // reload without clearing storage, play it again
  await page.reload();
  await board(page);
  expect(await badge(page)).toContain('1/5');
  await scrollTo(page, '#sweets');
  await expect(page.getByText('Delivered to: the sweetest address in Muscat')).toBeVisible({ timeout: 10_000 });
  await page.getByRole('button', { name: /Tap to open/ }).click();
  await expect(page.getByText('literally means honey')).toBeVisible({ timeout: 10_000 });
  expect(await badge(page)).toContain('1/5');
  expect(await page.evaluate(() => window.__sh024.stamps.list())).toEqual(['sweets']);
});

test('sweet shop: a flick moves a candy, a touch on empty space is left to the page scroll', async ({ page }) => {
  await freshPage(page);
  await board(page);
  await scrollTo(page, '#sweets');
  await expect(page.getByText('Delivered to: the sweetest address in Muscat')).toBeVisible({ timeout: 10_000 });
  await page.getByRole('button', { name: /Tap to open/ }).click();
  const canvas = page.locator('#sweets .sw-pile canvas');
  await expect.poll(() => canvas.evaluate(c => c.__candy?.bodies.length ?? 0), { timeout: 5000 }).toBe(30);
  await page.waitForTimeout(2500); // let the pile settle

  // fire real TouchEvents and report whether the canvas let the browser handle them
  const touch = (type, x, y) => canvas.evaluate((c, a) => {
    const t = new Touch({ identifier: 7, target: c, clientX: a.x, clientY: a.y, pageX: a.x + scrollX, pageY: a.y + scrollY });
    const ev = new TouchEvent(a.type, { touches: a.type === 'touchend' ? [] : [t], changedTouches: [t], bubbles: true, cancelable: true });
    c.dispatchEvent(ev);
    return ev.defaultPrevented;
  }, { type, x, y });

  // 1. the top-most free spot in the stage holds no candy: the page keeps the gesture
  const empty = await canvas.evaluate(c => {
    const r = c.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + 24 };
  });
  expect(await touch('touchstart', empty.x, empty.y)).toBe(false);
  await touch('touchend', empty.x, empty.y);

  // 2. a touch on a candy takes the gesture over and flicks it upward
  const low = await canvas.evaluate(c => {
    const r = c.getBoundingClientRect();
    const b = c.__candy.bodies.reduce((a, o) => (o.position.y > a.position.y ? o : a));
    return { x: r.left + b.position.x, y: r.top + b.position.y, id: b.id, y0: b.position.y };
  });
  expect(await touch('touchstart', low.x, low.y)).toBe(true);
  await page.waitForTimeout(60); // let a physics frame grab the piece, as a real finger would
  for (let k = 1; k <= 6; k++) {
    await touch('touchmove', low.x + k * 3, low.y - k * 22);
    await page.waitForTimeout(30);
  }
  await touch('touchend', low.x + 18, low.y - 132);
  await page.waitForTimeout(150);
  const risen = await canvas.evaluate((c, id) => c.__candy.bodies.find(o => o.id === id).position.y, low.id);
  expect(risen).toBeLessThan(low.y0 - 40);
});

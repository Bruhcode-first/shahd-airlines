// Shared Playwright helpers.
import { expect } from '@playwright/test';

/** Opens the site with empty storage. */
export async function freshPage(page) {
  await page.goto('/');
  await page.evaluate(() => { try { localStorage.clear(); } catch { /* blocked */ } });
  await page.reload();
}

/** Taps the stub and waits until the welcome section is on screen. */
export async function board(page) {
  await page.locator('.stub').click();
  await expect(page.locator('#boarding')).toHaveCount(0, { timeout: 5000 });
  await expect(page.locator('#welcome')).toBeInViewport();
}

/** The passport badge text, e.g. "🛂 1/5". */
export async function badge(page) {
  return ((await page.locator('#passport-badge').textContent()) ?? '').replace(/\s+/g, ' ').trim();
}

/** Scrolls a section to the top of the viewport (instantly). */
export async function scrollTo(page, selector) {
  await page.locator(selector).first().evaluate(el => el.scrollIntoView({ block: 'start', behavior: 'instant' }));
  await page.waitForTimeout(150);
}

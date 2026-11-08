import { apiFixture } from '../src/test/api-fixtures';
import { test as base, expect } from '@playwright/test';
import type { Page, TestInfo } from '@playwright/test';

export const test = base.extend<{ staticGuard: void }>({
  staticGuard: [async ({ page }, use) => {
    const errors: string[] = [];
    if (!process.env.E2E_LIVE_API) await page.route('**/api/**', async route => {
      const body = apiFixture(route.request().url());
      await route.fulfill({ status: body ? 200 : 404, json: body });
    });
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
    await use();
    expect(errors, 'Browser console must remain free of errors').toEqual([]);
  }, { auto: true }],
});
export { expect };

export async function checkLayout(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  const main = page.getByRole('main');
  await expect(main).toBeVisible();
  const box = await main.boundingBox();
  expect(box?.width).toBeGreaterThan(250);
  const header = page.getByRole('banner');
  if (await header.count()) {
    const headerBox = await header.boundingBox();
    expect(box!.y).toBeGreaterThanOrEqual(headerBox!.y + headerBox!.height - 1);
  }
  const sidebar = page.locator('.sidebar');
  if (await sidebar.count()) {
    const navBox = await sidebar.boundingBox();
    if ((page.viewportSize()?.width ?? 0) > 800) {
      expect(box!.x).toBeGreaterThanOrEqual(navBox!.x + navBox!.width - 1);
    } else {
      expect(box!.y).toBeGreaterThanOrEqual(navBox!.y + navBox!.height - 1);
    }
  }
}
export async function capture(page: Page, info: TestInfo, name: string) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    window.scrollTo(0, 0);
    await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
  });
  const path = info.outputPath(name + '.png');
  await page.screenshot({ path, fullPage: true, animations: 'disabled' });
  await info.attach(name, { path, contentType: 'image/png' });
}

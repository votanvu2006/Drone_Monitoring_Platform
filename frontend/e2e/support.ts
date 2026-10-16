import { test as base, expect } from '@playwright/test';
import type { Page, TestInfo } from '@playwright/test';

export const test = base.extend<{ staticGuard: void }>({
  staticGuard: [async ({ page }, use) => {
    const errors: string[] = [];
    const dataRequests: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
    page.on('request', (request) => {
      if (['fetch', 'xhr'].includes(request.resourceType())) dataRequests.push(request.url());
    });
    await use();
    expect(errors, 'Browser console must remain free of errors').toEqual([]);
    expect(dataRequests, 'Static examples must not make API requests').toEqual([]);
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
  const path = info.outputPath(name + '.png');
  await page.screenshot({ path, fullPage: true, animations: 'disabled' });
  await info.attach(name, { path, contentType: 'image/png' });
}

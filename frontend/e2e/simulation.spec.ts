import { test, expect, checkLayout, capture } from './support';

test('scenarios are static examples inside Live Flight', async ({ page }, info) => {
  await page.goto('/?screen=live-flight-scenarios');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Live Flight');
  const panel = page.getByRole('region', { name: 'Flight scenarios' });
  await expect(panel.getByRole('article')).toHaveCount(4);
  for (const name of ['Successful flight', 'Component failure', 'Restricted-zone failure', 'Weather caution']) {
    await expect(panel.getByRole('article', { name })).toBeVisible();
  }
  const before = page.url();
  await panel.getByRole('article', { name: 'Component failure' }).click();
  expect(page.url()).toBe(before);
  await expect(page.getByRole('button')).toHaveCount(0);
  await expect(page.getByRole('radio')).toHaveCount(0);
  await expect(page.getByRole('navigation')).toHaveCount(0);
  await checkLayout(page);
  await capture(page, info, 'flight-scenarios');
});

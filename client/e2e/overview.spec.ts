import { test, expect, checkLayout, capture } from './support';

test('overview shows consistent summary data without card actions', async ({ page }, info) => {
  await page.goto('/?screen=overview');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Operations overview');
  for (const name of ['Fleet status', 'Mission status', 'Active flights', 'Open alerts']) {
    await expect(page.getByRole('region', { name, exact: true })).toBeVisible();
  }
  await expect(page.getByRole('region', { name: 'Open alerts', exact: true })).toContainText('2');
  await expect(page.getByRole('region', { name: 'Active flight', exact: true })).toContainText('FLT-001');
  await expect(page.getByText('GPS incident detected', { exact: true })).toBeVisible();
  const before = page.url();
  await page.getByRole('region', { name: 'Fleet status' }).click();
  expect(page.url()).toBe(before);
  await expect(page.getByRole('button')).toHaveCount(0);
  await expect(page.getByRole('link')).toHaveCount(0);
  await checkLayout(page);
  await capture(page, info, 'overview');
});

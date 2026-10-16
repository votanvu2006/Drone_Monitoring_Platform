import { test, expect, checkLayout, capture } from './support';

test('shell is readable and navigation remains static', async ({ page }, info) => {
  await page.goto('/?screen=shell');
  const nav = page.getByRole('navigation', { name: 'Primary navigation' });
  for (const name of ['Overview', 'Drones', 'Missions', 'Live Flight', 'Flight History', 'Alerts']) {
    await expect(nav.getByText(name, { exact: true })).toBeVisible();
  }
  const url = page.url();
  await nav.getByText('Missions', { exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Your flight operations workspace');
  expect(page.url()).toBe(url);
  await checkLayout(page);
  await capture(page, info, 'shell');
});

test('unknown screen and state fall back to the shell', async ({ page }) => {
  await page.goto('/?screen=unknown&state=missing');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Your flight operations workspace');
});

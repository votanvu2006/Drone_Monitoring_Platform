import { test, expect, checkLayout, capture } from './support';

test('Airspace appears in the static Mission Wizard preflight step', async ({ page }, info) => {
  await page.goto('/?screen=preflight-airspace');
  const step = page.getByRole('region', { name: 'Mission Wizard preflight step' });
  const panel = step.getByRole('region', { name: 'Airspace', exact: true });
  await expect(panel.getByRole('article', { name: 'Boundary Check' })).toContainText('PASS');
  await expect(panel.getByRole('article', { name: 'Restricted Zones' })).toContainText('CLEAR');
  const steps = page.getByRole('list', { name: 'Mission creation steps' });
  await expect(steps.getByRole('listitem')).toHaveCount(4);
  const before = page.url();
  await steps.getByText('Drone selection', { exact: true }).click();
  expect(page.url()).toBe(before);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Preflight review');
  await expect(page.getByRole('navigation')).toHaveCount(0);
  await checkLayout(page);
  await capture(page, info, 'preflight-airspace');
});

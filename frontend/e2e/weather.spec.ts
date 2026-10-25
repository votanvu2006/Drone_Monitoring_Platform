import { test, expect, checkLayout, capture } from './support';

test('Weather and Airspace share the Mission Wizard preflight example', async ({ page }, info) => {
  await page.goto('/?screen=preflight-weather');
  const step = page.getByRole('region', { name: 'Mission Wizard preflight step' });
  await expect(step.getByRole('region', { name: 'Airspace', exact: true })).toBeVisible();
  const weather = step.getByRole('region', { name: 'Weather', exact: true });
  for (const point of ['Departure', 'Midpoint', 'Destination']) {
    await expect(weather.getByRole('article', { name: point })).toBeVisible();
  }
  await expect(weather.getByRole('article', { name: 'Midpoint' })).toContainText('CAUTION');
  const before = page.url();
  await weather.getByRole('article', { name: 'Midpoint' }).click();
  expect(page.url()).toBe(before);
  await expect(page.getByRole('navigation')).toHaveCount(0);
  await expect(page.getByRole('button')).toHaveCount(0);
  await checkLayout(page);
  await expect(weather.locator('.weather-point-content p').first()).toHaveCSS('color','rgb(89, 99, 110)');
  await capture(page, info, 'preflight-weather');
  await page.locator('html').evaluate(element => { element.dataset.theme='dark'; });
  await expect(weather.locator('.weather-point-content p').first()).toHaveCSS('color','rgb(145, 152, 161)');
  await capture(page, info, 'preflight-weather-dark');
});

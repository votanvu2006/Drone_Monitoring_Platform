import { test, expect, checkLayout, capture } from './support';

test('default login stays readable, standalone and inert', async ({ page }, info) => {
  await page.goto('/?screen=login');
  await expect(page.getByRole('heading', { name: 'Drone Monitoring Platform', exact: true })).toBeVisible();
  const username = page.getByLabel('Username', { exact: true });
  await expect(username).toHaveValue('');
  await username.click();
  await username.press('x');
  await expect(username).toHaveValue('');
  const before = page.url();
  await page.getByLabel('Password', { exact: true }).press('Enter');
  await expect(page.getByRole('button', { name: 'Sign In' })).toBeDisabled();
  expect(page.url()).toBe(before);
  await expect(page.getByRole('navigation')).toHaveCount(0);
  await expect(page.getByRole('banner')).toHaveCount(0);
  await expect(page.locator('form')).toHaveCount(0);
  await checkLayout(page);
  await capture(page, info, 'login-default');
});

test('former login state URLs show only the default screen', async ({ page }) => {
  for (const state of ['validation-error', 'loading', 'login-error']) {
    await page.goto('/?screen=login&state=' + state);
    await expect(page.getByLabel('Username', { exact: true })).toHaveValue('');
    await expect(page.getByRole('button')).toHaveText('Sign In');
    await expect(page.getByRole('alert')).toHaveCount(0);
    await expect(page.getByRole('status')).toHaveCount(0);
    await expect(page.locator('[aria-invalid="true"], [aria-busy="true"]')).toHaveCount(0);
  }
});

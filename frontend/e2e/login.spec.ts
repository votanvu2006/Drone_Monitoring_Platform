import { test, expect, checkLayout, capture } from './support';

test('demo sign in persists after refresh and logout gates direct URLs', async ({ page }, info) => {
  await page.goto('/missions');
  await expect(page.getByRole('navigation')).toHaveCount(0);
  await checkLayout(page);
  await capture(page, info, 'login-default');
  await page.getByLabel('Username', { exact: true }).fill('operator');
  await page.getByLabel('Password', { exact: true }).fill('demo-password');
  await page.getByLabel('Password', { exact: true }).press('Enter');
  await expect(page).toHaveURL(/\/drones$/);
  await expect(page.getByRole('heading', { name: 'Drones', exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('navigation')).toBeVisible();
  await page.getByRole('link', { name: 'Missions', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Missions', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Log out' }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goBack();
  await expect(page.getByRole('form', { name: 'Sign in' })).toBeVisible();
  await page.goto('/drones');
  await expect(page.getByRole('navigation')).toHaveCount(0);
});

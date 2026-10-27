import { test, expect, checkLayout, capture } from './support';

test('shell is readable, logout stays reachable and navigation remains static', async ({ page }, info) => {
  await page.goto('/?screen=shell');
  const nav = page.getByRole('navigation', { name: 'Primary navigation' });
  await expect(nav.locator('.nav-item')).toHaveText(['Drones', 'Missions', 'Live Flight', 'Flight History', 'Alerts']);
  await expect(nav.getByText('Overview', { exact: true })).toHaveCount(0);
  await expect(nav.locator('[aria-current="page"]')).toHaveText('Drones');
  for (const name of ['Drones', 'Missions', 'Live Flight', 'Flight History', 'Alerts']) {
    await expect(nav.getByText(name, { exact: true })).toBeVisible();
  }
  const logout = page.getByRole('button', { name: 'Log out' });
  await expect(logout).toBeDisabled();
  await expect(logout).toBeInViewport();
  const url = page.url();
  await nav.getByText('Missions', { exact: true }).click();
  expect(page.url()).toBe(url);
  await nav.getByText('Alerts', { exact: true }).scrollIntoViewIfNeeded();
  await expect(nav.getByText('Alerts', { exact: true })).toBeInViewport();
  await expect(logout).toBeInViewport();
  await expect(page.getByRole('banner')).toContainText('operator');
  await expect(page.getByRole('banner')).not.toContainText('Operations');
  await expect(page.getByText('Workspace', { exact: true })).toHaveCount(0);
  await expect(page.locator('.ui-page-heading .eyebrow')).toHaveCount(0);
  const headerBox = (await page.getByRole('banner').boundingBox())!;
  const actionsBox = (await page.locator('.header-actions').boundingBox())!;
  const rightInset = headerBox.x + headerBox.width - actionsBox.x - actionsBox.width;
  expect(rightInset).toBeGreaterThanOrEqual(15);
  expect(rightInset).toBeLessThanOrEqual(29);
  await expect(page.locator('footer')).toHaveCount(0);
  await checkLayout(page);
  await capture(page, info, 'shell-light');
});

test('theme switch supports the keyboard, persists after refresh and reaches standalone pages', async ({ page }, info) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/?screen=shell');
  const toggle = page.getByRole('switch', { name: 'Dark theme' });
  await expect(toggle).toBeEnabled();
  await expect(toggle).not.toBeChecked();
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  await toggle.focus();
  await toggle.press('Space');
  await expect(toggle).toBeChecked();
  await expect(toggle).toHaveText('Dark');
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(13, 17, 23)');
  await capture(page, info, 'shell-dark');
  await page.reload();
  await expect(toggle).toBeChecked();
  for (const screen of ['alerts', 'login']) {
    await page.goto('/?screen=' + screen);
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(13, 17, 23)');
    await checkLayout(page);
    await capture(page, info, screen + '-saved-dark');
  }
  await page.goto('/?screen=shell');
  await toggle.focus();
  await toggle.press('Enter');
  await expect(toggle).not.toBeChecked();
  await expect(toggle).toHaveText('Light');
  await page.reload();
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(255, 255, 255)');
});

test('Fleet and Drone Detail retain their flow in both themes', async ({ page }, info) => {
  await page.goto('/');
  await expect(page.locator('.drone-card')).toHaveCount(5);
  if ((page.viewportSize()?.width ?? 0) >= 1280) {
    const rows = await page.locator('.drone-card').evaluateAll(cards => cards.map(card => card.getBoundingClientRect().top));
    expect(new Set(rows).size).toBe(1);
  }
  await checkLayout(page);
  await capture(page, info, 'fleet-light');
  await page.getByRole('switch', { name: 'Dark theme' }).click();
  await capture(page, info, 'fleet-dark');
  await page.getByRole('button', { name: 'View details for DRONE-003' }).click();
  await expect(page.getByRole('heading', { name: 'DRONE-003', exact: true })).toBeVisible();
  await expect(page.locator('.drone-component-health--fault')).toHaveCount(1);
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await checkLayout(page);
  await capture(page, info, 'drone-detail-dark');
  await page.getByRole('switch', { name: 'Dark theme' }).click();
  await capture(page, info, 'drone-detail-light');
  await page.getByRole('button', { name: 'Back to fleet' }).click();
  await expect(page.locator('.drone-card')).toHaveCount(5);
});

test('unknown screen and state fall back to the shell', async ({ page }) => {
  await page.goto('/?screen=unknown&state=missing');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Your flight operations workspace');
});

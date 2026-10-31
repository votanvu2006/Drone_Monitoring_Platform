import { test, expect, checkLayout, capture } from './support';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('drone-monitoring.demo-session', 'active'));
});

test('live route, history and every detail load through APIs on navigation and refresh', async ({ page }, info) => {
  const requests: string[] = [];
  page.on('request', request => { if (request.url().includes('/api/')) requests.push(request.url()); });
  await page.goto('/live-flight');
  await expect(page.getByText('mission-003', { exact: true })).toBeVisible();
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '43');
  await checkLayout(page);
  await capture(page, info, 'live-flight-api');
  await page.getByRole('link', { name: 'Flight History', exact: true }).click();
  await expect(page.locator('tbody tr')).toHaveCount(4);
  await page.getByRole('link', { name: 'FLIGHT-012', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Flight Details', exact: true })).toBeVisible();
  await expect(page.getByText('FLIGHT-012', { exact: true })).toBeVisible();
  await expect(page.getByText('Flight ended', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText('FLIGHT-012', { exact: true })).toBeVisible();
  await checkLayout(page);
  await capture(page, info, 'flight-detail-api');
  expect(requests.some(url => url.includes('/api/flights/active'))).toBe(true);
  expect(requests.some(url => url.includes('/api/flights/history'))).toBe(true);
  expect(requests.filter(url => url.includes('/api/flights/FLIGHT-012')).length).toBeGreaterThanOrEqual(2);
});

test('mission alerts retain the exact mission filter after refresh', async ({ page }) => {
  await page.goto('/missions');
  const mission = page.getByRole('row').filter({ hasText: 'DRONE-005' });
  await mission.getByRole('button', { name: /View alert/ }).click();
  await expect(page).toHaveURL(/\/alerts\?drone=DRONE-005&mission=mission-005$/);
  await expect(page.locator('tbody tr')).toHaveCount(1);
  await expect(page.getByRole('table')).toContainText('Unsafe weather');
  await page.reload();
  await expect(page.locator('tbody tr')).toHaveCount(1);
  await expect(page.getByRole('table')).toContainText('mission-005');
});

import { apiFixture } from '../src/test/api-fixtures';
import { test, expect, checkLayout, capture } from './support';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem('drone-monitoring.demo-session', 'active'),
  );
});

test('live route and completed flight detail load through APIs on navigation and refresh', async ({ page }, info) => {
  const requests: string[] = [];

  page.on('request', request => {
    if (request.url().includes('/api/')) requests.push(request.url());
  });

  await page.goto('/live-flight');
  await expect(page.getByText('mission-003', { exact: true })).toBeVisible();
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '25');
  await checkLayout(page);
  await capture(page, info, 'live-flight-api');

  await page.getByRole('link', { name: 'Flight History', exact: true }).click();
  await expect(page.locator('tbody tr')).toHaveCount(1);

  await page.getByRole('link', { name: 'FLIGHT-004', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Flight Details', exact: true }),
  ).toBeVisible();
  await expect(page.getByText('FLIGHT-004', { exact: true })).toBeVisible();

  await page.reload();
  await expect(page.getByText('FLIGHT-004', { exact: true })).toBeVisible();
  await checkLayout(page);
  await capture(page, info, 'flight-detail-api');

  expect(requests.some(url => url.includes('/api/flights/active'))).toBe(true);
  expect(requests.some(url => url.includes('/api/flights/history'))).toBe(true);
  expect(
    requests.filter(url => url.includes('/api/flights/FLIGHT-004')).length,
  ).toBeGreaterThanOrEqual(2);
});

test('mission alerts retain the exact mission filter after refresh', async ({ page }) => {
  await page.goto('/missions');

  const completedMission = page.getByRole('row').filter({ hasText: 'DRONE-004' });
  await expect(completedMission).toContainText('FLIGHT-004');

  const mission = page.getByRole('row').filter({ hasText: 'DRONE-005' });
  await mission.getByRole('button', { name: /View alert/ }).click();

  await expect(page).toHaveURL(/\/alerts\?drone=DRONE-005&mission=mission-005$/);
  await expect(page.locator('tbody tr')).toHaveCount(1);
  await expect(page.getByRole('table')).toContainText('Unsafe weather');

  await page.reload();
  await expect(page.locator('tbody tr')).toHaveCount(1);
  await expect(page.getByRole('table')).toContainText('mission-005');

  await page.goBack();
  await expect(page).toHaveURL(/\/missions$/);
  await expect(
    page.getByRole('row').filter({ hasText: 'DRONE-005' }),
  ).toBeVisible();

  await page.goForward();
  await expect(page).toHaveURL(/mission=mission-005$/);
  await expect(page.getByRole('table')).toContainText('Unsafe weather');
});

test('R6 offline startup shows empty runtime views while retaining the Fleet cards', async ({ page }) => {
  if (!process.env.E2E_LIVE_API) {
    await page.route('**/api/**', async route => {
      const body = apiFixture(route.request().url(), []);
      await route.fulfill({ status: body ? 200 : 404, json: body });
    });
  }

  await page.goto('/drones');
  await expect(page.locator('.drone-card')).toHaveCount(5);

  for (const [path, empty] of [
    ['/missions', 'No missions found'],
    ['/live-flight', 'No active flights are available.'],
    ['/flight-history', 'No flight records'],
    ['/alerts', 'No alerts match your search or severity filter.'],
  ]) {
    await page.goto(path);
    await expect(page.getByText(empty, { exact: true })).toBeVisible();
    await checkLayout(page);

    await page.reload();
    await expect(page.getByText(empty, { exact: true })).toBeVisible();
  }
});
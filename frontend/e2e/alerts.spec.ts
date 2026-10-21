import { test, expect, checkLayout, capture } from './support';

// Presentation stays in ICT even when the browser itself is in another timezone.
test.use({ timezoneId: 'America/New_York' });

test('all 24 alerts render in priority order with inert controls and no shared frame', async ({ page }, info) => {
  await page.goto('/?screen=alerts');
  const rows = page.locator('tbody tr[data-alert-code]');
  await expect(rows).toHaveCount(24);
  expect((await rows.evaluateAll(items => items.map(item => item.getAttribute('data-alert-code')))).slice(0, 5))
    .toEqual(['ALT-022', 'ALT-021', 'ALT-015', 'ALT-014', 'ALT-013']);
  await expect(page.getByLabel('Alert totals')).toContainText('Total alerts24Active6Resolved18');
  await expect(rows.filter({ has: page.getByText('ALT-016', { exact: true }) })).toContainText('Components');
  const search = page.getByLabel('Search alerts');
  await search.click();
  await search.press('x');
  await expect(search).toHaveValue('');
  await expect(page.getByLabel('Severity', { exact: true })).toBeDisabled();
  await expect(page.getByLabel('Status', { exact: true })).toBeDisabled();
  const before = page.url();
  await rows.first().click();
  expect(page.url()).toBe(before);
  await expect(page.getByRole('navigation')).toHaveCount(0);
  await expect(page.getByRole('banner')).toHaveCount(0);
  await expect(page.getByRole('main')).toHaveCount(1);
  await checkLayout(page);
  await capture(page, info, 'alerts-list-light');
  await page.evaluate(() => { document.documentElement.dataset.theme = 'dark'; });
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(13, 17, 23)');
  await capture(page, info, 'alerts-list-dark');
});

for (const [state, code] of [['detail-active', 'ALT-014'], ['detail-resolved', 'ALT-016']]) {
  test('complete alert detail: ' + state, async ({ page }, info) => {
    await page.goto('/?screen=alerts&state=' + state);
    await expect(page.locator('.alert-detail-grid')).toHaveAttribute('data-alert-code', code);
    await expect(page.getByRole('region', { name: 'Incident information' })).toContainText('Components');
    await expect(page.getByRole('region', { name: 'Incident information' })).toContainText('TELEMETRY');
    await expect(page.getByRole('region', { name: 'Measurements' })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Lifecycle' })).toContainText('ICT');
    if (state === 'detail-active') {
      await expect(page.getByRole('region', { name: 'Resolution note' })).toContainText('No resolution note');
      await expect(page.locator('time').first()).toHaveText('14 Aug 2026, 13:08:22 ICT');
    } else {
      await expect(page.getByRole('region', { name: 'Resolution note' })).not.toContainText('No resolution note');
    }
    await expect(page.getByRole('button')).toHaveCount(0);
    await expect(page.getByRole('navigation')).toHaveCount(0);
    await expect(page.getByRole('banner')).toHaveCount(0);
    await checkLayout(page);
    await capture(page, info, state + '-light');
    await page.evaluate(() => { document.documentElement.dataset.theme = 'dark'; });
    await capture(page, info, state + '-dark');
  });
}

test('direct codes, missing records and preflight alerts are handled without invented data', async ({ page }) => {
  await page.goto('/?screen=alerts&state=detail&alert=ALT-001');
  await expect(page.locator('.alert-detail-grid')).toHaveAttribute('data-alert-code', 'ALT-001');
  await expect(page.getByRole('region', { name: 'Alert summary' })).toContainText('Low battery');
  await page.goto('/?screen=alerts&state=detail&alert=ALT-021');
  await expect(page.getByRole('region', { name: 'Related records' })).toContainText('No associated flight');
  await expect(page.getByRole('region', { name: 'Related records' })).toContainText('No associated component');
  await page.goto('/?screen=alerts&state=detail&alert=ALT-999');
  await expect(page.getByRole('region', { name: 'Alert not found' })).toContainText('ALT-999');
  await checkLayout(page);
});

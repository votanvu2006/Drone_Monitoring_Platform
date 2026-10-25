import { test, expect, checkLayout, capture } from './support';

// The same ICT text must render even when the browser is in another timezone.
test.use({ timezoneId: 'America/New_York' });

test('three mission examples show separate descriptions, severity and inert controls', async ({ page }, info) => {
  await page.goto('/?screen=alerts');
  const rows = page.locator('tbody tr[data-alert-code]');
  await expect(rows).toHaveCount(3);
  expect(await rows.evaluateAll(items => items.map(item => item.getAttribute('data-alert-code'))))
    .toEqual(['DEMO-ALT-003', 'DEMO-ALT-002', 'DEMO-ALT-001']);
  await expect(page.getByRole('columnheader')).toHaveText([
    'Alert ID/title', 'Drone', 'Mission', 'Problem Description', 'Severity', 'Source', 'Detected Time',
  ]);
  await expect(page.getByLabel('Alert totals')).toContainText('Total alerts3Critical1Warning2');
  const weather = rows.filter({ has: page.getByText('DEMO-ALT-003', { exact: true }) });
  for (const value of ['DRONE-005', 'mission-005', 'Weather', 'CRITICAL', 'Strong wind and poor visibility caused the mission to fail.']) {
    await expect(weather).toContainText(value);
  }
  for (const code of ['DEMO-ALT-001', 'DEMO-ALT-002']) {
    const component = rows.filter({ has: page.getByText(code, { exact: true }) });
    for (const value of ['DRONE-002', 'mission-002', 'Components', 'WARNING']) await expect(component).toContainText(value);
    await expect(component.locator('.alert-problem')).not.toBeEmpty();
  }
  const search = page.getByLabel('Search alerts');
  await search.click();
  await search.press('x');
  await expect(search).toHaveValue('');
  await expect(page.getByLabel('Severity', { exact: true })).toBeDisabled();
  await expect(page.getByLabel('Status', { exact: true })).toHaveCount(0);
  await expect(page.locator('.ui-page-heading .eyebrow')).toHaveCount(0);
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
  await checkLayout(page);
  await capture(page, info, 'alerts-list-dark');
});

for (const [state, code, source] of [['detail-active', 'DEMO-ALT-001', 'Components'], ['detail-resolved', 'DEMO-ALT-003', 'Weather']]) {
  test('fixed alert detail: ' + state, async ({ page }, info) => {
    await page.goto('/?screen=alerts&state=' + state);
    await expect(page.locator('.alert-detail-grid')).toHaveAttribute('data-alert-code', code);
    await expect(page.getByRole('region', { name: 'Incident information' })).toContainText(source);
    await expect(page.getByRole('region', { name: 'Incident information' })).toContainText('ICT');
    if (state === 'detail-active') {
      await expect(page.getByRole('region', { name: 'Resolution note' })).toContainText('No resolution note');
      await expect(page.locator('time').first()).toHaveText('21 Oct 2026, 13:05:00 ICT');
    } else {
      await expect(page.getByRole('region', { name: 'Resolution note' })).toContainText('Mission stopped.');
    }
    await expect(page.getByRole('button')).toHaveCount(0);
    await expect(page.getByRole('navigation')).toHaveCount(0);
    await expect(page.getByRole('banner')).toHaveCount(0);
    await expect(page.getByRole('main')).toHaveCount(1);
    await checkLayout(page);
    await capture(page, info, state + '-light');
    await page.evaluate(() => { document.documentElement.dataset.theme = 'dark'; });
    await checkLayout(page);
    await capture(page, info, state + '-dark');
  });
}

test('explicit demo codes and missing records retain their preview behavior', async ({ page }) => {
  await page.goto('/?screen=alerts&state=detail&alert=DEMO-ALT-002');
  await expect(page.locator('.alert-detail-grid')).toHaveAttribute('data-alert-code', 'DEMO-ALT-002');
  await expect(page.getByRole('region', { name: 'Alert summary' })).toContainText('Motor temperature warning');
  await page.goto('/?screen=alerts&state=detail&alert=DEMO-ALT-999');
  await expect(page.getByRole('region', { name: 'Alert not found' })).toContainText('DEMO-ALT-999');
  await checkLayout(page);
});

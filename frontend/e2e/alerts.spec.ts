import { test, expect, checkLayout, capture } from './support';

test('alert list renders all records with inert search, filters and selection', async ({ page }, info) => {
  await page.goto('/?screen=alerts');
  await expect(page.getByRole('article')).toHaveCount(4);
  const search = page.getByLabel('Search alerts');
  await search.click();
  await search.press('x');
  await expect(search).toHaveValue('');
  await expect(page.getByLabel('Severity', { exact: true })).toBeDisabled();
  await expect(page.getByLabel('Status', { exact: true })).toBeDisabled();
  const before = page.url();
  await page.getByRole('article', { name: 'GPS signal lost' }).click();
  expect(page.url()).toBe(before);
  await expect(page.getByRole('article')).toHaveCount(4);
  await checkLayout(page);
  await capture(page, info, 'alerts-list');
});
for (const state of ['detail-active', 'detail-resolved']) {
  test('alert detail example: ' + state, async ({ page }, info) => {
    await page.goto('/?screen=alerts&state=' + state);
    await expect(page.getByRole('region', { name: 'Incident information' })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Resolution note' })).toContainText(
      state === 'detail-active' ? 'No resolution note' : 'Aircraft returned safely.',
    );
    await expect(page.getByRole('button')).toHaveCount(0);
    await checkLayout(page);
    await capture(page, info, 'alerts-' + state);
  });
}

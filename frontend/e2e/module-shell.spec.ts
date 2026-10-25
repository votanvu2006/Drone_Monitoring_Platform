import { test, expect, checkLayout, capture } from './support';
const modules = [['overview','Overview'],['drones','Drones'],['missions','Missions'],['live-flight','Live Flight'],['flight-history','Flight History'],['alerts','Alerts']];
test('all modules share a single frame and static sidebar', async ({page},info) => {
  for (const [module,label] of modules) {
    await page.goto('/?module=' + module);
    await expect(page.getByRole('main')).toHaveCount(1);
    await expect(page.getByRole('banner')).toHaveCount(1);
    await expect(page.getByRole('navigation')).toHaveCount(1);
    await expect(page.getByRole('banner')).not.toContainText('Operations');
    const nav = page.getByRole('navigation');
    await expect(nav.locator('.nav-item')).toHaveText(['Drones', 'Missions', 'Live Flight', 'Flight History', 'Alerts']);
    await expect(nav.getByText('Overview', { exact: true })).toHaveCount(0);
    if (module === 'overview') await expect(nav.locator('[aria-current="page"]')).toHaveCount(0);
    else await expect(nav.locator('[aria-current="page"]')).toHaveText(label);
    await expect(page.getByRole('button',{name:'Log out'})).toBeDisabled();
    if (['missions', 'live-flight', 'flight-history', 'alerts'].includes(module)) {
      await expect(page.getByText('This page is not available yet.', { exact: true })).toHaveCount(0);
    }
    if (module === 'missions') {
      await expect(page.locator('.mission-table tbody tr')).toHaveCount(5);
      await expect(page.getByRole('button', { name: 'Create mission — coming soon' })).toBeDisabled();
      await expect(page.getByRole('button', { name: 'View alert for Mission 002' })).toBeDisabled();
    }
    if (module === 'live-flight') {
      await expect(page.locator('.live-flight-details')).toContainText('FLIGHT-015');
      await expect(page.locator('.flight-route-svg')).toBeVisible();
    }
    if (module === 'flight-history') {
      await expect(page.locator('.flight-history-table tbody tr')).toHaveCount(4);
      await expect(page.getByRole('searchbox', { name: 'Search flights' })).toHaveAttribute('readonly');
    }
    if (module === 'alerts') await expect(page.locator('tbody tr[data-alert-code]')).toHaveCount(3);
    await checkLayout(page);
    await capture(page,info,'module-' + module);
    await expect(page.getByRole('switch', { name: 'Dark theme' })).toBeDisabled();
    await page.evaluate(() => { document.documentElement.dataset.theme = 'dark'; });
    await checkLayout(page);
    await capture(page,info,'module-' + module + '-dark');
  }
  const before=page.url();await page.getByRole('navigation').getByText('Drones',{exact:true}).click();
  expect(page.url()).toBe(before);
});

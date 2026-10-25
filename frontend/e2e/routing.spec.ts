import { test, expect, checkLayout, capture } from './support';
const modules = [['overview','Overview'],['drones','Drones'],['missions','Missions'],['live-flight','Live Flight'],['flight-history','Flight History'],['alerts','Alerts']];

test('sidebar links preserve the shell and document appearance, including browser history', async ({page},info) => {
  await page.goto('/drones');
  await expect(page.getByRole('switch', { name: 'Dark theme' })).toBeDisabled();
  await page.evaluate(() => { document.documentElement.dataset.theme = 'dark'; });
  const banner = await page.getByRole('banner').elementHandle();
  for (const [path,label] of modules) {
    await page.getByRole('link',{name:label,exact:true}).click();
    await expect(page).toHaveURL(new RegExp('/'+path+'$'));
    await expect(page.getByRole('link',{name:label,exact:true})).toHaveAttribute('aria-current','page');
    expect(await page.getByRole('banner').evaluate((element,old)=>element===old,banner)).toBe(true);
    await expect(page.getByRole('switch')).toBeDisabled();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await checkLayout(page);await capture(page,info,'route-'+path+'-dark');
  }
  await page.goBack();await expect(page).toHaveURL(new RegExp("/flight-history$"));
  await page.goForward();await expect(page).toHaveURL(new RegExp("/alerts$"));
  await page.reload();await expect(page.getByRole('link',{name:'Alerts',exact:true})).toHaveAttribute('aria-current','page');
  await expect(page.getByRole('switch')).not.toBeChecked();
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(255, 255, 255)');
});

test('all six routes survive direct loads and refresh', async ({page},info) => {
  await page.goto('/');await expect(page).toHaveURL(new RegExp("/overview$"));
  for (const [path,label] of modules) {
    await page.goto('/'+path);await page.reload();
    await expect(page.getByRole('main')).toHaveCount(1);
    await expect(page.getByRole('banner')).toHaveCount(1);
    await expect(page.getByRole('banner')).not.toContainText('Operations');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByRole('link',{name:label,exact:true})).toHaveAttribute('aria-current','page');
    const samples: Record<string, string> = { missions: 'Mission 001', 'live-flight': 'FLIGHT-015', 'flight-history': 'FLIGHT-014', alerts: 'DEMO-ALT-003' };
    if (samples[path]) {
      await expect(page.getByRole('main')).toContainText(samples[path]);
      await expect(page.getByRole('main')).not.toContainText('This page is not available yet.');
    }
    await checkLayout(page);await capture(page,info,'route-'+path+'-light');
  }
});

test('drone details support direct URLs, refresh and the existing return action', async ({page},info) => {
  await page.goto('/drones');await page.getByRole('button',{name:'View details for DRONE-003'}).click();
  await expect(page).toHaveURL(new RegExp("/drones/DRONE-003$"));await page.reload();
  await expect(page.getByRole('heading',{name:'DRONE-003',exact:true})).toBeVisible();
  await expect(page.getByRole('link',{name:'Drones',exact:true})).toHaveAttribute('aria-current','page');
  await checkLayout(page);await capture(page,info,'route-drone-detail');
  await page.getByRole('button',{name:'Back to fleet'}).click();await expect(page).toHaveURL(new RegExp("/drones$"));
  await page.goto('/drones/DRONE-999');await expect(page.getByText('Drone not found.',{exact:true})).toBeVisible();
});

test('keyboard navigation, standalone login and unknown paths are supported', async ({page},info) => {
  await page.goto('/unknown/path');await expect(page.getByRole('heading',{name:'Page not found',exact:true})).toBeVisible();
  await capture(page,info,'not-found');
  await page.getByRole('link',{name:'Drones',exact:true}).focus();await page.keyboard.press('Enter');
  await expect(page).toHaveURL(new RegExp("/drones$"));
  await page.goto('/login');await expect(page.getByRole('main')).toHaveCount(1);
  await expect(page.getByRole('navigation')).toHaveCount(0);await expect(page.getByRole('banner')).toHaveCount(0);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Drone Monitoring Platform');
  await expect(page.getByLabel('Username')).toHaveAttribute('readonly');
  await expect(page.getByLabel('Password', { exact: true })).toHaveAttribute('readonly');
  await expect(page.getByRole('button', { name: 'Sign In', exact: true })).toBeDisabled();
  await checkLayout(page);await capture(page,info,'login-route');
});

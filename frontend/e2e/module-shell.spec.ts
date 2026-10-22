import { test, expect, checkLayout, capture } from './support';
const modules = ['overview','drones','missions','live-flight','flight-history','alerts'];
test('all modules share a single frame and static sidebar', async ({page},info) => {
  for (const module of modules) {
    await page.goto('/?module=' + module);
    await expect(page.getByRole('main')).toHaveCount(1);
    await expect(page.getByRole('banner')).toHaveCount(1);
    await expect(page.getByRole('navigation')).toHaveCount(1);
    await expect(page.getByRole('button',{name:'Log out'})).toBeDisabled();
    await checkLayout(page);
    await capture(page,info,'module-' + module);
  }
  const before=page.url();await page.getByRole('navigation').getByText('Drones',{exact:true}).click();
  expect(page.url()).toBe(before);
});

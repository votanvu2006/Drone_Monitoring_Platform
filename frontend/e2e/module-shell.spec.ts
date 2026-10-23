import { test, expect, checkLayout, capture } from './support';
const modules = [['overview','Overview'],['drones','Drones'],['missions','Missions'],['live-flight','Live Flight'],['flight-history','Flight History'],['alerts','Alerts']];
test('all modules share a single frame and static sidebar', async ({page},info) => {
  for (const [module,label] of modules) {
    await page.goto('/?module=' + module);
    await expect(page.getByRole('main')).toHaveCount(1);
    await expect(page.getByRole('banner')).toHaveCount(1);
    await expect(page.getByRole('navigation')).toHaveCount(1);
    await expect(page.getByRole('banner')).not.toContainText('Operations');
    await expect(page.getByRole('navigation').locator('[aria-current="page"]')).toHaveText(label);
    await expect(page.getByRole('button',{name:'Log out'})).toBeDisabled();
    await checkLayout(page);
    await capture(page,info,'module-' + module);
    await page.getByRole('switch', { name: 'Dark theme' }).click();
    await checkLayout(page);
    await capture(page,info,'module-' + module + '-dark');
  }
  const before=page.url();await page.getByRole('navigation').getByText('Drones',{exact:true}).click();
  expect(page.url()).toBe(before);
});

import { test, expect, checkLayout, capture } from './support';

for (const state of ['default', 'validation-error', 'loading', 'login-error']) {
  test('login example: ' + state, async ({ page }, info) => {
    await page.goto('/?screen=login&state=' + state);
    await expect(page.getByRole('heading', { name: 'Welcome back.' })).toBeVisible();
    const field = page.getByLabel('Username or email');
    const value = await field.inputValue();
    await field.click();
    await field.press('x');
    await expect(field).toHaveValue(value);
    const before = page.url();
    await page.getByRole('button').click({ force: true });
    await field.press('Enter');
    expect(page.url()).toBe(before);
    await expect(page.getByRole(state.includes('error') ? 'alert' : 'status')).toBeVisible();
    await checkLayout(page);
    await capture(page, info, 'login-' + state);
  });
}

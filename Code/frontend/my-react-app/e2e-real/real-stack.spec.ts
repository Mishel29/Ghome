import { expect, test } from '@playwright/test';

const backendUrl = 'http://127.0.0.1:4100';
const admin = { email: 'admin@e2e.harborstone.test', password: 'e2e-admin-password' };
const user = { email: 'user@e2e.harborstone.test', password: 'e2e-user-password' };

async function signIn(page: import('@playwright/test').Page, account: { email: string; password: string }) {
  await page.goto('/login');
  await page.locator('input[type="email"]').fill(account.email);
  await page.locator('input[type="password"]').fill(account.password);
  await page.locator('form').getByRole('button', { name: 'Sign In' }).click();
}

test('runs campaign attribution, consent, auth, publication, news, and unsubscribe against the disposable stack', async ({ page, request }) => {
  const graph = await request.post(`${backendUrl}/graphql`, { data: { query: '{ __typename }' } });
  expect(await graph.json()).toEqual({ data: { __typename: 'Query' } });

  await page.goto('/news');
  await expect(page.getByRole('heading', { name: 'E2E Published News' })).toBeVisible();
  await expect(page.getByText('E2E Draft News')).toHaveCount(0);
  await expect(page.getByText('E2E Future News')).toHaveCount(0);

  await page.goto(`${backendUrl}/campaign-click?token=e2e-campaign-token&propertyId=e2e-property-a`);
  await expect(page).toHaveURL(/properties\/e2e-property-a\?campaignToken=e2e-campaign-token/);
  await expect(page.getByRole('heading', { name: 'E2E Property A', exact: true })).toBeVisible();
  await expect.poll(() => page.evaluate(() => JSON.parse(sessionStorage.getItem('harborstone-campaign-attribution') ?? '{}').token)).toBe('e2e-campaign-token');
  await page.getByRole('button', { name: 'Save Property' }).click();

  await page.goto('/properties/e2e-property-b');
  await expect(page.getByRole('heading', { name: 'E2E Property B', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Save Property' }).click();

  await page.goto('/properties/e2e-property-c');
  await expect(page.getByRole('heading', { name: 'E2E Property C', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Register Interest' }).first().click();
  await page.locator('input[placeholder="Your full name"]').fill('Campaign Interest');
  await page.locator('input[placeholder="871234567"]').fill('871234567');
  await page.locator('input[placeholder="your@email.com"]').fill('interest@e2e.harborstone.test');
  await page.locator('textarea[placeholder*="Tell us"]').fill('Please contact me about this home.');
  await page.locator('input[type="checkbox"]').check();
  await page.getByRole('button', { name: 'Submit Interest' }).click();
  await expect(page.getByText('Interest Registered!')).toBeVisible();

  await page.evaluate(() => sessionStorage.removeItem('harborstone-campaign-attribution'));
  await page.getByRole('button', { name: 'Close' }).click();
  await page.getByRole('button', { name: 'Save Property' }).click();
  await page.goto('/properties/e2e-property-a');
  await page.getByRole('button', { name: 'Saved ✓' }).click();
  await page.getByRole('button', { name: 'Save Property' }).click();

  await signIn(page, user);
  await expect(page).toHaveURL(/\/saved$/);
  await page.goto('/admin');
  await expect(page.getByRole('heading', { name: 'Admin sign in required' })).toBeVisible();
  await page.goto('/properties/e2e-property-a');
  await page.getByRole('button', { name: 'Save Property' }).click();
  await page.goto('/saved');
  await expect(page.getByText('E2E Property A', { exact: true })).toBeVisible();

  await page.evaluate(() => sessionStorage.clear());
  await page.reload();
  await signIn(page, admin);
  await expect(page).toHaveURL(/\/admin$/);
  await page.goto('/admin/properties');
  await expect(page.getByText('E2E Draft Property')).toBeVisible();
  await page.goto('/admin/campaigns');
  await page.getByRole('button', { name: 'Statistics' }).click();
  const day = page.locator('table tbody tr').filter({ hasText: 'E2E Campaign' });
  await expect(day).toHaveCount(1);
  const values = await day.locator('td').allTextContents();
  expect(values[4]).toBe('1');
  expect(values[5]).toBe('2');

  await page.goto(`${backendUrl}/unsubscribe?token=e2e-unsubscribe-token&campaignToken=e2e-campaign-token`);
  await expect(page.getByRole('heading', { name: 'You have been unsubscribed' })).toBeVisible();
});

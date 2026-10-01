import { test, expect } from './playwright-fixtures.mjs';

test('upgrade confirmation reports API failures without claiming a restart', async ({
  page,
  syncthing,
}) => {
  syncthing.configure();
  let writes = 0;
  await page.route('**/rest/system/upgrade', async (route) => {
    if (route.request().method() === 'POST') {
      writes++;
      return route.fulfill({ status: 500, body: 'test upgrade unavailable' });
    }
    await route.fulfill({ json: { newer: true, latest: 'v2.1.4' } });
  });
  await page.goto('/');
  await page.getByRole('link', { name: /Actions/ }).click();
  await page.getByRole('link', { name: 'Upgrade v2.1.4', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Upgrade', exact: true });
  await expect(dialog).toContainText('Are you sure you want to upgrade?');
  expect(writes).toBe(0);
  await dialog.getByRole('button', { name: 'Upgrade', exact: true }).click();
  await expect(
    page.getByRole('dialog', { name: 'Error', exact: true }),
  ).toContainText('test upgrade unavailable');
  expect(writes).toBe(1);
});

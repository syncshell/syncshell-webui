import { test, expect } from './playwright-fixtures.mjs';

for (const [type, model, label, operation] of [
  [
    'sendonly',
    { needTotalItems: 2, needBytes: 100 },
    'Override Changes',
    'override',
  ],
  [
    'receiveonly',
    { receiveOnlyTotalItems: 2 },
    'Revert Local Changes',
    'revert',
  ],
])
  test(`${label} requires confirmation before the folder request`, async ({
    page,
    syncthing,
  }) => {
    syncthing.configure({ folder: { type }, model });
    let calls = 0;
    await page.route('**/rest/db/' + operation + '?*', async (route) => {
      expect(route.request().method()).toBe('POST');
      expect(new URL(route.request().url()).searchParams.get('folder')).toBe(
        'test-folder',
      );
      calls++;
      await route.fulfill({ status: 200, body: '' });
    });
    await page.goto('/');
    await page.getByRole('button', { name: /Folder under test/ }).click();
    await page.getByRole('button', { name: label, exact: true }).click();
    const dialog = page.getByRole('dialog', { name: label, exact: true });
    expect(calls).toBe(0);
    await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
    expect(calls).toBe(0);
    await page.getByRole('button', { name: label, exact: true }).click();
    await dialog
      .getByRole('button', {
        name: operation === 'override' ? 'Override' : 'Revert',
        exact: true,
      })
      .click();
    await expect(dialog).toHaveCount(0);
    expect(calls).toBe(1);
  });

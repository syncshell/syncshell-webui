import { test, expect } from './playwright-fixtures.mjs';

test('dialogs take initial focus and return it after Escape', async ({
  page,
  folderFixture,
}) => {
  await folderFixture();
  await page.route('**/rest/events/disk?*', (route) =>
    route.fulfill({ json: [] }),
  );
  await page.goto('/');

  const opener = page.getByRole('button', {
    name: 'Recent Changes',
    exact: true,
  });
  await expect(opener).toBeVisible();
  await opener.click();

  const dialog = page.getByRole('dialog', {
    name: 'Recent Changes',
    exact: true,
  });
  await expect(dialog).toBeVisible();
  await expect(
    dialog.getByRole('button', { name: 'Full View', exact: true }),
  ).toBeFocused();
  await expect(dialog).toHaveScreenshot('recent-changes-dialog.png');

  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(opener).toBeFocused();
});

test('nested dialogs return focus to their parent dialog', async ({
  page,
  folderFixture,
}) => {
  await folderFixture();
  await page.goto('/');

  await page.getByRole('link', { name: /Actions/ }).click();
  await page.getByRole('link', { name: 'Settings', exact: true }).click();
  const settings = page.getByRole('dialog', { name: 'Settings', exact: true });
  const opener = settings.getByRole('button', {
    name: 'Edit Folder Defaults',
    exact: true,
  });
  await opener.click();

  const editor = page.getByRole('dialog', {
    name: 'Edit Folder Defaults',
    exact: true,
  });
  await expect(editor).toBeVisible();
  await expect(
    editor.getByRole('tab', { name: 'General', exact: true }),
  ).toBeFocused();

  await page.keyboard.press('Escape');
  await expect(editor).toHaveCount(0);
  await expect(opener).toBeFocused();
});

import { test, expect } from '@playwright/test';
import { folderFixture } from './folder-fixture.mjs';

test('dialogs take initial focus and return it after Escape', async ({
  page,
}) => {
  await folderFixture(page);
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

  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(opener).toBeFocused();
});

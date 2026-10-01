import { test, expect } from './playwright-fixtures.mjs';

test('device actions open identification and settings dialogs', async ({
  page,
  folderFixture,
}) => {
  await folderFixture();
  await page.goto('/');

  const local = page.locator('.dashboard-devices > .panel');
  await expect(
    local.getByRole('button', { name: 'Identification' }),
  ).toBeVisible();
  await expect(
    local
      .locator('.device-details')
      .getByText('Identification', { exact: true }),
  ).toHaveCount(0);
  await local.getByRole('button', { name: 'Identification' }).click();
  await expect(
    page.getByRole('dialog', { name: /Device Identification/ }),
  ).toBeVisible();
  await page.getByRole('dialog').getByRole('button', { name: /Close/ }).click();
  await local.getByRole('button', { name: 'Settings', exact: true }).click();
  const settings = page.getByRole('dialog', { name: 'Settings', exact: true });
  await expect(
    settings.getByRole('tab', { name: 'General', exact: true }),
  ).toHaveAttribute('aria-selected', 'true');
  await settings.getByRole('button', { name: 'Close', exact: true }).click();
});

test('folder menus open editors and dismiss outside', async ({
  page,
  folderFixture,
}) => {
  await folderFixture();
  await page.goto('/');

  const local = page.locator('.dashboard-devices > .panel');
  const localFolders = local.getByRole('button', { name: /Folders/ });
  await localFolders.click();
  await expect(localFolders).toHaveAttribute('aria-expanded', 'true');
  await page.locator('.dashboard-heading h3').click();
  await expect(localFolders).toHaveAttribute('aria-expanded', 'false');
  await localFolders.click();
  await local.getByRole('link', { name: 'Folder under test' }).click();
  const editor = page.getByRole('dialog', { name: 'Edit Folder', exact: true });
  await expect(
    editor.getByRole('tab', { name: 'General', exact: true }),
  ).toHaveAttribute('aria-selected', 'true');
  await editor.getByRole('button', { name: 'Cancel', exact: true }).click();

  const folderHeading = page
    .locator('.dashboard-folders .panel-heading')
    .first();
  await folderHeading.click();
  const shared = page.getByRole('button', { name: /Shared/ }).first();
  await shared.click();
  await page.locator('.dashboard-heading h3').click();
  await expect(shared).toHaveAttribute('aria-expanded', 'false');

  const remote = page.locator('.dashboard-remotes .panel').first();
  await remote.locator('.panel-heading').click();
  const remoteFolders = remote.getByRole('button', { name: /Folders/ });
  await remoteFolders.click();
  await page.locator('.dashboard-folders > h3').click();
  await expect(remoteFolders).toHaveAttribute('aria-expanded', 'false');
});

test('pausing the local device pauses every folder', async ({
  page,
  folderFixture,
}) => {
  await folderFixture();
  let saved;
  await page.route('**/rest/config', async (route) => {
    if (route.request().method() !== 'PUT') return route.fallback();
    saved = route.request().postDataJSON();
    await route.fulfill({ status: 200, body: '' });
  });
  await page.goto('/');

  const local = page.locator('.dashboard-devices > .panel');
  await local.getByRole('button', { name: 'Pause', exact: true }).click();
  await expect
    .poll(() => saved?.folders.every((folder) => folder.paused))
    .toBe(true);
  await expect(
    local.getByRole('button', { name: 'Resume', exact: true }),
  ).toBeVisible();
});

test('recent changes keep long paths usable across dialog sizes', async ({
  page,
  folderFixture,
}) => {
  await folderFixture();
  const path =
    'projects/syncshell/syncshell-webui/' +
    'a-very-long-directory/'.repeat(20) +
    'changed-file.txt';
  await page.route('**/rest/events/disk?*', (route) =>
    route.fulfill({
      json: [
        {
          id: 9,
          time: '2026-09-09T19:03:45Z',
          data: {
            modifiedBy: '',
            action: 'modified',
            type: 'file',
            folder: 'test-folder',
            path,
          },
        },
      ],
    }),
  );
  await page.goto('/');

  const heading = page.locator('.dashboard-heading');
  await expect(
    heading.getByRole('heading', { name: 'Devices', exact: true }),
  ).toBeVisible();
  await expect(
    page
      .locator('.dashboard-remotes .action-row')
      .getByRole('button', { name: 'Recent Changes' }),
  ).toHaveCount(0);
  await heading.getByRole('button', { name: 'Recent Changes' }).click();

  const dialog = page.getByRole('dialog', {
    name: 'Recent Changes',
    exact: true,
  });
  const table = dialog.locator('.recent-changes-table');
  await expect(table).toBeVisible();
  const pathLabel = table.getByLabel(path, { exact: true });
  expect(
    await pathLabel.evaluate((node) => node.scrollWidth > node.clientWidth),
  ).toBe(true);
  await pathLabel.hover();
  await expect(page.getByRole('tooltip')).toHaveText(path);

  await dialog.getByRole('button', { name: 'Full View', exact: true }).click();
  await expect(dialog).toHaveClass(/full-view/);
  await dialog.getByRole('button', { name: 'Back', exact: true }).click();
  await expect(dialog).not.toHaveClass(/full-view/);
  await expect(dialog.locator('.modal-footer')).toHaveCount(0);

  await page.setViewportSize({ width: 390, height: 844 });
  const wrapper = dialog.locator('.table-responsive');
  expect(
    await wrapper.evaluate((node) => node.scrollWidth > node.clientWidth),
  ).toBe(true);
});

test('modern follows the browser color scheme across reloads', async ({
  page,
  folderFixture,
}) => {
  await folderFixture();
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/');
  await expect(page.locator('body')).toHaveCSS(
    'background-color',
    'rgb(39, 39, 39)',
  );
  const overviewTab = page.getByRole('tab', { name: 'Overview' });
  await overviewTab.focus();
  await expect(overviewTab).toHaveCSS('outline-style', 'solid');
  await expect(overviewTab).toHaveCSS('outline-color', 'rgb(63, 169, 240)');

  const addFolderButton = page.getByRole('button', { name: /Add Folder/ });
  await addFolderButton.focus();
  await expect(addFolderButton).toHaveCSS('outline-style', 'solid');
  await expect(addFolderButton).toHaveCSS('outline-color', 'rgb(63, 169, 240)');
  await page.reload();
  await expect(page.locator('body')).toHaveCSS(
    'background-color',
    'rgb(39, 39, 39)',
  );

  await page.emulateMedia({ colorScheme: 'light' });
  await expect(page.locator('body')).toHaveCSS(
    'background-color',
    'rgb(255, 255, 255)',
  );
  await page.reload();
  await expect(page.locator('body')).toHaveCSS(
    'background-color',
    'rgb(255, 255, 255)',
  );
});

import { test, expect } from '@playwright/test';
import { folderFixture } from './folder-fixture.mjs';

test('device actions expose local folders and dismiss menus outside', async ({
  page,
}) => {
  await folderFixture(page, { model: { ignorePatterns: true } });
  let saved;
  await page.route('**/rest/config', async (route) => {
    if (route.request().method() !== 'PUT') return route.fallback();
    saved = route.request().postDataJSON();
    await route.fulfill({ status: 200, body: '' });
  });
  await page.goto('/');

  const brand = page.locator('.syncshell-brand');
  const brandColor = await brand.evaluate(
    (node) => getComputedStyle(node).color,
  );
  await brand.hover();
  expect(await brand.evaluate((node) => getComputedStyle(node).color)).toBe(
    brandColor,
  );

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
    settings
      .getByRole('tab', { name: 'General', exact: true })
      .locator('xpath=..'),
  ).toHaveClass(/active/);
  await settings.getByRole('button', { name: 'Close', exact: true }).click();

  const localFolders = local.getByRole('button', { name: /Folders/ });
  await localFolders.click();
  await expect(localFolders.locator('xpath=..')).toHaveClass(/open/);
  await page.locator('.dashboard-heading h3').click();
  await expect(localFolders.locator('xpath=..')).not.toHaveClass(/open/);
  await localFolders.click();
  await localFolders
    .locator('xpath=..')
    .getByRole('link', { name: 'Folder under test' })
    .click();
  const editor = page.getByRole('dialog', { name: 'Edit Folder', exact: true });
  await expect(
    editor
      .getByRole('tab', { name: 'General', exact: true })
      .locator('xpath=..'),
  ).toHaveClass(/active/);
  await editor.getByRole('button', { name: 'Cancel', exact: true }).click();

  const folderHeading = page
    .locator('.dashboard-folders .panel-heading')
    .first();
  await folderHeading.click();
  const ignoreInfo = page.locator('.folder-state-summary th > a');
  expect(
    await ignoreInfo.evaluate(
      (node) =>
        node.getBoundingClientRect().left -
        node.previousElementSibling.getBoundingClientRect().right,
    ),
  ).toBeGreaterThan(4);
  const shared = page.getByRole('button', { name: /Shared/ }).first();
  await shared.click();
  await page.locator('.dashboard-heading h3').click();
  await expect(shared.locator('xpath=..')).not.toHaveClass(/open/);

  const remote = page.locator('.dashboard-remotes .panel').first();
  await expect(remote.locator('.panel-status')).toHaveCSS('gap', '6px');
  await remote.locator('.panel-heading').click();
  const remoteFolders = remote.getByRole('button', { name: /Folders/ });
  await remoteFolders.click();
  await page.locator('.dashboard-folders > h3').click();
  await expect(remoteFolders.locator('xpath=..')).not.toHaveClass(/open/);

  await local.getByRole('button', { name: 'Pause', exact: true }).click();
  await expect
    .poll(() => saved?.folders.every((folder) => folder.paused))
    .toBe(true);
  await expect(
    local.getByRole('button', { name: 'Resume', exact: true }),
  ).toBeVisible();
});

test('recent changes use compact columns and scroll only when needed', async ({
  page,
}) => {
  await folderFixture(page);
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
  const alignment = await heading.evaluate((node) => ({
    button: node.querySelector('button').getBoundingClientRect().right,
    heading: node.getBoundingClientRect().right,
  }));
  expect(Math.abs(alignment.button - alignment.heading)).toBeLessThan(1);
  await expect(
    page
      .locator('.dashboard-remotes .folder-actions')
      .getByRole('button', { name: 'Recent Changes' }),
  ).toHaveCount(0);
  await heading.getByRole('button', { name: 'Recent Changes' }).click();

  const dialog = page.getByRole('dialog', {
    name: 'Recent Changes',
    exact: true,
  });
  const table = dialog.locator('.recent-changes-table');
  await expect(table).toBeVisible();
  expect(
    await table.evaluate((node) => getComputedStyle(node).tableLayout),
  ).toBe('fixed');
  const widths = await table
    .locator('th')
    .evaluateAll((nodes) =>
      Object.fromEntries(
        nodes.map((node) => [node.textContent.trim(), node.clientWidth]),
      ),
    );
  expect(widths.Path).toBeGreaterThan(widths.Action);
  const time = table.locator('tbody td:last-child');
  expect(
    await time.evaluate((node) => node.scrollWidth <= node.clientWidth),
  ).toBe(true);
  const pathCell = table.locator('tbody td:nth-child(5)');
  expect(
    await pathCell.evaluate((node) => node.scrollHeight === node.clientHeight),
  ).toBe(true);
  const pathLabel = table.getByLabel(path, { exact: true });
  expect(
    await pathLabel.evaluate((node) => node.scrollWidth > node.clientWidth),
  ).toBe(true);
  await pathLabel.hover();
  await expect(page.getByRole('tooltip')).toHaveText(path);

  const normalWidth = await dialog.evaluate((node) => node.clientWidth);
  const normalPathWidth = widths.Path;
  await dialog.getByRole('button', { name: 'Full View', exact: true }).click();
  await expect(dialog).toHaveClass(/full-view/);
  expect(await dialog.evaluate((node) => node.clientWidth)).toBeGreaterThan(
    normalWidth,
  );
  expect(
    await table
      .locator('th')
      .filter({ hasText: 'Path' })
      .evaluate((node) => node.clientWidth),
  ).toBeGreaterThan(normalPathWidth);
  expect(
    await pathLabel.evaluate((node) => node.scrollWidth > node.clientWidth),
  ).toBe(true);
  await dialog.getByRole('button', { name: 'Back', exact: true }).click();
  await expect(dialog).not.toHaveClass(/full-view/);
  const header = dialog.locator('.modal-header');
  const controls = header.locator('.modal-header-actions');
  expect(
    await controls.evaluate(
      (node) =>
        node.getBoundingClientRect().right >
        node.parentElement.getBoundingClientRect().left +
          node.parentElement.clientWidth / 2,
    ),
  ).toBe(true);
  await expect(dialog.locator('.modal-footer')).toHaveCount(0);

  await page.setViewportSize({ width: 390, height: 844 });
  const wrapper = dialog.locator('.table-responsive');
  expect(
    await wrapper.evaluate((node) => node.scrollWidth > node.clientWidth),
  ).toBe(true);
});

test('modern follows the browser color scheme across reloads', async ({
  page,
}) => {
  await folderFixture(page);
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

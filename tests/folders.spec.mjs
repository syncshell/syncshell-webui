import { test, expect } from './playwright-fixtures.mjs';

async function openFolder(page, query = '') {
  await page.goto('/' + query);
  await page.getByRole('button', { name: /Folder under test/ }).click();
  await expect(page.locator('.folder-state-summary')).toBeVisible();
}

test('accepted fields, compact values and icon-only help stay readable in English', async ({
  page,
  syncthing,
}) => {
  syncthing.configure();
  await openFolder(page, '?lang=de');
  const summary = page.locator('.folder-state-summary');
  await expect(summary).toContainText('109.2k');
  await expect(summary).toContainText('6.85 GiB');
  await summary.getByRole('img', { name: 'Files', exact: true }).hover();
  const tooltip = page.getByRole('tooltip');
  await expect(tooltip).toContainText('109,274');
  await expect(tooltip).toContainText('12,921');
  await expect(tooltip).not.toContainText('Global State');
  await page.getByRole('heading', { name: 'Folders', exact: true }).hover();
  await expect(tooltip).toBeHidden();
  await page.getByText('Folder information', { exact: true }).click();
  await expect(
    page.getByRole('img', { name: 'Folder Type', exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel('/a/b', { exact: true })).toBeVisible();
  await expect(
    page.getByText('File Pull Order', { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'Language', exact: true }),
  ).toHaveCount(0);
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(
    page.getByText('File Pull Order', { exact: true }),
  ).toBeVisible();
  await expect(page).toHaveTitle(/Syncshell/);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test('divergence exposes compact child rows and a working paged error dialog', async ({
  page,
  syncthing,
}) => {
  syncthing.configure({
    model: {
      localFiles: 109000,
      localBytes: 7340000000,
      errors: 25,
      pullErrors: 25,
    },
  });
  const requests = [];
  await page.route('**/rest/folder/errors?*', async (route) => {
    const url = new URL(route.request().url());
    requests.push(Object.fromEntries(url.searchParams));
    await route.fulfill({
      json: {
        page: Number(url.searchParams.get('page')),
        perpage: Number(url.searchParams.get('perpage')),
        folder: 'test-folder',
        errors: [
          {
            path: '<img src=x onerror=alert(1)>literal.txt',
            error: 'permission denied',
          },
        ],
      },
    });
  });
  await openFolder(page);
  const rows = page.locator('.folder-state-detail');
  await expect(rows).toHaveCount(2);
  await expect(rows.nth(0)).toContainText('109.2k');
  await expect(rows.nth(1)).toContainText('109.0k');
  await expect(
    rows.nth(0).getByRole('img', { name: 'Global State', exact: true }),
  ).toBeVisible();
  await expect(
    rows.nth(1).getByRole('img', { name: 'Local State', exact: true }),
  ).toBeVisible();
  await page.getByRole('link', { name: '25 items', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText('<img src=x onerror=alert(1)>literal.txt');
  await expect(dialog.locator('img')).toHaveCount(0);
  await expect(dialog).toContainText('permission denied');
  await dialog.getByRole('link', { name: 'Next', exact: true }).click();
  await expect.poll(() => requests.at(-1)?.page).toBe('2');
  await expect(dialog.locator('table')).toHaveAttribute('aria-busy', 'false');
  await dialog.getByRole('link', { name: '25', exact: true }).click();
  await expect.poll(() => requests.at(-1)?.perpage).toBe('25');
  await expect.poll(() => requests.at(-1)?.page).toBe('1');
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(
    page.getByRole('link', { name: '25 items', exact: true }),
  ).toBeFocused();
});

test('configuration fields and scanning estimate follow visibility rules', async ({
  page,
  syncthing,
}) => {
  syncthing.configure({
    folder: {
      ignorePerms: true,
      type: 'receiveonly',
      versioning: {
        type: 'simple',
        params: { keep: '5', cleanoutDays: '10' },
        cleanupIntervalS: 3600,
        fsPath: '/long/version/storage/path',
      },
    },
    model: { state: 'scanning' },
    progress: { current: 0, total: 70000, rate: 1000 },
  });
  await openFolder(page);
  await expect(
    page.getByText('Scan Time Remaining', { exact: true }),
  ).toBeVisible();
  await page.getByText('Configuration', { exact: true }).click();
  await expect(
    page.getByText('File Versioning', { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText('Ignore Permissions', { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Rescan', exact: true }),
  ).toBeDisabled();
  await page.getByRole('img', { name: 'File Versioning', exact: true }).hover();
  await expect(page.getByRole('tooltip')).toContainText('Keeps older copies');
});

test('local changes show empty-file sizes and page through the API', async ({
  page,
  syncthing,
}) => {
  syncthing.configure({
    folder: { type: 'receiveonly' },
    model: { receiveOnlyTotalItems: 25, receiveOnlyChangedBytes: 1 },
  });
  const reads = [];
  await page.route('**/rest/db/localchanged?*', async (route) => {
    const query = new URL(route.request().url()).searchParams;
    reads.push(Number(query.get('page')));
    await route.fulfill({
      json: {
        files: [
          { name: 'empty.txt', size: 0, type: 'FILE_INFO_TYPE_FILE' },
          { name: 'directory', size: 128, type: 'FILE_INFO_TYPE_DIRECTORY' },
        ],
      },
    });
  });
  await page.goto('/');
  await page.getByRole('button', { name: /Folder under test/ }).click();
  await page.locator('.dashboard-folders a[href="#local-changed"]').click();
  const dialog = page.getByRole('dialog', {
    name: 'Locally Changed Items',
    exact: true,
  });
  await expect(
    dialog.getByRole('columnheader', { name: 'Path', exact: true }),
  ).toBeVisible();
  await expect(
    dialog.getByRole('row').filter({ hasText: 'empty.txt' }),
  ).toContainText('0 B');
  await expect(
    dialog
      .getByRole('row')
      .filter({ hasText: 'directory' })
      .locator('td')
      .last(),
  ).toHaveText('');
  await dialog.getByRole('link', { name: '2', exact: true }).click();
  await expect.poll(() => reads).toEqual([1, 2]);
});

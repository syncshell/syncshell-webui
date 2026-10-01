import { test, expect } from './playwright-fixtures.mjs';

async function openConflictReview(page, syncthing) {
  syncthing.configure();
  const copy = 'note.sync-conflict-20260908-120000-ABCDEFG.txt';
  await page.route('**/rest/db/browse?*', (route) =>
    route.fulfill({
      json: [
        {
          name: 'notes',
          type: 'FILE_INFO_TYPE_DIRECTORY',
          children: [{ name: copy, type: 'FILE_INFO_TYPE_FILE' }],
        },
      ],
    }),
  );
  await page.route('**/rest/db/file?*', (route) => {
    const file = {
      type: 'FILE_INFO_TYPE_FILE',
      size: 16,
      modified: '2026-09-08T12:00:00Z',
    };
    return route.fulfill({ json: { global: file, local: file } });
  });
  await page.goto('/');
  await page.getByRole('tab', { name: 'Resolve sync conflicts' }).click();
  return {
    all: page.getByRole('button', {
      name: 'Recheck all files',
      exact: true,
    }),
    row: page.getByRole('button', {
      name: 'Recheck files in folder',
      exact: true,
    }),
  };
}

async function deferScan(page, failed = false) {
  let release;
  let startedResolve;
  const started = new Promise((resolve) => {
    startedResolve = resolve;
  });
  await page.route('**/rest/db/scan*', async (route) => {
    startedResolve(new URL(route.request().url()));
    await new Promise((resolve) => {
      release = resolve;
    });
    await route.fulfill({
      status: failed ? 500 : 200,
      body: failed ? 'scan failed' : '',
    });
  });
  return {
    started,
    finish() {
      release();
    },
  };
}

test('rechecking all conflicts shows activity until the scan completes', async ({
  page,
  syncthing,
}) => {
  const scan = await deferScan(page);
  const { all, row } = await openConflictReview(page, syncthing);
  await expect(row).toBeEnabled();
  await expect(page.locator('.conflict-review')).toHaveScreenshot(
    'conflict-table.png',
  );

  await all.click();
  const request = await scan.started;
  await expect(all).toHaveAttribute('aria-busy', 'true');
  await expect(all.locator('.text-warning .icon-spin')).toBeVisible();
  await expect(all).toBeDisabled();
  expect([...request.searchParams]).toEqual([]);
  scan.finish();
  await expect(all).toHaveAttribute('aria-busy', 'false');
  await expect(all.locator('.icon-spin')).toHaveCount(0);
  await expect(all).toBeEnabled();
});

test('a failed directory recheck clears activity and reports the error', async ({
  page,
  syncthing,
}) => {
  const scan = await deferScan(page, true);
  const { all, row } = await openConflictReview(page, syncthing);

  await row.click();
  const request = await scan.started;
  await expect(row).toHaveAttribute('aria-busy', 'true');
  await expect(row.locator('.text-warning .icon-spin')).toBeVisible();
  await expect(row).toBeDisabled();
  expect(request.searchParams.get('folder')).toBe('test-folder');
  expect(request.searchParams.get('sub')).toBe('notes');
  await expect(all).toHaveAttribute('aria-busy', 'false');
  scan.finish();
  await expect(row).toHaveAttribute('aria-busy', 'false');
  await expect(row.locator('.icon-spin')).toHaveCount(0);
  await expect(row).toBeEnabled();
  await expect(page.getByRole('alert')).toBeVisible();
});

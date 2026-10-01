import { test, expect } from './playwright-fixtures.mjs';

test('needed files show event progress, prioritize a file and refresh when it finishes', async ({
  page,
  syncthing,
}) => {
  syncthing.configure({ model: { needTotalItems: 2, needBytes: 2048 } });
  const path = 'nested/file & review.txt';
  let pending,
    finished = false,
    reads = 0,
    priority;
  await page.route('**/rest/events?*', async (route) => {
    if (route.request().url().includes('limit='))
      return route.fulfill({ json: [{ id: 1, type: 'Starting', data: {} }] });
    pending = route;
  });
  const need = () => ({
    progress: finished ? [] : [{ name: path, size: 1024, flags: 0 }],
    queued: finished ? [] : [{ name: 'queued.txt', size: 500, flags: 0 }],
    rest: [],
  });
  await page.route('**/rest/db/need?*', async (route) => {
    reads++;
    await route.fulfill({ json: need() });
  });
  await page.route('**/rest/db/prio?*', async (route) => {
    priority = new URL(route.request().url()).searchParams.get('file');
    await route.fulfill({ json: need() });
  });
  await page.goto('/');
  await page.getByRole('button', { name: /Folder under test/ }).click();
  await page.getByRole('link', { name: /2.*2 KiB/ }).click();
  await expect.poll(() => !!pending).toBe(true);
  const route = pending;
  pending = null;
  await route.fulfill({
    json: [
      {
        id: 2,
        type: 'DownloadProgress',
        data: {
          'test-folder': {
            [path]: {
              total: 10,
              reused: 1,
              copiedFromOrigin: 1,
              copiedFromElsewhere: 1,
              pulled: 2,
              pulling: 1,
              bytesTotal: 2048,
              bytesDone: 512,
            },
          },
        },
      },
    ],
  });
  const dialog = page.getByRole('dialog', {
    name: 'Out of Sync Items',
    exact: true,
  });
  const bar = dialog.getByRole('progressbar', {
    name: 'Downloading',
    exact: true,
  });
  await expect(bar).toHaveAttribute('aria-valuenow', '512');
  await expect(bar).toContainText('512 B / 2 KiB');
  await dialog.getByRole('button', { name: 'Move to top of queue' }).click();
  expect(priority).toBe('queued.txt');
  await expect.poll(() => !!pending).toBe(true);
  finished = true;
  await pending.fulfill({
    json: [{ id: 3, type: 'DownloadProgress', data: {} }],
  });
  pending = null;
  await expect(bar).toHaveCount(0);
  await expect(dialog.locator('tbody tr')).toHaveCount(0);
  expect(reads).toBe(2);
});

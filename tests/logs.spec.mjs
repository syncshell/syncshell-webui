import { test, expect } from './playwright-fixtures.mjs';

test('logs render literal text, update logging levels and cancel polling on close', async ({
  page,
  syncthing,
}) => {
  syncthing.configure();
  // Paused time keeps a 2 s poll from landing between Close and the count.
  const start = new Date('2026-09-08T12:00:00Z');
  await page.clock.install({ time: start });
  await page.clock.pauseAt(start);
  let levels = { api: 'INFO' },
    writes = 0,
    reads = 0;
  await page.route('**/rest/system/loglevels', async (route) => {
    if (route.request().method() === 'POST') {
      levels = route.request().postDataJSON();
      writes++;
      return route.fulfill({ status: 200, body: '' });
    }
    await route.fulfill({ json: { levels, packages: { api: 'REST API' } } });
  });
  await page.route('**/rest/system/log*', async (route) => {
    if (route.request().url().includes('loglevels')) return route.fallback();
    reads++;
    await route.fulfill({
      json: {
        messages: [
          {
            when: '2026-09-08T12:00:00.123Z',
            level: 'INFO',
            message: 'literal <script> & log entry',
          },
        ],
      },
    });
  });
  await page.goto('/');
  await page.getByRole('link', { name: /Actions/ }).click();
  await page.getByRole('link', { name: 'Logs', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Logs', exact: true });
  await expect(
    dialog.getByRole('textbox', { name: 'Log', exact: true }),
  ).toHaveValue(/literal <script> & log entry/);
  await dialog
    .getByRole('tab', { name: 'Debugging Facilities', exact: true })
    .click();
  await dialog
    .getByRole('combobox', { name: 'api', exact: true })
    .selectOption('WARN');
  await expect(
    dialog.getByRole('combobox', { name: 'api', exact: true }),
  ).toHaveValue('WARN');
  expect(writes).toBe(1);
  await page.clock.runFor(2200);
  await expect.poll(() => reads).toBe(2);
  await dialog.getByRole('button', { name: /Close/ }).click();
  await expect(dialog).toHaveCount(0);
  const before = reads;
  await page.clock.runFor(2200);
  // A late poll needs a round trip before the route counts it.
  await page.waitForTimeout(500);
  expect(reads).toBe(before);
});

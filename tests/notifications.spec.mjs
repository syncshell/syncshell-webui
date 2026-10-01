import { test, expect } from './playwright-fixtures.mjs';

async function captureConfig(page, edit) {
  let config;
  await page.route('**/rest/config', async (route) => {
    if (route.request().method() === 'PUT') {
      config = route.request().postDataJSON();
      return route.fulfill({ status: 200, body: '' });
    }
    config ||= await edit(await (await route.fetch()).json(), route);
    await route.fulfill({ json: config });
  });
  return () => config;
}

async function createEventPusher(page) {
  let pending,
    id = 2;
  await page.route('**/rest/events?*', async (route) => {
    if (route.request().url().includes('limit='))
      return route.fulfill({ json: [{ id: 1, type: 'Starting', data: {} }] });
    pending = route;
  });
  return async (type, data) => {
    await expect.poll(() => !!pending).toBe(true);
    const route = pending;
    pending = null;
    await route.fulfill({ json: [{ id: id++, type, data }] });
  };
}

test('notification severity changes from danger through warning and success to empty', async ({
  page,
  syncthing,
}) => {
  syncthing.configure();
  const push = await createEventPusher(page);
  const config = await captureConfig(page, (value) => {
    value.gui.user = '';
    value.gui.password = '';
    value.gui.insecureAdminAccess = false;
    value.options.unackedNotificationIDs = ['crAutoDisabled'];
    return value;
  });
  await page.route('**/rest/system/status', async (route) =>
    route.fulfill({
      json: {
        ...(await (await route.fetch()).json()),
        guiAddressUsed: '0.0.0.0:8384',
      },
    }),
  );
  await page.route('**/rest/system/error', (route) =>
    route.fulfill({
      json: {
        errors: [
          { when: '2026-09-08T12:00:00Z', message: 'Temporary test notice' },
        ],
      },
    }),
  );
  await page.route('**/rest/system/error/clear', (route) =>
    route.fulfill({ status: 200, body: '' }),
  );
  await page.goto('/');
  await page.getByRole('tab', { name: /Notifications/ }).click();
  const indicator = page.locator('.notification-indicator');
  await expect(indicator.locator('.text-danger')).toBeVisible();
  await expect(indicator.locator('.text-warning')).toBeHidden();
  await expect(indicator.locator('.text-success')).toBeHidden();
  config().gui.insecureAdminAccess = true;
  await push('ConfigSaved', config());
  await expect(indicator.locator('.text-warning')).toBeVisible();
  const notice = page
    .locator('.notifications .panel')
    .filter({ hasText: 'Temporary test notice' });
  await notice.getByRole('button', { name: /OK/ }).click();
  await expect(indicator.locator('.text-success')).toBeVisible();
  await page
    .locator('.notifications .panel')
    .getByRole('button', { name: /OK/ })
    .click();
  await expect(indicator).toBeHidden();
  await expect(page.locator('.notifications')).toContainText(
    'No pending notifications.',
  );
  config().options.unackedNotificationIDs = ['crAutoDisabled'];
  await push('ConfigSaved', config());
  await expect(indicator.locator('.text-success')).toBeVisible();
});

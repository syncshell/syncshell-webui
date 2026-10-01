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

test('pending encrypted sharing keeps its password across device toggles', async ({
  page,
  syncthing,
}) => {
  syncthing.configure();
  let peer;
  const config = await captureConfig(page, async (value, route) => {
    const status = await (
      await route.fetch({
        url: new URL(
          'system/status',
          route
            .request()
            .url()
            .replace(/config$/, ''),
        ).href,
      })
    ).json();
    peer = value.devices.find((device) => device.deviceID !== status.myID);
    value.folders[0].devices = value.folders[0].devices.filter(
      (member) => member.deviceID === status.myID,
    );
    return value;
  });
  await page.route('**/rest/cluster/pending/folders', async (route) => {
    await expect.poll(() => !!peer).toBe(true);
    await route.fulfill({
      json: {
        'test-folder': {
          offeredBy: {
            [peer.deviceID]: {
              label: 'Encrypted offer',
              remoteEncrypted: true,
              receiveEncrypted: false,
              time: '2026-09-08T12:00:00Z',
            },
          },
        },
      },
    });
  });
  await page.goto('/');
  await page.getByRole('tab', { name: /Notifications/ }).click();
  await page
    .locator('.notifications')
    .getByRole('button', { name: /Share/, exact: false })
    .click();
  const dialog = page.getByRole('dialog', { name: 'Edit Folder', exact: true });
  const input = dialog.getByLabel('Encryption Password: ' + peer.name, {
    exact: true,
  });
  await expect(input).toHaveAttribute('required', '');
  const before = JSON.stringify(config().folders[0]);
  await dialog.getByRole('button', { name: /Save/ }).click();
  expect(JSON.stringify(config().folders[0])).toBe(before);
  const secret = 'test only & <literal> " password';
  await input.fill(secret);
  const selected = dialog.getByRole('checkbox', {
    name: peer.name,
    exact: true,
  });
  await selected.uncheck();
  await selected.check();
  await expect(input).toHaveValue(secret);
  await dialog
    .getByRole('button', { name: 'Show password', exact: true })
    .click();
  await expect(input).toHaveAttribute('type', 'text');
  await dialog
    .getByRole('button', { name: 'Hide password', exact: true })
    .click();
  await dialog.getByRole('button', { name: /Save/ }).click();
  await expect(dialog).toHaveCount(0);
  expect(
    config().folders[0].devices.find(
      (member) => member.deviceID === peer.deviceID,
    ).encryptionPassword,
  ).toBe(secret);
});

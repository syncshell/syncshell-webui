import { chromium, expect } from '@playwright/test';
import { readFile, access } from 'node:fs/promises';
import { after, before, test } from 'node:test';

let base;
let browser;
let device;
let folder;
let key;
let myID;

async function api(path, body) {
  const response = await fetch(base + '/rest/' + path, {
    method: body ? 'PATCH' : 'GET',
    headers: { 'X-API-Key': key, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  expect(response.ok).toBe(true);
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

before(async () => {
  const runtime = process.env.SYNCSHELL_TEST_RUNTIME;
  base = process.env.SYNCSHELL_WEBUI_URL;
  if (!runtime || !base)
    throw new Error('Set SYNCSHELL_TEST_RUNTIME and SYNCSHELL_WEBUI_URL');
  await access(runtime + '/.syncshell-test-fixture');
  const xml = await readFile(runtime + '/home/config.xml', 'utf8');
  key = xml.match(/<apikey>(.*?)<\/apikey>/)[1];
  ({ myID } = await api('system/status'));
  device = await api('config/devices/' + myID);
  folder = await api('config/folders/test-folder');
  browser = await chromium.launch({
    headless: true,
    ...(process.env.SYNCSHELL_CHROMIUM
      ? { executablePath: process.env.SYNCSHELL_CHROMIUM }
      : {}),
  });
});

after(async () => {
  let failure;
  for (const restore of [
    device && (() => api('config/devices/' + myID, { name: device.name })),
    folder &&
      (() => api('config/folders/test-folder', { label: folder.label })),
    browser && (() => browser.close()),
  ].filter(Boolean)) {
    try {
      await restore();
    } catch (error) {
      failure ||= error;
    }
  }
  if (failure) throw failure;
});

test('live configuration saves and refreshes from native events', async () => {
  const page = await browser.newPage();
  await page.goto(base);
  await expect(page.locator('.dashboard-folders .panel-heading')).toBeVisible();
  await page.getByRole('link', { name: /Actions/ }).click();
  await page.getByRole('link', { name: 'Settings', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Settings', exact: true });
  await dialog
    .getByLabel('Device Name', { exact: true })
    .fill('Standalone configuration test');
  await dialog.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  expect((await api('config/devices/' + myID)).name).toBe(
    'Standalone configuration test',
  );
  await page.evaluate(() => {
    window.configurationAcceptance = 'retained';
  });
  await api('config/folders/test-folder', {
    label: 'Updated through native events',
  });
  await expect(page.locator('.dashboard-folders .panel-heading')).toContainText(
    'Updated through native events',
    { timeout: 15000 },
  );
  expect(await page.evaluate(() => window.configurationAcceptance)).toBe(
    'retained',
  );
});

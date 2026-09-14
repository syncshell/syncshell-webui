import { chromium, expect } from '@playwright/test';
import { readFile, access } from 'node:fs/promises';

const runtime = process.env.SYNCSHELL_TEST_RUNTIME;
await access(runtime + '/.syncshell-port-fixture');
const xml = await readFile(runtime + '/home/config.xml', 'utf8');
const key = xml.match(/<apikey>(.*?)<\/apikey>/)[1];
const base = process.env.SYNCSHELL_WEBUI_URL;
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
const { myID } = await api('system/status');
const device = await api('config/devices/' + myID);
const folder = await api('config/folders/port-verification');
const browser = await chromium.launch({
  headless: true,
  ...(process.env.SYNCSHELL_CHROMIUM
    ? { executablePath: process.env.SYNCSHELL_CHROMIUM }
    : {}),
});
try {
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
  await api('config/folders/port-verification', {
    label: 'Updated through native events',
  });
  await expect(page.locator('.dashboard-folders .panel-heading')).toContainText(
    'Updated through native events',
    { timeout: 15000 },
  );
  expect(await page.evaluate(() => window.configurationAcceptance)).toBe(
    'retained',
  );
  console.log('Real configuration save and event-driven refresh passed');
} finally {
  await api('config/devices/' + myID, { name: device.name });
  await api('config/folders/port-verification', { label: folder.label });
  await browser.close();
}

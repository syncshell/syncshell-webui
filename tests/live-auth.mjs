import { chromium, expect } from '@playwright/test';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { after, before, test } from 'node:test';

let browser;
let key;
let original;
let url;

async function api(body) {
  const response = await fetch(url + 'rest/config/gui', {
    method: body ? 'PUT' : 'GET',
    headers: {
      'X-API-Key': key,
      'Content-Type': 'application/json',
      Connection: 'close',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) throw new Error('Authentication fixture API failed');
  const text = await response.text();
  return body ? null : JSON.parse(text);
}

function ignoreListenerRestart() {
  // Applying authentication may close the old GUI listener before it replies.
}
async function setGUI(value) {
  await api(value).catch(ignoreListenerRestart);
  await expect
    .poll(() =>
      api().then(
        (config) => config.user === value.user,
        () => false,
      ),
    )
    .toBe(true);
}

before(async () => {
  const runtime = process.env.SYNCSHELL_TEST_RUNTIME;
  if (!runtime)
    throw new Error('Set SYNCSHELL_TEST_RUNTIME to a disposable fixture');
  await readFile(join(runtime, '.syncshell-test-fixture'));
  const xml = await readFile(join(runtime, 'home/config.xml'), 'utf8');
  key = xml.match(/<apikey>(.*?)<\/apikey>/)[1];
  const address = xml.match(/<gui\b[\s\S]*?<address>(.*?)<\/address>/)[1];
  if (!/^127\.0\.0\.1:\d+$/.test(address))
    throw new Error('Authentication fixture must use loopback');
  url = 'http://' + address + '/';
  original = await api();
  if (original.user)
    throw new Error('Authentication fixture must start without a login user');
  browser = await chromium.launch({
    headless: true,
    ...(process.env.SYNCSHELL_CHROMIUM
      ? { executablePath: process.env.SYNCSHELL_CHROMIUM }
      : {}),
  });
});

after(async () => {
  let failure;
  if (original) {
    try {
      await expect
        .poll(() =>
          api().then(
            () => true,
            () => false,
          ),
        )
        .toBe(true);
      await setGUI(original);
      await expect
        .poll(() =>
          api().then(
            () => true,
            () => false,
          ),
        )
        .toBe(true);
    } catch (error) {
      failure = error;
    }
  }
  try {
    if (browser) await browser.close();
  } catch (error) {
    failure ||= error;
  }
  if (failure) throw failure;
});

test('live authentication rejects bad credentials and accepts the configured login', async () => {
  const password = randomUUID();
  await setGUI({ ...original, user: 'fixture-user', password });
  await expect
    .poll(async () => {
      try {
        const response = await fetch(url + 'meta.js', {
          headers: { Connection: 'close' },
        });
        await response.text();
        return response.status === 403 || response.status === 401;
      } catch {
        return false;
      }
    })
    .toBe(true);
  const page = await browser.newPage();
  await page.goto(url);
  await page.locator('#user:visible').fill('fixture-user');
  await page.locator('#password:visible').fill('incorrect');
  await page.locator('button[type="submit"]:visible').click();
  await expect(page.locator('.login-form-messages')).toContainText('Incorrect');
  await page.locator('#password:visible').fill(password);
  await page.locator('button[type="submit"]:visible').click();
  await expect(
    page.locator('.dashboard-folders .panel-heading').first(),
  ).toBeVisible();
  const output = process.env.SYNCSHELL_TEST_OUTPUT || 'test-results';
  await mkdir(output, { recursive: true });
  await writeFile(
    join(output, 'authentication.json'),
    JSON.stringify(
      {
        result: 'passed',
        checks: [
          'fresh login required',
          'incorrect password refused',
          'correct password hydrates the frontend',
        ],
      },
      null,
      2,
    ) + '\n',
  );
});

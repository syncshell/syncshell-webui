import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { after, before, test } from 'node:test';

let base;
let headers;

async function select(theme) {
  const response = await fetch(base + '/rest/config/gui', {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ theme }),
  }).catch(() => null);
  if (response) assert.ok(response.ok);
  for (let i = 0; i < 50; i++) {
    const html = await fetch(base + '/', { headers })
      .then((r) => (r.ok ? r.text() : ''))
      .catch(() => '');
    if (
      html &&
      (theme === 'syncshell-modern') === html.includes('assets/compiled/')
    )
      return;
    await new Promise((r) => setTimeout(r, 100));
  }
  assert.fail('Theme did not change to ' + theme);
}

before(async () => {
  const xml = await readFile(
    process.env.SYNCSHELL_TEST_RUNTIME + '/home/config.xml',
    'utf8',
  );
  const key = xml.match(/<apikey>(.*?)<\/apikey>/)[1];
  base = process.env.SYNCSHELL_WEBUI_URL;
  headers = {
    'X-API-Key': key,
    'Content-Type': 'application/json',
    Connection: 'close',
  };
});

after(async () => {
  if (headers) await select('syncshell-modern');
});

test('installed themes discover Syncshell and restore the default GUI', async () => {
  const themes = await fetch(base + '/themes.json', { headers }).then((r) =>
    r.json(),
  );
  assert.ok(themes.themes.includes('syncshell-modern'));
  await select('default');
  await select('syncshell-modern');
});

import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const xml = await readFile(process.env.SYNCSHELL_TEST_RUNTIME + '/home/config.xml', 'utf8');
const key = xml.match(/<apikey>(.*?)<\/apikey>/)[1];
const base = process.env.SYNCSHELL_WEBUI_URL;
const headers = {'X-API-Key': key, 'Content-Type': 'application/json', Connection: 'close'};
const themes = await fetch(base + '/themes.json', {headers}).then(r => r.json());
assert.ok(themes.themes.includes('syncshell-modern'));
async function select(theme) {
    const response = await fetch(base + '/rest/config/gui', {
        method: 'PATCH', headers, body: JSON.stringify({theme})}).catch(() => null);
    if (response) assert.ok(response.ok);
    for (let i = 0; i < 50; i++) {
        const html = await fetch(base + '/', {headers})
            .then(r => r.ok ? r.text() : '').catch(() => '');
        if (html && (theme === 'syncshell-modern') === html.includes('assets/compiled/')) return;
        await new Promise(r => setTimeout(r, 100));
    }
    assert.fail('Theme did not change to ' + theme);
}
await select('default');
await select('syncshell-modern');
console.log('Installed theme discovery and default GUI restoration passed');

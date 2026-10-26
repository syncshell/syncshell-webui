import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const contract = JSON.parse(
  await readFile(
    new URL('../integration/host-palette.json', import.meta.url),
    'utf8',
  ),
);
const template = await readFile(
  new URL(`../integration/${contract.template}`, import.meta.url),
  'utf8',
);

test('the host palette contract resolves every template token', () => {
  const placeholders = new Set(
    [...template.matchAll(/{{(\w+)}}/g)].map((match) => match[1]),
  );
  const resolved = new Set([
    ...Object.keys(contract.tokens),
    ...Object.keys(contract.constants),
  ]);
  assert.deepEqual([...placeholders].sort(), [...resolved].sort());
  for (const key of Object.keys(contract.constants))
    assert.ok(!(key in contract.tokens), `${key} is both constant and role`);
});

test('every host role is used and every token names a role', () => {
  assert.equal(contract.format, 1);
  assert.equal(new Set(contract.roles).size, contract.roles.length);
  const used = new Set(Object.values(contract.tokens));
  assert.deepEqual([...used].sort(), [...contract.roles].sort());
});

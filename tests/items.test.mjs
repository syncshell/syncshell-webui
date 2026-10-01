import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  neededItems,
  pageItems,
} from '../app/features/folders/folder-items.mjs';

test('needed items flatten queue groups and name actions from flags', () => {
  const items = neededItems({
    progress: [{ name: 'delete-dir', flags: 20480 }],
    queued: [
      { name: 'delete-file', flags: 4096 },
      { name: 'update-file', flags: 16384 },
    ],
    rest: [{ name: 'sync-file', flags: 0 }],
  });

  assert.deepEqual(
    items.map(({ name, type, action }) => ({ name, type, action })),
    [
      { name: 'delete-dir', type: 'progress', action: 'Del (dir)' },
      { name: 'delete-file', type: 'queued', action: 'Del' },
      { name: 'update-file', type: 'queued', action: 'Update' },
      { name: 'sync-file', type: 'rest', action: 'Sync' },
    ],
  );
});

test('item pages select the list for each dialog kind', () => {
  const data = {
    progress: [{ name: 'needed', flags: 0 }],
    errors: [{ path: 'failed' }],
    files: [{ name: 'local' }],
  };

  assert.deepEqual(pageItems('need', data), [
    { name: 'needed', flags: 0, type: 'progress', action: 'Sync' },
  ]);
  assert.equal(pageItems('failed', data), data.errors);
  assert.equal(pageItems('local', data), data.files);
});

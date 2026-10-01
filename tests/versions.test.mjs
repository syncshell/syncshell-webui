import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  restoreVersionSelection,
  versionDateBounds,
} from '../app/features/versions/versions.mjs';

test('version date bounds reject invalid and reversed ranges', () => {
  assert.equal(versionDateBounds('not-a-date', '').valid, false);
  assert.equal(
    versionDateBounds('2026-09-02T00:00', '2026-09-01T00:00').valid,
    false,
  );
  assert.deepEqual(versionDateBounds('', ''), {
    valid: true,
    minimum: -Infinity,
    maximum: Infinity,
  });
});

test('successful version restoration completes without reloading versions', async () => {
  const calls = [];
  const api = {
    async post(path, body, query) {
      calls.push({ method: 'POST', path, body, query });
      return {};
    },
    async get() {
      throw new Error('versions should not reload after complete restoration');
    },
  };
  const selections = { 'photo.jpg': '2026-09-01T12:00:00Z' };

  const result = await restoreVersionSelection(api, 'photos', selections);

  assert.equal(result.complete, true);
  assert.deepEqual(result.failures, {});
  assert.deepEqual(calls, [
    {
      method: 'POST',
      path: 'folder/versions',
      body: selections,
      query: { folder: 'photos' },
    },
  ]);
});

test('partial version restoration keeps failed selections and reloads', async () => {
  const versions = { 'failed.jpg': [{ versionTime: 'later' }] };
  const api = {
    async post() {
      return { 'failed.jpg': 'permission denied' };
    },
    async get(path, query) {
      assert.equal(path, 'folder/versions');
      assert.deepEqual(query, { folder: 'photos' });
      return versions;
    },
  };

  const result = await restoreVersionSelection(api, 'photos', {
    'restored.jpg': 'newer',
    'failed.jpg': 'older',
  });

  assert.equal(result.complete, false);
  assert.deepEqual(result.failures, { 'failed.jpg': 'permission denied' });
  assert.deepEqual(result.selections, { 'failed.jpg': 'older' });
  assert.equal(result.versions, versions);
});

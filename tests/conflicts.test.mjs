import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  basename,
  folderConflicts,
  listConflicts,
  originalPath,
  parentPath,
  recheckConflicts,
  replaceDirectory,
} from '../client/conflicts.mjs';

const conflictA = 'report.sync-conflict-20260908-120000-ABCDEFG.txt';
const conflictB = 'report.sync-conflict-20260909-130000-HIJKLMN.txt';

function file(overrides = {}) {
  return {
    type: 'FILE_INFO_TYPE_FILE',
    size: 10,
    modified: '2026-09-09T12:00:00Z',
    blocksHash: 'digest',
    ...overrides,
  };
}

function httpError(status, message) {
  return Object.assign(new Error(message), { status });
}

function createConflictApi({ trees = {}, records = {} } = {}) {
  const calls = [];
  return {
    calls,
    async get(path, query, signal) {
      calls.push({ method: 'GET', path, query, signal });
      const value =
        path === 'db/browse'
          ? trees[query.folder]
          : records[`${query.folder}:${query.file}`];
      if (value instanceof Error) throw value;
      if (value === undefined)
        throw new Error(
          `Unexpected ${path} request for ${JSON.stringify(query)}`,
        );
      return value;
    },
    async post(path, body, query, signal) {
      calls.push({ method: 'POST', path, body, query, signal });
    },
  };
}

test('conflict names recover source paths and reject malformed copies', () => {
  assert.equal(parentPath('notes/report.txt'), 'notes');
  assert.equal(parentPath('report.txt'), '');
  assert.equal(basename('notes/report.txt'), 'report.txt');

  assert.equal(originalPath(`notes/${conflictA}`), 'notes/report.txt');
  assert.equal(
    originalPath('archive.tar.sync-conflict-20260908-120000-ABCDEFG.gz'),
    'archive.tar.gz',
  );
  assert.equal(
    originalPath('README.sync-conflict-20260908-120000-ABCDEFG'),
    'README',
  );
  assert.equal(originalPath('ordinary.txt'), null);
  assert.equal(
    originalPath('report.sync-conflict-20260908-120000-abcdefg.txt'),
    null,
  );
  assert.equal(
    originalPath(
      'report.sync-conflict-20260908-120000-ABCDEFG.sync-conflict-20260909-130000-HIJKLMN.txt',
    ),
    null,
  );
});

test('folder conflicts group nested copies and distinguish local availability', async () => {
  const signal = new AbortController().signal;
  const tree = [
    {
      name: 'notes',
      type: 'FILE_INFO_TYPE_DIRECTORY',
      children: [
        { name: conflictA, type: 'FILE_INFO_TYPE_FILE' },
        { name: conflictB, type: 'FILE_INFO_TYPE_FILE' },
        { name: 'ordinary.txt', type: 'FILE_INFO_TYPE_FILE' },
      ],
    },
    {
      name: 'alpha.sync-conflict-20260908-120000-ABCDEFG.txt',
      type: 'FILE_INFO_TYPE_FILE',
    },
    {
      name: 'ignored.sync-conflict-20260908-120000-ABCDEFG.txt',
      type: 'FILE_INFO_TYPE_FILE',
    },
  ];
  const api = createConflictApi({
    trees: { photos: tree },
    records: {
      [`photos:notes/${conflictA}`]: {
        global: file({ size: 20 }),
        local: file({ size: 20, blocksHash: 'local-a' }),
      },
      [`photos:notes/${conflictB}`]: {
        global: file({ size: 30 }),
        local: file({ deleted: true }),
      },
      'photos:notes/report.txt': httpError(404, 'current file missing'),
      'photos:alpha.sync-conflict-20260908-120000-ABCDEFG.txt': {
        global: file({ size: 40 }),
        local: file({ size: 40, blocksHash: 'local-alpha' }),
      },
      'photos:alpha.txt': {
        global: file({ size: 50 }),
        local: file({ size: 50, blocksHash: 'current-alpha' }),
      },
      'photos:ignored.sync-conflict-20260908-120000-ABCDEFG.txt': {
        global: file({ deleted: true }),
        local: file({ deleted: true }),
      },
    },
  });

  const groups = await folderConflicts(
    api,
    { id: 'photos', label: 'Family photos', path: '/srv/photos' },
    { signal },
  );

  assert.deepEqual(
    groups.map((group) => group.path),
    ['alpha.txt', 'notes/report.txt'],
  );
  assert.equal(groups[0].folderName, 'Family photos');
  assert.equal(groups[0].root, '/srv/photos');
  assert.equal(groups[0].current.digest, 'current-alpha');
  assert.equal(groups[1].current, null);
  assert.deepEqual(
    groups[1].copies.map((copy) => [copy.name, copy.available, copy.digest]),
    [
      [conflictB, false, null],
      [conflictA, true, 'local-a'],
    ],
  );
  assert.equal(
    api.calls.some(
      (call) =>
        call.path === 'db/file' && call.query.file === 'notes/ordinary.txt',
    ),
    false,
  );
  assert.equal(
    api.calls.every((call) => call.signal === signal),
    true,
  );
});

test('listing conflicts keeps successful folders and reports failed folders', async () => {
  const copy = 'note.sync-conflict-20260908-120000-ABCDEFG.txt';
  const api = createConflictApi({
    trees: {
      photos: [{ name: copy, type: 'FILE_INFO_TYPE_FILE' }],
      documents: new Error('browse unavailable'),
    },
    records: {
      [`photos:${copy}`]: { global: file(), local: file() },
      'photos:note.txt': httpError(404, 'current file missing'),
    },
  });

  const result = await listConflicts(api, [
    { id: 'photos', label: 'Photos', path: '/srv/photos' },
    { id: 'documents', label: 'Documents', path: '/srv/documents' },
  ]);
  assert.equal(result.groups.length, 1);
  assert.equal(result.groups[0].path, 'note.txt');
  assert.deepEqual(result.errors, ['Documents: browse unavailable']);
});

test('listing conflicts propagates cancellation after folder requests settle', async () => {
  const controller = new AbortController();
  const reason = new Error('conflict request cancelled');
  controller.abort(reason);
  const api = {
    async get() {
      throw reason;
    },
  };

  await assert.rejects(
    listConflicts(
      api,
      [{ id: 'photos', label: 'Photos', path: '/srv/photos' }],
      controller.signal,
    ),
    (error) => error === reason,
  );
});

test('rechecking all folders scans globally and reloads every folder', async () => {
  const signal = new AbortController().signal;
  const api = createConflictApi({
    trees: { photos: [], documents: [] },
  });
  const folders = [
    { id: 'photos', label: 'Photos', path: '/srv/photos' },
    { id: 'documents', label: 'Documents', path: '/srv/documents' },
  ];

  const result = await recheckConflicts(api, folders, null, signal);
  assert.deepEqual(result, { groups: [], errors: [] });
  assert.deepEqual(api.calls[0], {
    method: 'POST',
    path: 'db/scan',
    body: undefined,
    query: {},
    signal,
  });
  assert.deepEqual(
    api.calls
      .filter((call) => call.path === 'db/browse')
      .map((call) => call.query.folder),
    ['photos', 'documents'],
  );
});

test('rechecking one directory scans and reloads only that directory', async () => {
  const signal = new AbortController().signal;
  const api = createConflictApi({ trees: { photos: [] } });
  const folders = [
    { id: 'photos', label: 'Photos', path: '/srv/photos' },
    { id: 'documents', label: 'Documents', path: '/srv/documents' },
  ];
  const group = { folder: 'photos', path: 'notes/report.txt' };

  const result = await recheckConflicts(api, folders, group, signal);
  assert.deepEqual(result, { groups: [], errors: [] });
  assert.deepEqual(api.calls[0], {
    method: 'POST',
    path: 'db/scan',
    body: undefined,
    query: { folder: 'photos', sub: 'notes' },
    signal,
  });
  assert.deepEqual(api.calls[1], {
    method: 'GET',
    path: 'db/browse',
    query: { folder: 'photos', prefix: 'notes' },
    signal,
  });

  await assert.rejects(
    recheckConflicts(api, folders, { folder: 'removed', path: 'old/file.txt' }),
    /Folder is no longer configured/,
  );
});

test('directory replacement keeps siblings and other folders', () => {
  const groups = [
    { id: 'notes-a', folder: 'photos', path: 'notes/a.txt' },
    { id: 'notes-b', folder: 'photos', path: 'notes/deep/b.txt' },
    { id: 'other-dir', folder: 'photos', path: 'notebook/c.txt' },
    { id: 'other-folder', folder: 'documents', path: 'notes/d.txt' },
  ];
  const updated = [{ id: 'updated', folder: 'photos', path: 'notes/new.txt' }];

  assert.deepEqual(
    replaceDirectory(
      groups,
      { folder: 'photos', path: 'notes/report.txt' },
      updated,
    ).map((group) => group.id),
    ['other-dir', 'other-folder', 'updated'],
  );
  assert.deepEqual(
    replaceDirectory(
      groups,
      { folder: 'photos', path: 'report.txt' },
      updated,
    ).map((group) => group.id),
    ['other-folder', 'updated'],
  );
});

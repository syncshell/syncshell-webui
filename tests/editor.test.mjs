import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  editorFieldState,
  folderPath,
  newXattrEntry,
  overlappingPath,
  updateEditor,
  xattrDefault,
  xattrHint,
} from '../client/editor-behavior.mjs';

const folderContext = {
  kind: 'folder',
  isNew: false,
  defaults: false,
  autoPath: false,
  config: { defaults: { folder: { path: '/srv/sync' } } },
  system: { pathSeparator: '/', tilde: '/home/tester' },
};

test('enabling device trust restrictions disables incompatible options', () => {
  const original = {
    deviceID: 'peer',
    untrusted: false,
    introducer: true,
    autoAcceptFolders: true,
  };
  const updated = updateEditor(original, 'untrusted', true, {
    kind: 'device',
  });

  assert.deepEqual(updated, {
    deviceID: 'peer',
    untrusted: true,
    introducer: false,
    autoAcceptFolders: false,
  });
  assert.equal(original.untrusted, false);
  assert.equal(
    editorFieldState({ path: 'introducer' }, updated, {
      kind: 'device',
    }).disabled,
    true,
  );
  assert.equal(
    editorFieldState({ path: 'autoAcceptFolders' }, updated, {
      kind: 'device',
    }).disabled,
    true,
  );
});

test('the local device address field is read only', () => {
  const field = { path: 'addresses' };

  assert.equal(
    editorFieldState(
      field,
      { deviceID: 'local' },
      {
        kind: 'device',
        myID: 'local',
      },
    ).disabled,
    true,
  );
  assert.equal(
    editorFieldState(
      field,
      { deviceID: 'peer' },
      {
        kind: 'device',
        myID: 'local',
      },
    ).disabled,
    false,
  );
});

test('folder types apply watcher, rescan, encryption and indexing defaults', () => {
  const original = {
    type: 'sendreceive',
    fsWatcherEnabled: true,
    rescanIntervalS: 3600,
    ignorePerms: false,
    blockIndexing: true,
    versioning: { type: 'simple', params: { keep: '5' } },
  };
  const encrypted = updateEditor(
    original,
    'type',
    'receiveencrypted',
    folderContext,
  );

  assert.equal(encrypted.fsWatcherEnabled, false);
  assert.equal(encrypted.rescanIntervalS, 86400);
  assert.equal(encrypted.ignorePerms, true);
  assert.equal(encrypted.blockIndexing, true);
  assert.deepEqual(encrypted.versioning, { type: '' });
  assert.equal(original.type, 'sendreceive');

  const newFolderContext = { ...folderContext, isNew: true };
  const sendOnly = updateEditor(original, 'type', 'sendonly', newFolderContext);
  assert.equal(sendOnly.fsWatcherEnabled, true);
  assert.equal(sendOnly.rescanIntervalS, 3600);
  assert.equal(sendOnly.blockIndexing, false);

  const receiveOnly = updateEditor(
    original,
    'type',
    'receiveonly',
    newFolderContext,
  );
  assert.equal(receiveOnly.blockIndexing, true);

  const defaultFolder = updateEditor(original, 'type', 'sendonly', {
    ...folderContext,
    defaults: true,
  });
  assert.equal(defaultFolder.blockIndexing, false);
});

test('watcher changes update standard intervals and leave custom intervals unchanged', () => {
  const standard = updateEditor(
    { type: 'sendreceive', fsWatcherEnabled: true, rescanIntervalS: 3600 },
    'fsWatcherEnabled',
    false,
    folderContext,
  );
  assert.equal(standard.rescanIntervalS, 60);

  const custom = updateEditor(
    { type: 'sendreceive', fsWatcherEnabled: true, rescanIntervalS: 300 },
    'fsWatcherEnabled',
    false,
    folderContext,
  );
  assert.equal(custom.rescanIntervalS, 300);
});

test('new folder names update only an automatic path', () => {
  assert.equal(folderPath('/srv/sync/', 'Photos'), '/srv/sync/Photos');
  assert.equal(
    folderPath('C:\\Users\\tester\\', 'Photos', '\\'),
    'C:\\Users\\tester\\Photos',
  );

  const original = { id: 'photos', label: '', path: '/srv/sync/photos' };
  const automatic = updateEditor(original, 'label', 'Family photos', {
    ...folderContext,
    isNew: true,
    autoPath: true,
  });
  assert.equal(automatic.path, '/srv/sync/Family photos');

  const idFallback = updateEditor(original, 'id', 'new-photos', {
    ...folderContext,
    isNew: true,
    autoPath: true,
  });
  assert.equal(idFallback.path, '/srv/sync/new-photos');

  const explicit = updateEditor(original, 'label', 'Family photos', {
    ...folderContext,
    isNew: true,
    autoPath: false,
  });
  assert.equal(explicit.path, '/srv/sync/photos');
});

test('folder fields reflect type, versioning and ownership restrictions', () => {
  const typeOptions = [
    ['sendreceive', 'Send & Receive'],
    ['receiveencrypted', 'Receive Encrypted'],
  ];
  const existingType = editorFieldState(
    { path: 'type', options: typeOptions },
    { type: 'sendreceive' },
    { kind: 'folder', isNew: false, defaults: false },
  );
  assert.equal(existingType.disabled, false);
  assert.deepEqual(existingType.options, [['sendreceive', 'Send & Receive']]);

  const encryptedType = editorFieldState(
    { path: 'type', options: typeOptions },
    { type: 'receiveencrypted' },
    { kind: 'folder', isNew: false, defaults: false },
  );
  assert.equal(encryptedType.disabled, true);
  assert.deepEqual(encryptedType.options, typeOptions);

  const encrypted = { type: 'receiveencrypted', versioning: { type: '' } };
  for (const path of [
    'fsWatcherEnabled',
    'ignorePerms',
    'versioning.type',
    'syncOwnership',
    'syncXattrs',
    'sendOwnership',
    'sendXattrs',
  ]) {
    assert.equal(
      editorFieldState({ path }, encrypted, { kind: 'folder' }).disabled,
      true,
      path,
    );
  }

  assert.equal(
    editorFieldState({ path: 'versioning.fsPath' }, encrypted, {
      kind: 'folder',
    }).hidden,
    true,
  );
  assert.equal(
    Boolean(
      editorFieldState(
        { path: 'versioning.fsPath' },
        { type: 'sendreceive', versioning: { type: 'simple' } },
        { kind: 'folder' },
      ).hidden,
    ),
    false,
  );

  const ownership = editorFieldState(
    { path: 'sendOwnership' },
    { type: 'sendreceive', sendOwnership: false, syncOwnership: true },
    { kind: 'folder' },
  );
  assert.equal(ownership.disabled, true);
  assert.equal(ownership.checked, true);

  for (const [draft, path] of [
    [{ type: 'sendonly' }, 'order'],
    [{ type: 'sendonly' }, 'syncOwnership'],
    [{ type: 'sendonly' }, 'syncXattrs'],
    [{ type: 'receiveonly' }, 'sendOwnership'],
    [{ type: 'receiveonly' }, 'sendXattrs'],
  ]) {
    assert.equal(
      editorFieldState({ path }, draft, { kind: 'folder' }).disabled,
      true,
      `${draft.type} ${path}`,
    );
  }
});

test('extended attribute rules insert before wildcard and explain the default', () => {
  const wildcard = { match: '*', permit: true };
  assert.deepEqual(newXattrEntry([wildcard]), [
    { match: '', permit: false },
    wildcard,
  ]);

  const unfinished = [{ match: '', permit: false }];
  assert.deepEqual(newXattrEntry(unfinished), unfinished);
  assert.equal(xattrDefault([]), 'permit');
  assert.equal(xattrDefault([{ match: 'user.*', permit: false }]), 'deny');
  assert.equal(xattrDefault([wildcard]), '');
  assert.match(
    xattrHint([{ match: 'user.secret.*', permit: false }]),
    /only deny-rules detected/,
  );
  assert.equal(
    xattrHint([
      { match: 'user.secret.*', permit: false },
      { match: '*', permit: true },
    ]),
    '',
  );

  assert.equal(
    editorFieldState(
      { path: 'xattrFilter.maxTotalSize' },
      { type: 'sendreceive', syncXattrs: false, sendXattrs: false },
      { kind: 'folder' },
    ).hidden,
    true,
  );
  assert.equal(
    Boolean(
      editorFieldState(
        { path: 'xattrFilter.maxTotalSize' },
        { type: 'sendreceive', syncXattrs: true, sendXattrs: false },
        { kind: 'folder' },
      ).hidden,
    ),
    false,
  );
});

test('overlapping paths distinguish parents, children and the edited folder', () => {
  const config = {
    folders: [
      { id: 'root', label: 'Root', path: '/srv/sync' },
      { id: 'nested', label: 'Nested', path: '/srv/archive/photos/' },
      { id: 'home', label: 'Home', path: '/home/tester' },
      { id: 'similar', label: 'Similar', path: '/srv/sync-backup' },
    ],
  };
  const system = { pathSeparator: '/', tilde: '/home/tester' };

  assert.deepEqual(
    overlappingPath({ id: 'new', path: '/srv/sync/photos' }, config, system),
    { folder: config.folders[0], type: 'subdirectory' },
  );
  assert.deepEqual(
    overlappingPath({ id: 'new', path: '/srv/archive' }, config, system),
    { folder: config.folders[1], type: 'parent directory' },
  );
  assert.deepEqual(
    overlappingPath({ id: 'new', path: '~/photos' }, config, system),
    { folder: config.folders[2], type: 'subdirectory' },
  );
  assert.equal(
    overlappingPath({ id: 'root', path: '/srv/sync' }, config, system),
    null,
  );
  assert.equal(
    overlappingPath({ id: 'new', path: '/srv/other' }, config, system),
    null,
  );
});

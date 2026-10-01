import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  cloneConfig,
  getValue,
  setValue,
} from '../app/core/config/configValues.mjs';
import { changedValue, inputValue } from '../client/edit.mjs';
import { ignoreLines } from '../app/features/folders/folderIgnorePatterns.mjs';
import {
  folderEditorFieldState,
  folderPath,
  newXattrEntry,
  newFolderSavePhases,
  normalizeFolderEditor,
  overlappingPath,
  prepareFolderEditorAction,
  reduceFolderDraft,
  reduceNewFolderSavePhase,
  saveFolderEditor,
  xattrDefault,
  xattrHint,
} from '../app/features/folders/folder-editor.mjs';
import {
  deviceEditorFieldState,
  prepareDeviceEditorAction,
  reduceDeviceDraft,
  saveDeviceEditor,
} from '../app/features/devices/device-editor.mjs';

const folderContext = {
  isNew: false,
  defaults: false,
  autoPath: false,
  config: { defaults: { folder: { path: '/srv/sync' } } },
  system: { pathSeparator: '/', tilde: '/home/tester' },
};

function editorConfig() {
  return {
    folders: [
      {
        id: 'photos',
        label: 'Photos',
        path: '/srv/photos',
        type: 'sendreceive',
        devices: [
          { deviceID: 'LOCAL' },
          { deviceID: 'PEER', encryptionPassword: 'old-password' },
        ],
      },
      {
        id: 'archive',
        label: 'Archive',
        path: '/srv/archive',
        type: 'sendreceive',
        devices: [{ deviceID: 'LOCAL' }],
      },
      {
        id: 'removed-share',
        label: 'Removed share',
        path: '/srv/removed',
        type: 'sendreceive',
        devices: [{ deviceID: 'LOCAL' }, { deviceID: 'PEER' }],
      },
    ],
    devices: [
      { deviceID: 'LOCAL', name: 'This device' },
      { deviceID: 'PEER', name: 'Peer' },
    ],
    defaults: {
      folder: {},
      device: {},
      ignores: { lines: [] },
    },
    options: {},
    gui: {},
  };
}

function createSaveFixture({
  config = editorConfig(),
  pendingFolders = {},
  deviceCheck,
} = {}) {
  const calls = [];
  let savedConfig;
  const api = {
    async get(path, { query } = {}) {
      calls.push({ path, query });
      if (path !== 'svc/deviceid')
        throw new Error(`Unexpected request: ${path}`);
      return deviceCheck || { id: query.id };
    },
  };
  const session = {
    async changeConfig(edit) {
      const next = cloneConfig(config);
      edit(next);
      savedConfig = next;
      return next;
    },
  };
  return {
    api,
    calls,
    savedConfig: () => savedConfig,
    session,
    state: {
      config,
      pendingFolders,
      system: { myID: 'LOCAL' },
    },
  };
}

function folderDraft(overrides = {}) {
  return {
    id: 'new-folder',
    label: 'New folder',
    path: '/srv/new-folder',
    type: 'sendreceive',
    devices: [{ deviceID: 'LOCAL' }],
    versioning: { type: '' },
    ...overrides,
  };
}

async function saveFolder(fixture, draft, overrides = {}) {
  return saveFolderEditor({
    session: fixture.session,
    state: fixture.state,
    draft,
    isNew: true,
    ...overrides,
  });
}

async function saveDevice(fixture, draft, overrides = {}) {
  return saveDeviceEditor({
    session: fixture.session,
    api: fixture.api,
    state: fixture.state,
    draft,
    isNew: true,
    shares: {},
    ...overrides,
  });
}

test('configuration values are cloned before a dotted path is changed', () => {
  const original = {
    label: 'Photos',
    versioning: { type: 'simple', params: { keep: '5' } },
    devices: [{ deviceID: 'local' }],
  };

  const cloned = cloneConfig(original);
  cloned.devices[0].deviceID = 'changed';
  assert.equal(original.devices[0].deviceID, 'local');
  assert.equal(getValue(original, 'versioning.params.keep'), '5');
  assert.equal(getValue(original, 'versioning.params.missing'), undefined);

  const updated = setValue(original, 'versioning.params.keep', '10');
  assert.equal(updated.versioning.params.keep, '10');
  assert.equal(original.versioning.params.keep, '5');

  const added = setValue(original, 'xattrFilter.maxTotalSize', 4096);
  assert.deepEqual(added.xattrFilter, { maxTotalSize: 4096 });
  assert.equal(original.xattrFilter, undefined);
});

test('selecting versioning supplies defaults without replacing existing values', () => {
  const original = {
    versioning: {
      type: '',
      params: { cleanoutDays: '30' },
      cleanupIntervalS: 1800,
      fsPath: '/srv/versions',
    },
  };
  const simple = reduceFolderDraft(
    original,
    { type: 'set-folder-versioning-type', value: 'simple' },
    folderContext,
  );
  assert.deepEqual(simple.versioning, {
    type: 'simple',
    params: { keep: '5', cleanoutDays: '30' },
    cleanupIntervalS: 1800,
    fsPath: '/srv/versions',
  });
  assert.equal(original.versioning.type, '');

  const staggered = reduceFolderDraft(
    {},
    { type: 'set-folder-versioning-type', value: 'staggered' },
    folderContext,
  );
  assert.deepEqual(staggered.versioning, {
    type: 'staggered',
    params: { maxAge: String(365 * 86400) },
    cleanupIntervalS: 3600,
    fsPath: '',
  });

  const external = reduceFolderDraft(
    {},
    { type: 'set-folder-versioning-type', value: 'external' },
    folderContext,
  );
  assert.deepEqual(external.versioning.params, { command: '' });
});

test('form values convert according to their field type', () => {
  const draft = {
    addresses: ['dynamic', 'tcp://192.0.2.1:22000'],
    enabled: false,
    count: 4,
  };
  assert.equal(
    inputValue(draft, { path: 'addresses', type: 'list' }),
    'dynamic, tcp://192.0.2.1:22000',
  );
  assert.equal(inputValue(draft, { path: 'missing', type: 'text' }), '');

  assert.equal(changedValue({ type: 'checkbox' }, { checked: true }), true);
  assert.equal(changedValue({ type: 'number' }, { value: '' }), 0);
  assert.equal(changedValue({ type: 'number' }, { value: '12.5' }), 12.5);
  assert.ok(Number.isNaN(changedValue({ type: 'number' }, { value: 'bad' })));
  assert.deepEqual(
    changedValue(
      { type: 'list' },
      { value: 'dynamic, tcp://192.0.2.1:22000  quic://host:22000' },
    ),
    ['dynamic', 'tcp://192.0.2.1:22000', 'quic://host:22000'],
  );
  assert.equal(
    changedValue({ type: 'text' }, { value: ' Photos ' }),
    ' Photos ',
  );
});

test('ignore text keeps intentional empty and trailing lines', () => {
  assert.deepEqual(ignoreLines(''), []);
  assert.deepEqual(ignoreLines('*.tmp\n\n# keep\n'), [
    '*.tmp',
    '',
    '# keep',
    '',
  ]);
});

test('new folder ignore persistence exposes loading and retry phases', () => {
  let phase = newFolderSavePhases.editing;
  phase = reduceNewFolderSavePhase(phase, 'start-ignore-load');
  assert.equal(phase, newFolderSavePhases.loadingIgnores);

  phase = reduceNewFolderSavePhase(phase, 'ignore-load-failed');
  assert.equal(phase, newFolderSavePhases.ignoreLoadFailed);

  phase = reduceNewFolderSavePhase(phase, 'start-ignore-load');
  phase = reduceNewFolderSavePhase(phase, 'ignore-load-succeeded');
  assert.equal(phase, newFolderSavePhases.editingIgnores);
});

test('new editor actions prepare domain defaults without changing requests', async () => {
  const requests = [];
  const api = {
    async get(path, { query } = {}) {
      requests.push({ path, query });
      if (path === 'config/defaults/device') return { addresses: ['dynamic'] };
      if (path === 'config/defaults/folder') {
        return { type: 'sendreceive', fsWatcherEnabled: true };
      }
      return { random: 'ABCDEFGHIJ' };
    },
  };
  const deviceRequest = {
    type: 'add-device',
    device: 'PEER',
    pending: { name: 'New peer' },
  };
  const deviceAction = await prepareDeviceEditorAction(api, deviceRequest);
  assert.equal(deviceAction.device.deviceID, 'PEER');
  assert.equal(deviceAction.device.name, 'New peer');
  assert.equal(deviceRequest.device, 'PEER');

  const folderRequest = {
    type: 'add-folder',
    device: 'PEER',
    pending: { label: 'Encrypted offer' },
  };
  const folderAction = await prepareFolderEditorAction(
    api,
    {
      config: { defaults: { folder: {} } },
      system: { myID: 'LOCAL', pathSeparator: '/' },
      pendingFolders: {
        'abcde-fghij': {
          offeredBy: { PEER: { receiveEncrypted: true } },
        },
      },
    },
    folderRequest,
  );
  assert.equal(folderAction.folder.id, 'abcde-fghij');
  assert.equal(folderAction.folder.type, 'receiveencrypted');
  assert.deepEqual(folderAction.folder.devices, [
    { deviceID: 'LOCAL' },
    { deviceID: 'PEER' },
  ]);
  assert.equal(folderRequest.folder, undefined);
  assert.deepEqual(requests.at(-1), {
    path: 'svc/random/string',
    query: { length: 10 },
  });
});

test('folder normalization removes unfinished attribute rules from a clone', () => {
  const draft = {
    id: 'photos',
    xattrFilter: {
      entries: [
        { match: 'user.*', permit: true },
        { match: '', permit: false },
      ],
    },
    versioning: {
      type: 'simple',
      params: { keep: '5', cleanoutDays: '0' },
    },
  };

  const normalized = normalizeFolderEditor(draft);
  assert.deepEqual(normalized.xattrFilter.entries, [
    { match: 'user.*', permit: true },
  ]);
  assert.equal(draft.xattrFilter.entries.length, 2);
});

test('folder normalization rejects invalid versioning boundaries', () => {
  for (const keep of ['', '0', '-1', 'not-a-number']) {
    assert.throws(
      () =>
        normalizeFolderEditor({
          versioning: {
            type: 'simple',
            params: { keep, cleanoutDays: '0' },
          },
        }),
      /keep at least one version/,
      `keep=${keep}`,
    );
  }

  for (const [type, params] of [
    ['simple', { keep: '5', cleanoutDays: '-1' }],
    ['trashcan', { cleanoutDays: '' }],
    ['staggered', { maxAge: 'not-a-number' }],
  ]) {
    assert.throws(
      () => normalizeFolderEditor({ versioning: { type, params } }),
      /negative number of days/,
      type,
    );
  }

  assert.doesNotThrow(() =>
    normalizeFolderEditor({
      versioning: { type: 'external', params: { command: '' } },
    }),
  );
});

test('saving defaults normalizes folder rules and keeps ignore lines', async () => {
  const fixture = createSaveFixture();
  await saveFolder(
    fixture,
    {
      label: 'Future folders',
      xattrFilter: {
        entries: [
          { match: 'user.*', permit: true },
          { match: '', permit: false },
        ],
      },
      versioning: { type: '' },
    },
    { defaults: true, ignores: ['*.tmp', '', '# keep empty line'] },
  );

  assert.deepEqual(fixture.savedConfig().defaults.folder.xattrFilter.entries, [
    { match: 'user.*', permit: true },
  ]);
  assert.deepEqual(fixture.savedConfig().defaults.ignores.lines, [
    '*.tmp',
    '',
    '# keep empty line',
  ]);

  const deviceDefaults = createSaveFixture();
  await saveDevice(
    deviceDefaults,
    { name: 'Future peers', addresses: ['dynamic'] },
    { isNew: false, defaults: true },
  );
  assert.deepEqual(deviceDefaults.savedConfig().defaults.device, {
    name: 'Future peers',
    addresses: ['dynamic'],
  });
  assert.deepEqual(deviceDefaults.calls, []);
});

test('folder saves reject blank, duplicate and incomplete versioning values', async () => {
  const fixture = createSaveFixture();
  for (const [draft, message] of [
    [folderDraft({ id: ' ' }), /folder ID cannot be blank/],
    [folderDraft({ path: ' ' }), /folder path cannot be blank/],
    [folderDraft({ id: 'photos' }), /folder ID must be unique/],
    [
      folderDraft({
        versioning: { type: 'external', params: { command: ' ' } },
      }),
      /External Versioning Command cannot be blank/,
    ],
  ]) {
    await assert.rejects(saveFolder(fixture, draft), message);
  }
  assert.equal(fixture.savedConfig(), undefined);
});

test('folder saves add the local device and replace the matching folder', async () => {
  const fixture = createSaveFixture();
  await saveFolder(
    fixture,
    folderDraft({
      id: 'photos',
      label: 'Updated photos',
      devices: [],
      versioning: undefined,
    }),
    { isNew: false },
  );

  const saved = fixture.savedConfig();
  assert.equal(
    saved.folders.filter((folder) => folder.id === 'photos').length,
    1,
  );
  const photos = saved.folders.find((folder) => folder.id === 'photos');
  assert.equal(photos.label, 'Updated photos');
  assert.deepEqual(photos.devices, [{ deviceID: 'LOCAL' }]);
  assert.deepEqual(photos.versioning, { type: '' });
});

test('folder saves require passwords for untrusted or encrypted offers', async () => {
  const untrustedConfig = editorConfig();
  untrustedConfig.devices.find(
    (device) => device.deviceID === 'PEER',
  ).untrusted = true;
  const untrusted = createSaveFixture({ config: untrustedConfig });
  const shared = folderDraft({
    devices: [{ deviceID: 'LOCAL' }, { deviceID: 'PEER' }],
  });
  await assert.rejects(
    saveFolder(untrusted, shared),
    /Encryption Password is required for an untrusted device/,
  );

  const pending = createSaveFixture({
    pendingFolders: {
      'new-folder': {
        offeredBy: { PEER: { remoteEncrypted: true } },
      },
    },
  });
  await assert.rejects(
    saveFolder(pending, shared),
    /Encryption Password is required for an untrusted device/,
  );

  await saveFolder(
    untrusted,
    folderDraft({
      devices: [
        { deviceID: 'LOCAL' },
        { deviceID: 'PEER', encryptionPassword: 'secret' },
      ],
    }),
  );
  assert.equal(
    untrusted
      .savedConfig()
      .folders.find((folder) => folder.id === 'new-folder')
      .devices.find((device) => device.deviceID === 'PEER').encryptionPassword,
    'secret',
  );

  const encryptedFolder = createSaveFixture({ config: untrustedConfig });
  await saveFolder(
    encryptedFolder,
    folderDraft({
      type: 'receiveencrypted',
      devices: [{ deviceID: 'LOCAL' }, { deviceID: 'PEER' }],
    }),
  );
  assert.ok(encryptedFolder.savedConfig());
});

test('device saves validate IDs and reject duplicate new devices', async () => {
  const invalid = createSaveFixture({
    deviceCheck: { error: 'device ID is invalid' },
  });
  await assert.rejects(
    saveDevice(invalid, { deviceID: 'invalid', name: 'Invalid' }),
    /device ID is invalid/,
  );

  const duplicate = createSaveFixture({ deviceCheck: { id: 'PEER' } });
  await assert.rejects(
    saveDevice(duplicate, { deviceID: 'peer', name: 'Duplicate' }),
    /device with that ID is already added/,
  );
  assert.deepEqual(duplicate.calls, [
    { path: 'svc/deviceid', query: { id: 'peer' } },
  ]);
});

test('device saves require encrypted-share passwords before changing config', async () => {
  const fixture = createSaveFixture();
  await assert.rejects(
    saveDevice(
      fixture,
      { deviceID: 'NEW-PEER', name: 'New peer', untrusted: true },
      {
        shares: {
          photos: { selected: true, password: '' },
        },
      },
    ),
    /Encryption Password is required for an untrusted device/,
  );
  assert.equal(fixture.savedConfig(), undefined);
});

test('device saves replace the device and update every folder share', async () => {
  const fixture = createSaveFixture({ deviceCheck: { id: 'PEER' } });
  await saveDevice(
    fixture,
    { deviceID: 'peer', name: 'Renamed peer', untrusted: false },
    {
      isNew: false,
      shares: {
        photos: { selected: true, password: 'new-password' },
        archive: { selected: true, password: '' },
        'removed-share': { selected: false, password: '' },
      },
    },
  );

  const saved = fixture.savedConfig();
  assert.equal(
    saved.devices.filter((device) => device.deviceID === 'PEER').length,
    1,
  );
  assert.equal(
    saved.devices.find((device) => device.deviceID === 'PEER').name,
    'Renamed peer',
  );
  assert.deepEqual(
    saved.folders
      .find((folder) => folder.id === 'photos')
      .devices.find((device) => device.deviceID === 'PEER'),
    { deviceID: 'PEER', encryptionPassword: 'new-password' },
  );
  assert.deepEqual(
    saved.folders
      .find((folder) => folder.id === 'archive')
      .devices.find((device) => device.deviceID === 'PEER'),
    { deviceID: 'PEER', encryptionPassword: '' },
  );
  assert.equal(
    saved.folders
      .find((folder) => folder.id === 'removed-share')
      .devices.some((device) => device.deviceID === 'PEER'),
    false,
  );
});

test('enabling device trust restrictions disables incompatible options', () => {
  const original = {
    deviceID: 'peer',
    untrusted: false,
    introducer: true,
    autoAcceptFolders: true,
  };
  const updated = reduceDeviceDraft(original, {
    type: 'set-device-untrusted',
    value: true,
  });

  assert.deepEqual(updated, {
    deviceID: 'peer',
    untrusted: true,
    introducer: false,
    autoAcceptFolders: false,
  });
  assert.equal(original.untrusted, false);
  assert.equal(
    deviceEditorFieldState({ path: 'introducer' }, updated).disabled,
    true,
  );
  assert.equal(
    deviceEditorFieldState({ path: 'autoAcceptFolders' }, updated).disabled,
    true,
  );
});

test('the local device address field is read only', () => {
  const field = { path: 'addresses' };

  assert.equal(
    deviceEditorFieldState(field, { deviceID: 'local' }, 'local').disabled,
    true,
  );
  assert.equal(
    deviceEditorFieldState(field, { deviceID: 'peer' }, 'local').disabled,
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
  const encrypted = reduceFolderDraft(
    original,
    { type: 'set-folder-type', value: 'receiveencrypted' },
    folderContext,
  );

  assert.equal(encrypted.fsWatcherEnabled, false);
  assert.equal(encrypted.rescanIntervalS, 86400);
  assert.equal(encrypted.ignorePerms, true);
  assert.equal(encrypted.blockIndexing, true);
  assert.deepEqual(encrypted.versioning, { type: '' });
  assert.equal(original.type, 'sendreceive');

  const newFolderContext = { ...folderContext, isNew: true };
  const sendOnly = reduceFolderDraft(
    original,
    { type: 'set-folder-type', value: 'sendonly' },
    newFolderContext,
  );
  assert.equal(sendOnly.fsWatcherEnabled, true);
  assert.equal(sendOnly.rescanIntervalS, 3600);
  assert.equal(sendOnly.blockIndexing, false);

  const receiveOnly = reduceFolderDraft(
    original,
    { type: 'set-folder-type', value: 'receiveonly' },
    newFolderContext,
  );
  assert.equal(receiveOnly.blockIndexing, true);

  const defaultFolder = reduceFolderDraft(
    original,
    { type: 'set-folder-type', value: 'sendonly' },
    { ...folderContext, defaults: true },
  );
  assert.equal(defaultFolder.blockIndexing, false);
});

test('watcher changes update standard intervals and leave custom intervals unchanged', () => {
  const standard = reduceFolderDraft(
    { type: 'sendreceive', fsWatcherEnabled: true, rescanIntervalS: 3600 },
    { type: 'set-folder-watcher', value: false },
    folderContext,
  );
  assert.equal(standard.rescanIntervalS, 60);

  const custom = reduceFolderDraft(
    { type: 'sendreceive', fsWatcherEnabled: true, rescanIntervalS: 300 },
    { type: 'set-folder-watcher', value: false },
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
  const automatic = reduceFolderDraft(
    original,
    { type: 'set-folder-label', value: 'Family photos' },
    { ...folderContext, isNew: true, autoPath: true },
  );
  assert.equal(automatic.path, '/srv/sync/Family photos');

  const idFallback = reduceFolderDraft(
    original,
    { type: 'set-folder-id', value: 'new-photos' },
    { ...folderContext, isNew: true, autoPath: true },
  );
  assert.equal(idFallback.path, '/srv/sync/new-photos');

  const explicit = reduceFolderDraft(
    original,
    { type: 'set-folder-label', value: 'Family photos' },
    { ...folderContext, isNew: true, autoPath: false },
  );
  assert.equal(explicit.path, '/srv/sync/photos');
});

test('folder fields reflect type, versioning and ownership restrictions', () => {
  const typeOptions = [
    { value: 'sendreceive', label: 'Send & Receive' },
    { value: 'receiveencrypted', label: 'Receive Encrypted' },
  ];
  const existingType = folderEditorFieldState(
    { path: 'type', options: typeOptions },
    { type: 'sendreceive' },
    { isNew: false, defaults: false },
  );
  assert.equal(existingType.disabled, false);
  assert.deepEqual(existingType.options, [
    { value: 'sendreceive', label: 'Send & Receive' },
  ]);

  const encryptedType = folderEditorFieldState(
    { path: 'type', options: typeOptions },
    { type: 'receiveencrypted' },
    { isNew: false, defaults: false },
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
      folderEditorFieldState({ path }, encrypted, {}).disabled,
      true,
      path,
    );
  }

  assert.equal(
    folderEditorFieldState({ path: 'versioning.fsPath' }, encrypted, {}).hidden,
    true,
  );
  assert.equal(
    Boolean(
      folderEditorFieldState(
        { path: 'versioning.fsPath' },
        { type: 'sendreceive', versioning: { type: 'simple' } },
        {},
      ).hidden,
    ),
    false,
  );

  const ownership = folderEditorFieldState(
    { path: 'sendOwnership' },
    { type: 'sendreceive', sendOwnership: false, syncOwnership: true },
    {},
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
      folderEditorFieldState({ path }, draft, {}).disabled,
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
    folderEditorFieldState(
      { path: 'xattrFilter.maxTotalSize' },
      { type: 'sendreceive', syncXattrs: false, sendXattrs: false },
      {},
    ).hidden,
    true,
  );
  assert.equal(
    Boolean(
      folderEditorFieldState(
        { path: 'xattrFilter.maxTotalSize' },
        { type: 'sendreceive', syncXattrs: true, sendXattrs: false },
        {},
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

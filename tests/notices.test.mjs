import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  noticeAction,
  notices,
} from '../app/features/notifications/notices.mjs';

const localID = 'LOCAL-DEVICE';
const peerID = 'PEER-DEVICE';

function noticeState() {
  return {
    config: {
      folders: [
        {
          id: 'photos',
          label: 'Photos',
          path: '/srv/photos',
          type: 'sendreceive',
          fsWatcherEnabled: true,
          paused: false,
          devices: [{ deviceID: localID }],
        },
      ],
      devices: [
        { deviceID: localID, name: 'This device' },
        { deviceID: peerID, name: 'Laptop' },
      ],
      gui: {},
      options: { unackedNotificationIDs: [] },
    },
    system: { guiAddressUsed: '127.0.0.1:8384' },
    configInSync: true,
    pendingDevices: {},
    pendingFolders: {},
    errors: [],
    seenError: '',
    model: {},
  };
}

function createActionFixture(config = noticeState().config) {
  const calls = [];
  const opened = [];
  const session = {
    async changeConfig(edit) {
      edit(config);
      calls.push({ method: 'changeConfig' });
    },
    async clearErrors() {
      calls.push({ method: 'clearErrors' });
    },
    async dismissNotification(id) {
      calls.push({ method: 'dismissNotification', id });
    },
    async dismissPending(device, folder) {
      calls.push({ method: 'dismissPending', device, folder });
    },
    async ignorePending(device, folder, pending) {
      calls.push({ method: 'ignorePending', device, folder, pending });
    },
  };
  function open(request) {
    opened.push(request);
  }
  return { calls, config, open, opened, session };
}

test('remote unauthenticated access and unsaved config create urgent cards', () => {
  const state = noticeState();
  state.system.guiAddressUsed = '0.0.0.0:8384';
  state.configInSync = false;

  const cards = notices(state);
  assert.deepEqual(
    cards.map((card) => [card.id, card.severity, card.actions]),
    [
      ['openNoAuth', 'danger', ['Settings']],
      ['restart', 'warning', ['Restart']],
    ],
  );

  state.config.gui = { user: 'admin', password: 'secret' };
  assert.equal(
    notices(state).some((card) => card.id === 'openNoAuth'),
    false,
  );
  state.config.gui = { insecureAdminAccess: true };
  assert.equal(
    notices(state).some((card) => card.id === 'openNoAuth'),
    false,
  );
});

test('acknowledgement cards honor authentication and known definitions', () => {
  const state = noticeState();
  state.config.options.unackedNotificationIDs = [
    'channelNotification',
    'authenticationUserAndPassword',
    'unknown-notification',
  ];

  let cards = notices(state);
  assert.deepEqual(
    cards.map((card) => card.id),
    ['channelNotification', 'authenticationUserAndPassword'],
  );
  assert.equal(cards[0].params.syncthingInotify, 'syncthing-inotify');

  state.config.gui = { authMode: 'ldap' };
  cards = notices(state);
  assert.deepEqual(
    cards.map((card) => card.id),
    ['channelNotification'],
  );
});

test('pending devices and folders become named action cards', () => {
  const state = noticeState();
  state.pendingDevices[peerID] = {
    name: 'Laptop',
    address: '192.0.2.10:22000',
    time: '2026-09-09T12:00:00Z',
  };
  state.pendingFolders = {
    photos: {
      offeredBy: {
        [peerID]: {
          label: 'Shared photos',
          time: '2026-09-09T12:01:00Z',
        },
      },
    },
    documents: {
      offeredBy: {
        [peerID]: {
          label: 'Documents',
          time: '2026-09-09T12:02:00Z',
        },
      },
    },
  };

  const cards = notices(state);
  const device = cards.find((card) => card.id === `device-${peerID}`);
  assert.equal(device.title, 'New Device');
  assert.deepEqual(device.actions, ['Add Device', 'Ignore', 'Dismiss']);
  assert.equal(device.params.address, '192.0.2.10:22000');

  const existing = cards.find((card) => card.id === `folder-photos-${peerID}`);
  assert.equal(existing.title, 'Share Folder');
  assert.deepEqual(existing.actions, ['Share', 'Ignore', 'Dismiss']);
  assert.equal(existing.folderConfig, state.config.folders[0]);
  assert.equal(existing.params.device, 'Laptop');

  const offered = cards.find(
    (card) => card.id === `folder-documents-${peerID}`,
  );
  assert.equal(offered.title, 'New Folder');
  assert.deepEqual(offered.actions, ['Add', 'Ignore', 'Dismiss']);
  assert.equal(offered.folderConfig, undefined);
});

test('daemon errors and active watcher failures become warning cards', () => {
  const state = noticeState();
  state.seenError = '2026-09-09T11:30:00Z';
  state.errors = [
    {
      when: '2026-09-09T11:00:00Z',
      message: `old error from ${peerID}`,
    },
    {
      when: '2026-09-09T12:00:00Z',
      message: `new error from ${peerID}`,
    },
  ];
  state.model.photos = {
    state: 'idle',
    errors: 0,
    needTotalItems: 0,
    receiveOnlyTotalItems: 0,
    watchError: 'too many open files',
  };
  state.config.folders.push(
    {
      id: 'stopped',
      label: 'Stopped',
      type: 'sendreceive',
      fsWatcherEnabled: true,
      paused: false,
      devices: [{ deviceID: localID }],
    },
    {
      id: 'paused',
      label: 'Paused',
      type: 'sendreceive',
      fsWatcherEnabled: true,
      paused: true,
      devices: [{ deviceID: localID }],
    },
  );
  state.model.stopped = { state: 'error', watchError: 'permission denied' };
  state.model.paused = { state: 'idle', watchError: 'not mounted' };

  const cards = notices(state);
  const errors = cards.find((card) => card.id === 'errors');
  assert.deepEqual(errors.errors, [
    {
      when: '2026-09-09T12:00:00Z',
      message: 'new error from Laptop',
    },
  ]);
  const watchers = cards.find((card) => card.id === 'watchers');
  assert.deepEqual(watchers.watchers, [
    { name: 'Photos', error: 'too many open files' },
  ]);
  assert.deepEqual(watchers.actions, []);
});

test('basic notification actions route to dialogs and session methods', async () => {
  const fixture = createActionFixture();

  await noticeAction(
    fixture.session,
    { id: 'channelNotification' },
    'Settings',
    fixture.open,
  );
  await noticeAction(
    fixture.session,
    { id: 'restart' },
    'Restart',
    fixture.open,
  );
  const pending = {
    kind: 'device',
    device: peerID,
    pending: { name: 'Laptop' },
  };
  await noticeAction(fixture.session, pending, 'Ignore', fixture.open);
  await noticeAction(fixture.session, pending, 'Dismiss', fixture.open);
  await noticeAction(fixture.session, pending, 'Add Device', fixture.open);
  const pendingFolder = {
    kind: 'folder',
    folder: 'documents',
    pending: { label: 'Documents' },
  };
  await noticeAction(fixture.session, pendingFolder, 'Add', fixture.open);
  await noticeAction(fixture.session, { id: 'errors' }, 'OK', fixture.open);

  assert.deepEqual(fixture.opened, [
    { type: 'settings' },
    { type: 'restart' },
    { type: 'add-device', ...pending },
    { type: 'add-folder', ...pendingFolder },
  ]);
  assert.deepEqual(fixture.calls, [
    { method: 'dismissNotification', id: 'channelNotification' },
    {
      method: 'ignorePending',
      device: peerID,
      folder: undefined,
      pending: { name: 'Laptop' },
    },
    { method: 'dismissPending', device: peerID, folder: undefined },
    { method: 'clearErrors' },
  ]);
});

test('encrypted folder offers open password entry without mutating config', async () => {
  const fixture = createActionFixture();
  const folder = fixture.config.folders[0];
  const card = {
    id: `folder-photos-${peerID}`,
    kind: 'folder',
    folder: 'photos',
    device: peerID,
    folderConfig: folder,
    pending: { remoteEncrypted: true },
  };

  await noticeAction(fixture.session, card, 'Share', fixture.open);
  assert.equal(
    folder.devices.some((device) => device.deviceID === peerID),
    false,
  );
  assert.equal(fixture.calls.length, 0);
  assert.equal(fixture.opened[0].type, 'edit-folder');
  assert.equal(fixture.opened[0].tab, 'sharing');
  assert.deepEqual(
    fixture.opened[0].folder.devices.find(
      (device) => device.deviceID === peerID,
    ),
    { deviceID: peerID, encryptionPassword: '' },
  );
});

test('ordinary folder offers update sharing once', async () => {
  const fixture = createActionFixture();
  const card = {
    id: `folder-photos-${peerID}`,
    folder: 'photos',
    device: peerID,
    folderConfig: fixture.config.folders[0],
    pending: { remoteEncrypted: false },
  };

  await noticeAction(fixture.session, card, 'Share', fixture.open);
  await noticeAction(fixture.session, card, 'Share', fixture.open);
  assert.deepEqual(
    fixture.config.folders[0].devices.filter(
      (device) => device.deviceID === peerID,
    ),
    [{ deviceID: peerID }],
  );
  assert.deepEqual(fixture.opened, []);
});

test('receive-encrypted folders accept remote encrypted sharing directly', async () => {
  const config = noticeState().config;
  config.folders[0].type = 'receiveencrypted';
  const fixture = createActionFixture(config);
  const card = {
    id: `folder-photos-${peerID}`,
    folder: 'photos',
    device: peerID,
    folderConfig: config.folders[0],
    pending: { remoteEncrypted: true },
  };

  await noticeAction(fixture.session, card, 'Share', fixture.open);
  assert.deepEqual(fixture.opened, []);
  assert.deepEqual(
    config.folders[0].devices.find((device) => device.deviceID === peerID),
    { deviceID: peerID },
  );
});

test('watcher and crash-report actions update config before dismissal', async () => {
  const config = noticeState().config;
  config.folders.push(
    {
      id: 'short-rescan',
      fsWatcherEnabled: false,
      rescanIntervalS: 60,
      devices: [{ deviceID: localID }],
    },
    {
      id: 'capped-rescan',
      fsWatcherEnabled: false,
      rescanIntervalS: 3600,
      devices: [{ deviceID: localID }],
    },
  );
  const fixture = createActionFixture(config);

  await noticeAction(
    fixture.session,
    { id: 'fsWatcherNotification' },
    'Yes',
    fixture.open,
  );
  assert.equal(config.folders[1].fsWatcherEnabled, true);
  assert.equal(config.folders[1].rescanIntervalS, 3600);
  assert.equal(config.folders[2].fsWatcherEnabled, true);
  assert.equal(config.folders[2].rescanIntervalS, 86400);

  await noticeAction(
    fixture.session,
    { id: 'crAutoDisabled' },
    'Enable Crash Reporting',
    fixture.open,
  );
  assert.equal(config.options.crashReportingEnabled, true);
  await noticeAction(
    fixture.session,
    { id: 'crAutoEnabled' },
    'Disable Crash Reporting',
    fixture.open,
  );
  assert.equal(config.options.crashReportingEnabled, false);
  assert.deepEqual(
    fixture.calls.filter((call) => call.method === 'dismissNotification'),
    [
      { method: 'dismissNotification', id: 'fsWatcherNotification' },
      { method: 'dismissNotification', id: 'crAutoDisabled' },
      { method: 'dismissNotification', id: 'crAutoEnabled' },
    ],
  );
});

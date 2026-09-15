import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  createSession,
  initialState,
  folderEvent,
} from '../client/session.mjs';

async function createSessionFixture(testContext) {
  const calls = [];
  let eventHandlers;
  let latestState;
  let ready;

  const loaded = new Promise((resolve) => {
    ready = resolve;
  });
  const responses = {
    config: { folders: [], devices: [], options: {}, gui: {} },
    'system/status': { myID: 'local' },
    'system/version': { version: 'v2.1.3' },
    'stats/folder': {},
    'stats/device': { peer: { lastSeen: '2026-09-08T12:00:00Z' } },
    'system/connections': {
      total: { inBytesTotal: 100, outBytesTotal: 200 },
      connections: {
        peer: { connected: true, inBytesTotal: 50, outBytesTotal: 75 },
      },
    },
    'config/insync': { configInSync: true },
    'system/discovery': {},
    'cluster/pending/devices': {},
    'cluster/pending/folders': {},
    'system/error': { errors: [] },
    'events/disk': [],
    'system/upgrade': null,
  };
  const api = {
    async get(path, query) {
      calls.push({ method: 'GET', path, query });
      return responses[path];
    },
    async post(path, body, query) {
      calls.push({ method: 'POST', path, body, query });
    },
    async put(path, body) {
      calls.push({ method: 'PUT', path, body });
    },
    async delete(path, query) {
      calls.push({ method: 'DELETE', path, query });
    },
  };
  const createEventStream = (_api, handlers) => {
    eventHandlers = handlers;
    return {
      start() {
        handlers.onOnline();
      },
      async stop() {},
    };
  };
  const session = createSession(api, {
    createEventStream,
    publish(state) {
      latestState = state;
      if (state.ready) ready();
    },
    refreshMs: 60000,
  });
  testContext.after(() => session.stop());
  session.start();
  await loaded;

  async function settle() {
    await new Promise((resolve) => setImmediate(resolve));
  }

  await settle();

  async function emit(type, data) {
    eventHandlers.onEvent({ type, data });
    await settle();
    return latestState;
  }

  async function goOffline(error) {
    eventHandlers.onOffline(error);
    await settle();
    return latestState;
  }

  function callsFor(path) {
    return calls.filter((call) => call.path === path);
  }

  return { callsFor, emit, goOffline, responses };
}

test('folder event updates preserve unrelated folders and clear obsolete scan data', () => {
  const original = {
    ...initialState(),
    model: { a: { state: 'idle' }, b: { state: 'idle' } },
    scanProgress: { a: { current: 50 }, b: { current: 20 } },
  };
  const scanning = folderEvent(original, {
    type: 'StateChanged',
    data: { folder: 'a', from: 'idle', to: 'scanning' },
  });
  assert.equal(scanning.model.a.state, 'scanning');
  assert.equal(scanning.model.b, original.model.b);
  assert.equal(scanning.scanProgress.a, undefined);
  assert.equal(original.model.a.state, 'idle');
  const summary = { state: 'idle', localFiles: 3 };
  assert.equal(
    folderEvent(scanning, {
      type: 'FolderSummary',
      data: { folder: 'a', summary },
    }).model.a,
    summary,
  );
  assert.equal(
    folderEvent(scanning, {
      type: 'FolderErrors',
      data: { folder: 'unknown', errors: ['bad'] },
    }),
    scanning,
  );
});

test('session hydrates, scans only the selected directory and cancels on disposal', async () => {
  const calls = [];
  let ready;
  const loaded = new Promise((resolve) => {
    ready = resolve;
  });
  let events = 0;
  const data = {
    config: {
      folders: [{ id: 'a' }, { id: 'paused', paused: true }],
      devices: [],
    },
    'system/status': { myID: 'local' },
    'system/version': { version: 'v2.1.3' },
    'stats/folder': {},
    'stats/device': {},
    'system/connections': { connections: {} },
    'config/insync': { configInSync: true },
    'db/status': { state: 'idle' },
  };
  const api = {
    async get(path, query, signal) {
      calls.push({ path, query });
      if (path !== 'events') return data[path];
      if (events++ === 0) return [{ id: 1, type: 'Starting' }];
      return new Promise((_, reject) =>
        signal.addEventListener(
          'abort',
          () => reject(new DOMException('Aborted', 'AbortError')),
          { once: true },
        ),
      );
    },
    async post(path, body, query) {
      calls.push({ path, body, query, method: 'POST' });
    },
    async put(path, body) {
      data[path] = body;
    },
    async delete(path, query) {
      calls.push({ path, query, method: 'DELETE' });
    },
  };
  const session = createSession(api, {
    publish: (state) => {
      if (state.ready) ready(state);
    },
  });
  session.start();
  const state = await loaded;
  assert.equal(state.model.a.state, 'idle');
  assert.equal(state.model.paused, undefined);
  await session.rescan('a', 'nested');
  assert.deepEqual(calls.at(-1), {
    path: 'db/scan',
    body: undefined,
    query: { folder: 'a', sub: 'nested' },
    method: 'POST',
  });
  await session.ignorePending('ignored-peer', undefined, {
    name: 'Ignored peer',
    address: '127.0.0.1:1',
  });
  assert.equal(data.config.remoteIgnoredDevices[0].deviceID, 'ignored-peer');
  assert.ok(data.config.remoteIgnoredDevices[0].time);
  assert.equal(data.config.ignoredDevices, undefined);
  await session.stop();
});

test('daemon events publish folder and transfer state', async (testContext) => {
  const fixture = await createSessionFixture(testContext);

  let state = await fixture.emit('FolderSummary', {
    folder: 'photos',
    summary: { state: 'idle', localFiles: 3 },
  });
  assert.equal(state.model.photos.localFiles, 3);

  state = await fixture.emit('FolderScanProgress', {
    folder: 'photos',
    current: 20,
    total: 100,
    rate: 5,
  });
  assert.deepEqual(state.scanProgress.photos, {
    current: 20,
    total: 100,
    rate: 5,
  });

  state = await fixture.emit('StateChanged', {
    folder: 'photos',
    from: 'idle',
    to: 'scanning',
  });
  assert.equal(state.model.photos.state, 'scanning');
  assert.equal(state.scanProgress.photos, undefined);

  state = await fixture.emit('FolderErrors', {
    folder: 'photos',
    errors: [{ message: 'permission denied' }, { message: 'file vanished' }],
  });
  assert.equal(state.model.photos.errors, 2);
  assert.equal(state.itemsRevision.photos, 1);

  state = await fixture.emit('DownloadProgress', {
    photos: {
      'image.jpg': {
        total: 10,
        reused: 2,
        copiedFromOrigin: 2,
        copiedFromElsewhere: 1,
        pulled: 4,
        pulling: 1,
        bytesTotal: 1000,
        bytesDone: 900,
      },
    },
  });
  assert.equal(state.downloadProgress.photos['image.jpg'].bytesDone, 900);
  assert.equal(state.itemsRevision.photos, 1);

  state = await fixture.emit('DownloadProgress', {});
  assert.equal(state.itemsRevision.photos, 2);
});

test('daemon events update completion and connection lifecycle', async (testContext) => {
  const fixture = await createSessionFixture(testContext);

  let state = await fixture.emit('FolderCompletion', {
    folder: 'photos',
    device: 'peer',
    globalBytes: 1000,
    needBytes: 250,
    needItems: 2,
    needDeletes: 0,
  });
  assert.equal(state.completion.peer._total, 75);
  assert.equal(state.completion.peer._needItems, 2);

  fixture.responses['stats/device'] = {
    peer: { lastSeen: '2026-09-09T12:00:00Z' },
  };
  state = await fixture.emit('DeviceDisconnected', { id: 'peer' });
  assert.equal(state.connections.peer.connected, false);
  assert.equal(state.deviceStats.peer.lastSeen, '2026-09-09T12:00:00Z');

  fixture.responses['system/status'] = { myID: 'local', uptime: 123 };
  fixture.responses['system/connections'] = {
    total: { inBytesTotal: 150, outBytesTotal: 260 },
    connections: {
      peer: { connected: true, inBytesTotal: 75, outBytesTotal: 105 },
    },
  };
  fixture.responses['system/error'] = {
    errors: [{ when: '2026-09-09T12:00:00Z', message: 'temporary warning' }],
  };
  fixture.responses['system/discovery'] = {
    peer: { addresses: ['tcp://192.0.2.10:22000/?id=peer'] },
  };
  state = await fixture.emit('DeviceConnected', { id: 'peer' });
  assert.equal(state.system.uptime, 123);
  assert.equal(state.connections.peer.connected, true);
  assert.deepEqual(state.discoveryCache.peer.addresses, [
    'tcp://192.0.2.10:22000',
  ]);
  assert.equal(state.errors[0].message, 'temporary warning');

  const offlineError = new Error('event stream unavailable');
  state = await fixture.goOffline(offlineError);
  assert.equal(state.online, false);
  assert.equal(state.error, offlineError);
});

test('daemon events refresh pending offers and saved configuration', async (testContext) => {
  const fixture = await createSessionFixture(testContext);
  fixture.responses['cluster/pending/devices'] = {
    peer: { name: 'New peer' },
  };

  let state = await fixture.emit('PendingDevicesChanged', {});
  assert.equal(state.pendingDevices.peer.name, 'New peer');

  fixture.responses['cluster/pending/folders'] = {
    photos: { offeredBy: { peer: { label: 'Photos' } } },
  };
  state = await fixture.emit('PendingFoldersChanged', {});
  assert.equal(state.pendingFolders.photos.offeredBy.peer.label, 'Photos');

  const config = {
    folders: [
      {
        id: 'photos',
        devices: [{ deviceID: 'local' }, { deviceID: 'peer' }],
      },
    ],
    devices: [{ deviceID: 'local' }, { deviceID: 'peer' }],
    options: { urAccepted: -1 },
    gui: {},
  };
  fixture.responses['db/status'] = { state: 'idle', localFiles: 4 };
  fixture.responses['db/completion'] = {
    globalBytes: 1000,
    needBytes: 100,
    needItems: 1,
    needDeletes: 0,
  };
  fixture.responses['config/insync'] = { configInSync: false };
  state = await fixture.emit('ConfigSaved', config);
  assert.equal(state.config, config);
  assert.equal(state.model.photos.localFiles, 4);
  assert.equal(state.completion.peer._total, 90);
  assert.equal(state.configInSync, false);
});

test('index events refresh revisions and folder activity', async (testContext) => {
  const fixture = await createSessionFixture(testContext);
  await fixture.emit('FolderSummary', {
    folder: 'photos',
    summary: { state: 'scanning', localFiles: 3 },
  });
  fixture.responses['stats/folder'] = { photos: { lastScan: '2026-09-09' } };
  fixture.responses['events/disk'] = [
    { id: 1, data: { path: 'first.txt' } },
    { id: 2, data: { path: 'second.txt' } },
  ];

  const statsBefore = fixture.callsFor('stats/folder').length;
  const changesBefore = fixture.callsFor('events/disk').length;
  let state = await fixture.emit('LocalIndexUpdated', { folder: 'photos' });
  assert.equal(state.itemsRevision.photos, 1);
  assert.equal(state.folderStats.photos.lastScan, '2026-09-09');
  assert.deepEqual(
    state.globalChanges.map((event) => event.id),
    [2, 1],
  );
  assert.equal(fixture.callsFor('stats/folder').length, statsBefore + 1);
  assert.equal(fixture.callsFor('events/disk').length, changesBefore + 1);

  state = await fixture.emit('RemoteIndexUpdated', { folder: 'photos' });
  assert.equal(state.itemsRevision.photos, 2);
  assert.equal(fixture.callsFor('stats/folder').length, statsBefore + 1);

  state = await fixture.emit('StateChanged', {
    folder: 'photos',
    from: 'scanning',
    to: 'idle',
  });
  assert.equal(state.model.photos.state, 'idle');
  assert.equal(fixture.callsFor('stats/folder').length, statsBefore + 2);
  assert.equal(fixture.callsFor('events/disk').length, changesBefore + 2);
});

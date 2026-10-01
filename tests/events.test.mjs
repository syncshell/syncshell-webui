import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createEvents } from '../client/events.mjs';

test('cursor advances after startup and survives a reconnect', async () => {
  const script = [
    { data: [{ id: 20, type: 'StateChanged' }] },
    {
      data: [
        { id: 21, type: 'FolderSummary' },
        { id: 22, type: 'StateChanged' },
      ],
    },
    { status: 503 },
    { data: [{ id: 24, type: 'ConfigSaved' }] },
    { status: 403 },
  ];
  const expected = {
    calls: [
      'rest/events?limit=1',
      'rest/events?since=20',
      'rest/events?since=22',
      'rest/events?limit=1',
      'rest/events?since=24',
    ],
    seen: [
      { type: 'UIOnline' },
      { type: 'UIOnline' },
      { type: 'FolderSummary', id: 21 },
      { type: 'StateChanged', id: 22 },
      { type: 'UIOffline' },
      { type: 'UIOnline' },
      { type: 'ConfigSaved', id: 24 },
    ],
    reloads: 1,
  };
  const calls = [],
    seen = [];
  let reloads = 0;
  const api = {
    async get(path, { query } = {}) {
      calls.push('rest/' + path + '?' + new URLSearchParams(query));
      const item = script.shift();
      if (item.status)
        throw Object.assign(new Error('error'), { status: item.status });
      return item.data;
    },
  };
  const events = createEvents(api, {
    retryMs: 0,
    onOnline: () => seen.push({ type: 'UIOnline' }),
    onOffline: () => seen.push({ type: 'UIOffline' }),
    onAuthExpired: () => reloads++,
    onEvent: (event) => seen.push({ type: event.type, id: event.id }),
  });
  await events.start();
  assert.deepEqual({ calls, seen, reloads }, expected);
});

test('empty 200 recovers, start is idempotent, and stop cancels retry', async () => {
  let calls = 0;
  let offline;
  const failed = new Promise((resolve) => {
    offline = resolve;
  });
  const events = createEvents(
    {
      async get() {
        calls++;
        return '';
      },
    },
    {
      onEvent() {},
      onOffline: offline,
      retryMs: 60000,
    },
  );
  const running = events.start();
  assert.equal(events.start(), running);
  await failed;
  await events.stop();
  assert.equal(calls, 1);
});

test('unmount aborts the active request and prevents later callbacks', async () => {
  let entered;
  const started = new Promise((resolve) => {
    entered = resolve;
  });
  let signal;
  const events = createEvents(
    {
      get(_, { signal: requestSignal }) {
        signal = requestSignal;
        entered();
        return new Promise((_, reject) =>
          signal.addEventListener(
            'abort',
            () => reject(new DOMException('Aborted', 'AbortError')),
            { once: true },
          ),
        );
      },
    },
    {
      onEvent: () => assert.fail('late event'),
      onOffline: () => assert.fail('unmount is not an outage'),
    },
  );
  events.start();
  await started;
  await events.stop();
  assert.equal(signal.aborted, true);
});

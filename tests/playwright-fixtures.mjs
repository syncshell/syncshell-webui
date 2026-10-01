import { test as base, expect } from '@playwright/test';

function ignoreClosedRoute() {
  // The browser context may close while fixture teardown releases long polls.
}

/**
 * @typedef {object} SyncthingFixture
 * @property {(options?: {folder?: object, model?: object, progress?: object}) => void} configure
 * @property {(folder: object) => void} setFolder
 * @property {(model: object) => void} setModel
 * @property {(progress: object | null) => void} setProgress
 * @property {(event: object) => Promise<void>} emitEvent
 * @property {Array<{method: string, path: string, query: object}>} requests
 */

function pendingEventRequest(route, pending) {
  let deliver;
  let complete;
  const delivery = new Promise((resolve) => {
    deliver = resolve;
  });
  const done = new Promise((resolve) => {
    complete = resolve;
  });
  const request = { deliver, done };
  pending.add(request);
  return delivery
    .then((events) =>
      events
        ? route.fulfill({ json: events })
        : route.abort().catch(ignoreClosedRoute),
    )
    .finally(() => {
      pending.delete(request);
      complete();
    });
}

async function installSyncthingRoutes(page, state, pending) {
  await page.route('**/rest/config', async (route) => {
    const config = await (await route.fetch()).json();
    config.folders = [
      {
        ...config.folders[0],
        label: 'Folder under test',
        path: '/a/b',
        ...state.folder,
      },
    ];
    await route.fulfill({ json: config });
  });
  await page.route('**/rest/db/status?*', async (route) => {
    const original = await (await route.fetch()).json();
    await route.fulfill({
      json: {
        ...original,
        state: 'idle',
        errors: 0,
        pullErrors: 0,
        needTotalItems: 0,
        needBytes: 0,
        globalFiles: 109274,
        localFiles: 109274,
        globalDirectories: 12921,
        localDirectories: 12921,
        globalBytes: 7351042089,
        localBytes: 7351042089,
        ...state.model,
      },
    });
  });
  await page.route('**/rest/events?*', async (route) => {
    if (route.request().url().includes('limit=')) {
      await route.fulfill({ json: [{ id: 1, type: 'Starting', data: {} }] });
    } else if (state.progress && !state.sentProgress) {
      state.sentProgress = true;
      await route.fulfill({
        json: [
          {
            id: 2,
            type: 'FolderScanProgress',
            data: { folder: 'test-folder', ...state.progress },
          },
        ],
      });
    } else if (state.events.length) {
      await route.fulfill({ json: state.events.splice(0) });
    } else {
      await pendingEventRequest(route, pending);
    }
  });
}

export const test = base.extend({
  syncthing: async ({ page }, use) => {
    const pending = new Set();
    const state = {
      events: [],
      folder: {},
      model: {},
      progress: null,
      sentProgress: false,
    };
    const requests = [];
    const recordRequest = (request) => {
      const url = new URL(request.url());
      requests.push({
        method: request.method(),
        path: url.pathname,
        query: Object.fromEntries(url.searchParams),
      });
    };
    page.on('request', recordRequest);
    await installSyncthingRoutes(page, state, pending);

    /** @type {SyncthingFixture} */
    const syncthing = {
      configure({ folder = {}, model = {}, progress = null } = {}) {
        Object.assign(state.folder, folder);
        Object.assign(state.model, model);
        state.progress = progress;
        state.sentProgress = false;
      },
      setFolder(folder) {
        Object.assign(state.folder, folder);
      },
      setModel(model) {
        Object.assign(state.model, model);
      },
      setProgress(progress) {
        state.progress = progress;
        state.sentProgress = false;
      },
      async emitEvent(event) {
        const request = pending.values().next().value;
        if (!request) {
          state.events.push(event);
          return;
        }
        request.deliver([event]);
        await request.done;
      },
      requests,
    };

    await use(syncthing);

    page.off('request', recordRequest);
    const requestsToClose = [...pending];
    for (const request of requestsToClose) request.deliver(null);
    await Promise.all(requestsToClose.map((request) => request.done));
  },
});

export { expect };

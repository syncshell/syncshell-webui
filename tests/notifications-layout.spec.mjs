import { test, expect } from '@playwright/test';
import { notificationCards } from '../app/features/notifications/notification-definitions.mjs';
import { folderFixture } from './folder-fixture.mjs';

const peer = 'PEER-DEVICE-IDENTIFIER';

async function expectColumns(panels, count) {
  const boxes = await panels.evaluateAll((nodes) =>
    nodes.map((node) => {
      const box = node.getBoundingClientRect();
      return { left: box.left, top: box.top };
    }),
  );
  const first = boxes[0];
  for (const box of boxes.slice(0, count))
    expect(Math.abs(box.top - first.top)).toBeLessThan(1);
  if (boxes.length > count) {
    expect(boxes[count].top).toBeGreaterThan(first.top + 10);
    expect(Math.abs(boxes[count].left - first.left)).toBeLessThan(1);
  }
}

test('notification cards form a responsive grid with aligned headers', async ({
  page,
}, testInfo) => {
  await folderFixture(page, {
    folder: { fsWatcherEnabled: true, paused: false },
    model: { watchError: 'watch failed' },
  });
  await page.route('**/rest/config', async (route) => {
    const config = await (await route.fetch()).json();
    config.gui = {
      ...config.gui,
      authMode: '',
      user: '',
      password: '',
      insecureAdminAccess: false,
    };
    config.options.unackedNotificationIDs = Object.keys(notificationCards);
    config.folders = [
      {
        ...config.folders[0],
        label: 'Folder under test',
        path: '/a/b',
        fsWatcherEnabled: true,
        paused: false,
      },
    ];
    await route.fulfill({ json: config });
  });
  await page.route('**/rest/system/status', async (route) =>
    route.fulfill({
      json: {
        ...(await (await route.fetch()).json()),
        guiAddressUsed: '0.0.0.0:8384',
      },
    }),
  );
  await page.route('**/rest/config/insync', (route) =>
    route.fulfill({ json: { configInSync: false } }),
  );
  await page.route('**/rest/cluster/pending/devices', (route) =>
    route.fulfill({
      json: {
        [peer]: {
          name: 'Peer device',
          address: 'tcp://192.0.2.1:22000',
          time: '2026-09-30T20:44:16Z',
        },
      },
    }),
  );
  await page.route('**/rest/cluster/pending/folders', (route) =>
    route.fulfill({
      json: {
        'test-folder': {
          offeredBy: {
            [peer]: {
              label: 'Existing folder',
              time: '2026-09-30T20:44:16Z',
            },
          },
        },
        'incoming-folder': {
          offeredBy: {
            [peer]: {
              label: 'Incoming folder',
              time: '2026-09-30T20:44:16Z',
            },
          },
        },
      },
    }),
  );
  await page.route('**/rest/system/error', (route) =>
    route.fulfill({
      json: {
        errors: [
          {
            when: '2026-09-30T20:44:16Z',
            message: 'Temporary notification error',
          },
        ],
      },
    }),
  );

  await page.setViewportSize({ width: 1400, height: 900 });
  await page.goto('/');
  await page.getByRole('tab', { name: /Notifications/ }).click();

  const panels = page.locator('.notification-grid > .panel');
  await expect(panels).toHaveCount(12);
  await expect(panels.locator('.notification-title-text')).toHaveText([
    'Danger!',
    'Restart Needed',
    ...Object.values(notificationCards).map((card) => card.title),
    'New Device',
    'Share Folder',
    'New Folder',
    'Notice',
    'Filesystem Watcher Errors',
  ]);

  const headers = await panels.locator('.panel-title').evaluateAll((nodes) =>
    nodes.map((node) => {
      const icon = node.querySelector('.panel-icon').getBoundingClientRect();
      const title = node
        .querySelector('.notification-title-text')
        .getBoundingClientRect();
      return {
        iconRight: icon.right,
        iconTop: icon.top,
        titleLeft: title.left,
        titleTop: title.top,
        titleWidth: title.width,
      };
    }),
  );
  for (const header of headers) {
    expect(Math.abs(header.iconTop - header.titleTop)).toBeLessThan(4);
    expect(header.titleLeft).toBeGreaterThan(header.iconRight);
    expect(header.titleWidth).toBeGreaterThan(0);
  }

  const authenticationTitle = panels
    .filter({ hasText: 'GUI Authentication: Set User and Password' })
    .locator('.notification-title-text');
  const titleMetrics = await authenticationTitle.evaluate((node) => ({
    height: node.getBoundingClientRect().height,
    lineHeight: Number.parseFloat(getComputedStyle(node).lineHeight),
  }));
  expect(titleMetrics.height).toBeGreaterThan(titleMetrics.lineHeight * 1.5);

  await expectColumns(panels, 4);
  await page.screenshot({
    path: testInfo.outputPath('notifications-four-columns.png'),
    fullPage: true,
  });

  for (const [width, columns] of [
    [1100, 3],
    [800, 2],
    [600, 1],
  ]) {
    await page.setViewportSize({ width, height: 900 });
    await expectColumns(panels, columns);
  }
});

import { test, expect } from './playwright-fixtures.mjs';

async function box(locator) {
  const value = await locator.boundingBox();
  expect(value).not.toBeNull();
  return value;
}

test('dashboard cards keep useful widths across viewports', async ({
  page,
  syncthing,
}) => {
  syncthing.configure({
    folder: {
      label: 'project omarchy-dropbox-selective-sync-widget',
    },
  });
  await page.goto('/');

  const primary = page.locator('.dashboard-primary.active');
  const folders = page.locator('.dashboard-folders');
  const local = page.locator('.dashboard-devices > .panel');
  const remote = page.locator('.dashboard-remotes .panel').first();

  await page.setViewportSize({ width: 1908, height: 954 });
  const desktopPrimary = await box(primary);
  const desktopFolders = await box(folders);
  const desktopLocal = await box(local);
  const desktopRemote = await box(remote);

  expect(desktopPrimary.width).toBeGreaterThan(1800);
  expect(desktopFolders.width).toBeGreaterThan(580);
  expect(desktopLocal.width).toBeGreaterThan(560);
  expect(desktopRemote.width).toBeGreaterThan(560);
  expect(Math.abs(desktopLocal.y - desktopRemote.y)).toBeLessThan(1);
  expect(desktopLocal.x).toBeLessThan(desktopRemote.x);

  await page.setViewportSize({ width: 1100, height: 954 });
  const tabletLocal = await box(local);
  const tabletRemote = await box(remote);
  expect(tabletLocal.width).toBeGreaterThan(600);
  expect(tabletRemote.y).toBeGreaterThan(tabletLocal.y);

  await page.setViewportSize({ width: 390, height: 954 });
  await expect(primary).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    390,
  );
  const title = page
    .locator('.dashboard-folders .panel-title-text')
    .filter({ hasText: 'project omarchy-dropbox-selective-sync-widget' });
  expect(
    await title.evaluate((node) => node.scrollWidth > node.clientWidth),
  ).toBe(true);
});

import { test, expect } from './playwright-fixtures.mjs';

test('Escape closes a folder menu and returns focus to its trigger', async ({
  page,
  syncthing,
}) => {
  syncthing.configure();
  await page.goto('/');

  const localDevice = page.locator('.dashboard-devices > .panel');
  const trigger = localDevice.getByRole('button', { name: /Folders/ });
  const menu = localDevice.locator('.device-folders .dropdown-menu');
  await expect(trigger).toBeVisible();
  await trigger.click();
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  await expect(menu).toBeVisible();
  await expect(menu).toHaveScreenshot('folder-menu.png');

  const item = menu.getByRole('link', {
    name: 'Folder under test',
    exact: true,
  });
  await item.focus();
  await expect(item).toBeFocused();
  await page.keyboard.press('Escape');

  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await expect(menu).toBeHidden();
  await expect(trigger).toBeFocused();
});

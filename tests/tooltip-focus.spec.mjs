import { test, expect } from '@playwright/test';
import { folderFixture } from './folder-fixture.mjs';

test('focused tooltips describe their trigger and hide on Escape', async ({
  page,
}) => {
  await folderFixture(page);
  await page.goto('/');
  await page.getByRole('button', { name: /Folder under test/ }).click();

  const trigger = page
    .locator('.folder-state-summary')
    .getByRole('img', { name: 'Files', exact: true });
  await trigger.focus();
  await expect(trigger).toBeFocused();
  await expect(trigger).toHaveAttribute(
    'aria-describedby',
    /^syncshell-tooltip-\d+$/,
  );

  const tooltipId = await trigger.getAttribute('aria-describedby');
  const tooltip = page.locator(`#${tooltipId}`);
  await expect(tooltip).toHaveAttribute('role', 'tooltip');
  await expect(tooltip).toBeVisible();
  await expect(tooltip).toContainText('109,274');

  await page.keyboard.press('Escape');
  await expect(tooltip).toBeHidden();
  await expect(trigger).not.toHaveAttribute('aria-describedby', tooltipId);
  await expect(trigger).toBeFocused();
});

import { test, expect } from './playwright-fixtures.mjs';

test('focused tooltips describe their trigger and hide on Escape', async ({
  page,
  folderFixture,
}) => {
  await folderFixture();
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

test('hovered tooltips remain open across the pointer gap and stay in view', async ({
  page,
  folderFixture,
}) => {
  await page.clock.install();
  await folderFixture();
  await page.goto('/');
  await page.getByRole('button', { name: /Folder under test/ }).click();

  const trigger = page
    .locator('.folder-state-summary')
    .getByRole('img', { name: 'Files', exact: true });
  await trigger.hover();
  await page.clock.runFor(400);
  await expect(trigger).toHaveAttribute(
    'aria-describedby',
    /^syncshell-tooltip-\d+$/,
  );
  const tooltipId = await trigger.getAttribute('aria-describedby');
  const tooltip = page.locator(`#${tooltipId}`);
  await expect(tooltip).toBeVisible();
  await tooltip.hover();
  await page.clock.runFor(150);
  await expect(tooltip).toBeVisible();

  const bounds = await tooltip.boundingBox();
  const viewport = page.viewportSize();
  expect(bounds.x).toBeGreaterThanOrEqual(0);
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(viewport.width);
  expect(bounds.y).toBeGreaterThanOrEqual(0);
  expect(bounds.y + bounds.height).toBeLessThanOrEqual(viewport.height);

  await page.keyboard.press('Escape');
  await expect(tooltip).toBeHidden();
  await expect(trigger).not.toHaveAttribute('aria-describedby', tooltipId);
});

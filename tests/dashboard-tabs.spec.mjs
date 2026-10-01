import { test, expect } from './playwright-fixtures.mjs';

test('dashboard tabs move focus, wrap and activate from the keyboard', async ({
  page,
  syncthing,
}) => {
  syncthing.configure();
  await page.goto('/');
  await expect(page.locator('.dashboard-folders .panel-heading')).toBeVisible();

  const tablist = page.getByRole('tablist');
  const tabs = [
    {
      control: tablist.getByRole('tab', { name: 'Overview', exact: true }),
      panel: page.locator('#dashboard-overview'),
    },
    {
      control: tablist.getByRole('tab', {
        name: 'Resolve sync conflicts (beta)',
        exact: true,
      }),
      panel: page.locator('#dashboard-conflicts'),
    },
    {
      control: tablist.getByRole('tab', { name: /Notifications/ }),
      panel: page.locator('#dashboard-notifications'),
    },
  ];

  async function expectActive(index) {
    for (const [position, tab] of tabs.entries()) {
      const active = position === index;
      await expect(tab.control).toHaveAttribute(
        'aria-selected',
        String(active),
      );
      await expect(tab.control).toHaveAttribute(
        'tabindex',
        active ? '0' : '-1',
      );
      if (active) {
        await expect(tab.control).toBeFocused();
        await expect(tab.panel).toHaveClass(/\bactive\b/);
      } else {
        await expect(tab.panel).not.toHaveClass(/\bactive\b/);
      }
    }
  }

  await tabs[0].control.focus();
  await expectActive(0);

  await page.keyboard.press('ArrowLeft');
  await expectActive(2);

  await page.keyboard.press('ArrowRight');
  await expectActive(0);

  await page.keyboard.press('End');
  await expectActive(2);

  await page.keyboard.press('Home');
  await expectActive(0);

  await page.keyboard.press('ArrowRight');
  await expectActive(1);
});

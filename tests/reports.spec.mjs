import { test, expect } from './playwright-fixtures.mjs';

async function captureConfig(page, edit) {
  let config;
  await page.route('**/rest/config', async (route) => {
    if (route.request().method() === 'PUT') {
      config = route.request().postDataJSON();
      return route.fulfill({ status: 200, body: '' });
    }
    config ||= await edit(await (await route.fetch()).json(), route);
    await route.fulfill({ json: config });
  });
  return () => config;
}

for (const { name, accepted, answer, result } of [
  {
    name: 'declining a new report disables usage reporting',
    accepted: 0,
    answer: 'No',
    result: -1,
  },
  {
    name: 'declining an updated report keeps the accepted version',
    accepted: 2,
    answer: 'No',
    result: 2,
  },
  {
    name: 'accepting a report records the latest version',
    accepted: 0,
    answer: 'Yes',
    result: 4,
  },
])
  test(name, async ({ page, syncthing }) => {
    syncthing.configure();
    const config = await captureConfig(page, (value) => {
      value.options.urAccepted = accepted;
      value.options.urSeen = 0;
      return value;
    });
    await page.route('**/rest/system/status', async (route) =>
      route.fulfill({
        json: { ...(await (await route.fetch()).json()), urVersionMax: 4 },
      }),
    );
    await page.route('**/rest/svc/report?*', (route) =>
      route.fulfill({ json: { sample: 'report preview' } }),
    );
    await page.goto('/');
    const consent = page.getByRole('dialog', {
      name: 'Allow Anonymous Usage Reporting?',
      exact: true,
    });
    await expect(consent).toBeVisible();
    await consent
      .getByRole('button', { name: 'Preview Usage Report', exact: true })
      .click();
    await expect(consent).toContainText('report preview');
    await consent.getByRole('button', { name: answer, exact: true }).click();
    await expect(consent).toHaveCount(0);
    expect(config().options.urAccepted).toBe(result);
    expect(config().options.urSeen).toBe(4);
  });

test('usage reports compare the selected version with its predecessor', async ({
  page,
  syncthing,
}) => {
  syncthing.configure();
  await page.route('**/rest/system/status', async (route) =>
    route.fulfill({
      json: { ...(await (await route.fetch()).json()), urVersionMax: 4 },
    }),
  );
  await page.route('**/rest/svc/report?*', async (route) => {
    const version = Number(
      new URL(route.request().url()).searchParams.get('version'),
    );
    await route.fulfill({
      json:
        version === 2
          ? { common: 2 }
          : { common: version, ['added' + version]: true },
    });
  });
  await page.goto('/');
  await expect(page.locator('.dashboard-folders .panel-heading')).toBeVisible();
  await page.getByRole('link', { name: /Actions/ }).click();
  await page.getByRole('link', { name: 'Settings', exact: true }).click();
  await page
    .getByRole('dialog', { name: 'Settings', exact: true })
    .getByRole('button', { name: 'Preview', exact: true })
    .click();
  const report = page.getByRole('dialog', {
    name: 'Anonymous Usage Reporting',
    exact: true,
  });
  await report
    .getByRole('combobox', { name: 'Version', exact: true })
    .selectOption('3');
  await expect(report.locator('pre')).toContainText('added3');
  await report
    .getByRole('checkbox', {
      name: 'Show diff with previous version',
      exact: true,
    })
    .check();
  await expect(report.locator('pre')).not.toContainText('common');
});

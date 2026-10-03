import { readFile } from 'node:fs/promises';
import { test, expect } from './playwright-fixtures.mjs';

const catppuccin = {
  mode: 'dark',
  background: '#1e1e2e',
  foreground: '#cdd6f4',
  surface: '#313244',
  surface_dark: '#101019',
  foreground_dark: '#6c7086',
  foreground_light: '#bac2de',
  accent: '#89b4fa',
  muted: '#585b70',
  selection: '#45475a',
  green: '#a6e3a1',
  yellow: '#f9e2af',
  red: '#f38ba8',
  cyan: '#94e2d5',
  blue: '#89b4fa',
  magenta: '#f5c2e7',
  orange: '#f6b6ab',
};
const template = await readFile(
  new URL('../integration/omarchy-theme.css.in', import.meta.url),
  'utf8',
);
const refresh = await readFile(
  new URL('../integration/omarchy-theme-refresh.js', import.meta.url),
  'utf8',
);
const palettes = {
  catppuccin,
  hackerman: {
    mode: 'dark',
    background: '#0b0c16',
    foreground: '#ddf7ff',
    surface: '#151828',
    surface_dark: '#06060c',
    foreground_dark: '#6a6e95',
    foreground_light: '#b5c5db',
    accent: '#82fb9c',
    muted: '#2d3450',
    selection: '#1f253a',
    green: '#4fe88f',
    yellow: '#50f7d4',
    red: '#50f872',
    cyan: '#7cf8f7',
    blue: '#829dd4',
    magenta: '#86a7df',
    orange: '#50f7a3',
  },
  solitude: {
    mode: 'dark',
    background: '#101315',
    foreground: '#cacccc',
    surface: '#101315',
    surface_dark: '#080a0b',
    foreground_dark: '#4b4e55',
    foreground_light: '#cbc2be',
    accent: '#798186',
    muted: '#4b4e55',
    selection: '#343d41',
    green: '#9fa5a9',
    yellow: '#d9dbdc',
    red: '#565d60',
    cyan: '#707070',
    blue: '#798186',
    magenta: '#aeaeae',
    orange: '#d9dbdc',
  },
  nord: {
    mode: 'dark',
    background: '#2e3440',
    foreground: '#d8dee9',
    surface: '#3b4252',
    surface_dark: '#191c23',
    foreground_dark: '#667080',
    foreground_light: '#adb5c4',
    accent: '#81a1c1',
    muted: '#4c566a',
    selection: '#434c5e',
    green: '#a3be8c',
    yellow: '#ebcb8b',
    red: '#bf616a',
    cyan: '#88c0d0',
    blue: '#81a1c1',
    magenta: '#b48ead',
    orange: '#d5967a',
  },
  ristretto: {
    mode: 'dark',
    background: '#2c2525',
    foreground: '#e6d9db',
    surface: '#3d2f2a',
    surface_dark: '#181414',
    foreground_dark: '#72696a',
    foreground_light: '#c3b7b8',
    accent: '#f38d70',
    muted: '#72696a',
    selection: '#403e41',
    green: '#adda78',
    yellow: '#f9cc6c',
    red: '#fd6883',
    cyan: '#85dacc',
    blue: '#f38d70',
    magenta: '#a8a9eb',
    orange: '#fb9a77',
  },
  white: {
    mode: 'light',
    background: '#ffffff',
    foreground: '#000000',
    surface: '#c0c0c0',
    surface_dark: '#e8e8e8',
    foreground_dark: '#c0c0c0',
    foreground_light: '#000000',
    accent: '#6e6e6e',
    muted: '#808080',
    selection: '#c0c0c0',
    green: '#3a3a3a',
    yellow: '#4a4a4a',
    red: '#2a2a2a',
    cyan: '#3e3e3e',
    blue: '#1a1a1a',
    magenta: '#2e2e2e',
    orange: '#4a4a4a',
  },
};
const dangerText = {
  solitude: '#d9dbdc',
  ristretto: '#181414',
  nord: '#d8dee9',
};
const rgb = (hex) =>
  `rgb(${hex
    .slice(1)
    .match(/../g)
    .map((v) => parseInt(v, 16))
    .join(', ')})`;

async function contrast(element) {
  return element.evaluate((el) => {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 1;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    const luminance = (color) => {
      context.fillStyle = color;
      context.fillRect(0, 0, 1, 1);
      return [...context.getImageData(0, 0, 1, 1).data]
        .slice(0, 3)
        .map((v) => v / 255)
        .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
        .reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);
    };
    const style = getComputedStyle(el);
    const [low, high] = [
      luminance(style.color),
      luminance(style.backgroundColor),
    ].sort((a, b) => a - b);
    return (high + 0.05) / (low + 0.05);
  });
}

for (const [name, palette, scheme] of Object.entries(palettes).flatMap(
  ([name, palette]) =>
    ['dark', 'light'].map((scheme) => [name, palette, scheme]),
)) {
  test(`${name} contrast and native palette refresh with browser ${scheme}`, async ({
    page,
    syncthing,
  }) => {
    syncthing.configure();
    let current = palette;
    let version = '1';
    await page.route('**/theme-version.txt', (route) =>
      route.fulfill({ body: version }),
    );
    await page.route('**/assets/js/omarchy_theme_refresh.js', (route) =>
      route.fulfill({ contentType: 'text/javascript', body: refresh }),
    );
    await page.emulateMedia({ colorScheme: scheme });
    await page.route('**/assets/css/theme.css*', (route) =>
      route.fulfill({
        contentType: 'text/css',
        body:
          `@import "syncshell-${current.mode}.css";\n` +
          template.replace(/{{(\w+)}}/g, (_, key) => {
            if (!(key in current))
              throw new Error(`Unresolved palette value: ${key}`);
            return current[key];
          }),
      }),
    );
    await page.goto('/');
    await page.getByRole('button', { name: /Folder under test/ }).waitFor();
    await expect(page.locator('html')).toHaveCSS('color-scheme', palette.mode);
    await page.evaluate(
      () =>
        new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.dataset.themeVersion = '1';
          script.src = 'assets/js/omarchy_theme_refresh.js';
          script.onload = resolve;
          script.onerror = reject;
          document.head.append(script);
        }),
    );
    await page.evaluate(() => {
      const gallery = document.createElement('section');
      gallery.id = 'omarchy-contrast';
      gallery.style.padding = '24px';
      gallery.innerHTML = ['success', 'warning', 'danger']
        .map(
          (tone) => `
        <article data-tone="${tone}"><button class="btn btn-${tone}">${tone}</button>
        <div class="alert alert-${tone}">Alert <a href="#">Link</a>
          <button class="btn btn-link" aria-label="Close">x</button></div>
        <div class="panel-${tone}"><h2 class="panel-heading">Notification
          <svg class="identicon"><rect width="10" height="10" /></svg></h2></div></article>`,
        )
        .join('');
      document.body.prepend(gallery);
    });
    for (const tone of ['success', 'warning', 'danger']) {
      const card = page.locator(`#omarchy-contrast [data-tone=${tone}]`);
      const button = card.locator(':scope > button');
      const foreground = rgb(
        (tone === 'danger' && dangerText[name]) || palette.background,
      );
      const fills = [];
      for (const state of ['normal', 'hover', 'focus', 'active']) {
        await button.evaluate((el) => el.blur());
        await page.mouse.move(0, 0);
        if (state === 'hover' || state === 'active') await button.hover();
        if (state === 'focus') {
          await button.focus();
          await page.keyboard.press('Shift+Tab');
          await page.keyboard.press('Tab');
          await expect(button).toBeFocused();
          if (palette.mode === 'light')
            await expect(button).toHaveCSS('outline-style', 'auto');
          else
            await expect(button).toHaveCSS(
              'outline',
              `${rgb(palette.cyan)} solid 2px`,
            );
        }
        if (state === 'active') await page.mouse.down();
        await expect(button).toHaveCSS('color', foreground);
        if (state === 'normal')
          await expect(button).toHaveCSS(
            'background-color',
            name === 'nord' && tone === 'danger'
              ? 'color(srgb 0.521569 0.309804 0.349804)'
              : rgb(
                  palette[
                    { success: 'green', warning: 'yellow', danger: 'red' }[tone]
                  ],
                ),
          );
        expect(await contrast(button)).toBeGreaterThanOrEqual(4.5);
        fills.push(
          await button.evaluate((el) => getComputedStyle(el).backgroundColor),
        );
        if (state === 'active') await page.mouse.up();
      }
      expect(new Set(fills).size).toBe(3);
      for (const selector of ['.alert', '.panel-heading']) {
        const element = card.locator(selector);
        await expect(element).toHaveCSS('color', foreground);
        expect(await contrast(element)).toBeGreaterThanOrEqual(4.5);
      }
      await expect(card.locator('.identicon rect')).toHaveCSS(
        'fill',
        foreground,
      );
      for (const control of await card.locator('a, .btn-link').all()) {
        await control.focus();
        await page.keyboard.press('Shift+Tab');
        await page.keyboard.press('Tab');
        await expect(control).toBeFocused();
        await expect(control).toHaveCSS('color', foreground);
        await expect(control).toHaveCSS('outline', `${foreground} solid 2px`);
      }
      await expect(card.locator('a')).toHaveCSS(
        'text-decoration-line',
        'underline',
      );
      await button.evaluate((el) => {
        el.disabled = true;
      });
      await expect(button).toHaveCSS('opacity', '0.65');
    }
    current = palette.mode === 'light' ? palettes.solitude : palettes.white;
    version = '2';
    await page.evaluate(() =>
      document.dispatchEvent(new Event('visibilitychange')),
    );
    await expect(page.locator('html')).toHaveCSS('color-scheme', current.mode);
    await expect(page.locator('#omarchy-contrast .alert-danger')).toHaveCSS(
      'color',
      rgb(current === palettes.solitude ? current.yellow : current.background),
    );
    await expect(page.locator('#omarchy-contrast .alert-danger')).toHaveCSS(
      'background-color',
      rgb(current.red),
    );
  });
}

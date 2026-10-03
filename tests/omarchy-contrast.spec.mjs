import { readFile } from 'node:fs/promises';
import { test, expect } from './playwright-fixtures.mjs';

const palette = {
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
const css = template.replace(/{{(\w+)}}/g, (_, key) => {
  if (!(key in palette)) throw new Error(`Unresolved palette value: ${key}`);
  return palette[key];
});

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

for (const scheme of ['dark', 'light']) {
  test(`catppuccin stays dark and readable with browser ${scheme}`, async ({
    page,
    syncthing,
  }) => {
    syncthing.configure();
    await page.emulateMedia({ colorScheme: scheme });
    await page.route('**/assets/css/theme.css*', (route) =>
      route.fulfill({
        contentType: 'text/css',
        body: '@import "syncshell-dark.css";\n' + css,
      }),
    );
    await page.goto('/');
    await page.getByRole('button', { name: /Folder under test/ }).waitFor();
    await expect(page.locator('html')).toHaveCSS('color-scheme', 'dark');
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
        <div class="panel-${tone}"><h2 class="panel-heading">Notification</h2></div></article>`,
        )
        .join('');
      document.body.prepend(gallery);
    });
    for (const tone of ['success', 'warning', 'danger']) {
      const card = page.locator(`#omarchy-contrast [data-tone=${tone}]`);
      const button = card.locator(':scope > button');
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
          await expect(button).toHaveCSS(
            'outline',
            'rgb(148, 226, 213) solid 2px',
          );
        }
        if (state === 'active') await page.mouse.down();
        await expect(button).toHaveCSS('color', 'rgb(30, 30, 46)');
        expect(await contrast(button)).toBeGreaterThanOrEqual(4.5);
        fills.push(
          await button.evaluate((el) => getComputedStyle(el).backgroundColor),
        );
        if (state === 'active') await page.mouse.up();
      }
      expect(new Set(fills).size).toBe(3);
      for (const selector of ['.alert', '.panel-heading']) {
        const element = card.locator(selector);
        await expect(element).toHaveCSS('color', 'rgb(30, 30, 46)');
        expect(await contrast(element)).toBeGreaterThanOrEqual(4.5);
      }
      for (const control of await card.locator('a, .btn-link').all()) {
        await control.focus();
        await page.keyboard.press('Shift+Tab');
        await page.keyboard.press('Tab');
        await expect(control).toBeFocused();
        await expect(control).toHaveCSS('color', 'rgb(30, 30, 46)');
        await expect(control).toHaveCSS('outline', 'rgb(30, 30, 46) solid 2px');
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
  });
}

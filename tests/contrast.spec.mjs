import { test, expect } from './playwright-fixtures.mjs';

// Modern pairs: normal, hover/focus, pointer-active (minimum 4.509:1).
const backgrounds = {
  light: [
    ['#2ecc71', '#25a25a', '#1e854a'],
    ['#f1c40f', '#c29d0b', '#a08209'],
    ['#d62c1a', '#d62c1a', '#b62516'],
  ],
  dark: [
    ['#198754', '#146c43', '#146c43'],
    ['#806700', '#6c5700', '#6c5700'],
    ['#b62516', '#951e12', '#951e12'],
  ],
};
const rgb = (hex) =>
  `rgb(${hex
    .slice(1)
    .match(/../g)
    .map((v) => parseInt(v, 16))
    .join(', ')})`;
async function pair(element, foreground, background) {
  const actual = await element.evaluate((el) => {
    const style = getComputedStyle(el);
    return [style.color, style.backgroundColor];
  });
  expect(actual).toEqual([foreground, background].map(rgb));
}

async function alertControls(page, alert, foreground) {
  for (const control of await alert.locator('a:not(.btn), .btn-link').all()) {
    for (const state of ['normal', 'hover', 'focus', 'active']) {
      if (state === 'hover' || state === 'active') await control.hover();
      if (state === 'focus') {
        await control.focus();
        await page.keyboard.press('Shift+Tab');
        await page.keyboard.press('Tab');
        await expect(control).toBeFocused();
        await expect(control).toHaveCSS(
          'outline',
          `${rgb(foreground)} solid 2px`,
        );
        await expect(control).toHaveCSS('outline-offset', '2px');
      }
      if (state === 'active') await page.mouse.down();
      await expect(control).toHaveCSS('color', rgb(foreground));
      if (state === 'active') await page.mouse.up();
    }
  }
  for (const link of await alert.locator('a:not(.btn)').all())
    await expect(link).toHaveCSS('text-decoration-line', 'underline');
}

for (const scheme of ['light', 'dark']) {
  for (const [index, tone] of ['success', 'warning', 'danger'].entries()) {
    test(`${scheme} ${tone} matches corrected semantic colors`, async ({
      page,
      syncthing,
    }) => {
      syncthing.configure();
      await page.emulateMedia({ colorScheme: scheme });
      await page.goto('/');
      await page.getByRole('button', { name: /Folder under test/ }).waitFor();
      await page.evaluate((tone) => {
        const gallery = document.createElement('section');
        gallery.id = 'contrast-gallery';
        gallery.style.padding = '24px';
        gallery.innerHTML = `<button class="btn btn-${tone}">${tone}</button>
          <div class="modal-header alert alert-${tone}"><h4 class="modal-title">
            <svg stroke="currentColor" width="16" height="16"><path d="M2 2L14 14"/></svg>
            ${tone} header</h4><span>${tone} alert text</span>
            <a href="#" class="alert-link">Alert link</a><a href="#">Plain link</a>
            <button class="btn btn-link" aria-label="Close">×</button></div>`;
        document.body.prepend(gallery);
      }, tone);
      const [normal, hover, active] = backgrounds[scheme][index];
      const foreground =
        scheme === 'light' && tone !== 'danger' ? '#000000' : '#ffffff';
      const button = page.locator('#contrast-gallery > button');
      for (const [state, background] of [
        ['normal', normal],
        ['hover', hover],
        ['focus', hover],
        ['.focus', hover],
        ['active', active],
        ['.active', scheme === 'light' ? hover : normal],
        ['disabled', normal],
      ]) {
        await button.evaluate((el, state) => {
          el.disabled = state === 'disabled';
          for (const name of ['focus', 'active'])
            el.classList.toggle(name, state === '.' + name);
          el.blur();
        }, state);
        await page.mouse.move(0, 0);
        if (state === 'hover' || state === 'active') await button.hover();
        if (state === 'focus') {
          await button.focus();
          await page.keyboard.press('Shift+Tab');
          await page.keyboard.press('Tab');
          await expect(button).toBeFocused();
          if (scheme === 'dark') {
            await expect(button).toHaveCSS(
              'outline',
              'rgb(63, 169, 240) solid 2px',
            );
            // Keep Modern's existing focus pair (5.794:1), not stock's none.
            await expect(button).toHaveCSS('outline-offset', '2px');
            await expect(page.locator('body')).toHaveCSS(
              'background-color',
              rgb('#272727'),
            );
          }
        }
        if (state === 'active') await page.mouse.down();
        await pair(button, foreground, background);
        if (state === 'active') await page.mouse.up();
        if (state === 'disabled')
          await expect(button).toHaveCSS('opacity', '0.65');
      }
      const alert = page.locator('#contrast-gallery .alert');
      const alertForeground = scheme === 'light' ? '#000000' : '#ffffff';
      await pair(
        alert,
        alertForeground,
        scheme === 'light' && tone === 'danger' ? '#e74c3c' : normal,
      );
      await expect(alert.locator('h4')).toHaveCSS(
        'color',
        rgb(alertForeground),
      );
      await expect(alert.locator('svg')).toHaveCSS(
        'stroke',
        rgb(alertForeground),
      );
      await alertControls(page, alert, alertForeground);
    });
  }
}

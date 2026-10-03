import { cp, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const output = resolve(root, 'dist');
await cp(resolve(root, 'static'), output, { recursive: true });
await cp(
  resolve(root, 'LICENSE.syncthing'),
  resolve(output, 'LICENSE.syncthing'),
);
await cp(resolve(root, 'licenses'), resolve(output, 'licenses'), {
  recursive: true,
});
// Own the layer here so hosts can import either mode without cascade knowledge.
for (const theme of ['dark', 'light']) {
  const css = await readFile(resolve(root, 'themes', `${theme}.css`), 'utf8');
  await writeFile(
    resolve(output, 'assets/css', `syncshell-${theme}.css`),
    `@layer theme {\n${css}\n}\n`,
  );
}
const cssPath = resolve(output, 'assets/css/theme.css');
const css = await readFile(cssPath, 'utf8');
await writeFile(
  cssPath,
  css.replaceAll(
    /\.\.\/\.\.\/theme-assets\/(dark|light)\/assets\/css\/theme.css/g,
    'syncshell-$1.css',
  ),
);

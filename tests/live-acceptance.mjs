import { execFileSync } from 'node:child_process';
import { describe, test } from 'node:test';
import { resolve } from 'node:path';

const suites = [
  ['authentication', 'live-auth.mjs'],
  ['configuration', 'live-config.mjs'],
  ['archived versions', 'live-versions.mjs'],
  ['installed themes', 'installed.mjs'],
];

describe('live Syncthing acceptance', { concurrency: false }, () => {
  for (const [name, file] of suites) {
    test(name, () => {
      // Each suite mutates the same disposable daemon and must finish cleanup.
      execFileSync(process.execPath, [resolve(import.meta.dirname, file)], {
        stdio: 'inherit',
      });
    });
  }
});

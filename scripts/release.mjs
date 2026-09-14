import {
  cp,
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  rm,
  writeFile,
} from 'node:fs/promises';
import { resolve, relative } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const root = resolve(import.meta.dirname, '..');
const version = process.argv[2];
if (!/^\d+\.\d+\.\d+(?:-[a-zA-Z0-9.-]+)?$/.test(version || '')) {
  throw new Error('Usage: npm run release -- X.Y.Z [output-directory]');
}
const metadata = JSON.parse(await readFile(resolve(root, 'package.json')));
if (metadata.version !== version)
  throw new Error('Version must match package.json');
const source = execFileSync('git', ['rev-parse', 'HEAD'], {
  cwd: root,
  encoding: 'utf8',
}).trim();
if (
  execFileSync('git', ['status', '--porcelain', '--untracked-files=normal'], {
    cwd: root,
    encoding: 'utf8',
  }).trim()
)
  throw new Error('Commit source changes before packaging');
const epoch = execFileSync('git', ['show', '-s', '--format=%ct', 'HEAD'], {
  cwd: root,
  encoding: 'utf8',
}).trim();
const output = resolve(process.argv[3] || resolve(root, 'release'));
await mkdir(output, { recursive: true });
const temporary = await mkdtemp(resolve(tmpdir(), 'syncshell-webui-release-'));
const name = `syncshell-webui-v${version}`;
const bundle = resolve(temporary, name);
try {
  execFileSync('npm', ['run', 'build'], { cwd: root, stdio: 'inherit' });
  await cp(resolve(root, 'dist'), resolve(bundle, 'gui/syncshell-modern'), {
    recursive: true,
  });
  await cp(resolve(root, 'integration'), resolve(bundle, 'integration'), {
    recursive: true,
  });
  await cp(resolve(root, 'scripts/install.sh'), resolve(bundle, 'install.sh'));
  await writeFile(
    resolve(bundle, 'manifest.json'),
    JSON.stringify(
      {
        name: 'syncshell-webui',
        version,
        source,
        testedSyncthing: ['2.1.3'],
        integrationFormat: 1,
      },
      null,
      2,
    ) + '\n',
  );
  async function files(directory) {
    const result = [];
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = resolve(directory, entry.name);
      if (entry.isDirectory()) result.push(...(await files(path)));
      else if (entry.isFile()) result.push(path);
      else throw new Error('Release contains a nonregular asset: ' + path);
    }
    return result;
  }
  const sums = [];
  for (const path of (await files(bundle)).sort()) {
    sums.push(
      createHash('sha256')
        .update(await readFile(path))
        .digest('hex') +
        '  ' +
        relative(bundle, path),
    );
  }
  await writeFile(resolve(bundle, 'SHA256SUMS'), sums.join('\n') + '\n');
  const archive = resolve(output, name + '.tar.gz');
  execFileSync('tar', [
    '--sort=name',
    `--mtime=@${epoch}`,
    '--owner=0',
    '--group=0',
    '--numeric-owner',
    '-czf',
    archive,
    '-C',
    temporary,
    name,
  ]);
  const digest = createHash('sha256')
    .update(await readFile(archive))
    .digest('hex');
  await writeFile(archive + '.sha256', `${digest}  ${name}.tar.gz\n`);
  console.log(archive + '\n' + digest);
} finally {
  await rm(temporary, { recursive: true, force: true });
}

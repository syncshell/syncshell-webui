import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  cp,
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  rm,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { relative, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');

function git(args) {
  return execFileSync('git', args, {
    cwd: root,
    encoding: 'utf8',
  }).trim();
}

async function validateRelease(version) {
  if (!/^\d+\.\d+\.\d+(?:-[a-zA-Z0-9.-]+)?$/.test(version || '')) {
    throw new Error('Usage: npm run release -- X.Y.Z [output-directory]');
  }
  const metadata = JSON.parse(await readFile(resolve(root, 'package.json')));
  if (metadata.version !== version)
    throw new Error('Version must match package.json');
  if (git(['status', '--porcelain', '--untracked-files=normal']))
    throw new Error('Commit source changes before packaging');
  return {
    epoch: git(['show', '-s', '--format=%ct', 'HEAD']),
    source: git(['rev-parse', 'HEAD']),
  };
}

async function collectFiles(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await collectFiles(path)));
    else if (entry.isFile()) files.push(path);
    else throw new Error('Release contains a nonregular asset: ' + path);
  }
  return files;
}

async function buildBundle(bundle, version, source) {
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
}

async function writeBundleChecksums(bundle) {
  const sums = [];
  for (const path of (await collectFiles(bundle)).sort()) {
    sums.push(
      createHash('sha256')
        .update(await readFile(path))
        .digest('hex') +
        '  ' +
        relative(bundle, path),
    );
  }
  await writeFile(resolve(bundle, 'SHA256SUMS'), sums.join('\n') + '\n');
}

async function createArchive({ epoch, name, output, temporary }) {
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
  return { archive, digest };
}

async function packageRelease(version, output) {
  const { epoch, source } = await validateRelease(version);
  await mkdir(output, { recursive: true });
  const temporary = await mkdtemp(
    resolve(tmpdir(), 'syncshell-webui-release-'),
  );
  const name = `syncshell-webui-v${version}`;
  const bundle = resolve(temporary, name);
  try {
    await buildBundle(bundle, version, source);
    await writeBundleChecksums(bundle);
    return await createArchive({
      epoch,
      name,
      output,
      temporary,
    });
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
}

const version = process.argv[2];
const output = resolve(process.argv[3] || resolve(root, 'release'));
const { archive, digest } = await packageRelease(version, output);
console.log(archive + '\n' + digest);

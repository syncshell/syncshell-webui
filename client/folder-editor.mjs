import { cloneConfig, setValue } from './edit.mjs';

export const newFolderSavePhases = Object.freeze({
  editing: 'editing',
  loadingIgnores: 'loading-ignores',
  editingIgnores: 'editing-ignores',
  ignoreLoadFailed: 'ignore-load-failed',
});

export function reduceNewFolderSavePhase(phase, event) {
  switch (event) {
    case 'start-ignore-load':
      return newFolderSavePhases.loadingIgnores;
    case 'ignore-load-succeeded':
      return newFolderSavePhases.editingIgnores;
    case 'ignore-load-failed':
      return newFolderSavePhases.ignoreLoadFailed;
    default:
      return phase;
  }
}

const field = (path, label, type = 'text', options) => ({
  path,
  label,
  type,
  options,
});

export function folderEditorFields(tab) {
  if (tab === 'General') {
    return [
      field('label', 'Folder Label'),
      field('group', 'Folder Group'),
      field('id', 'Folder ID'),
      field('path', 'Folder Path'),
    ];
  }
  if (tab === 'File Versioning') {
    return [
      field('versioning.type', 'File Versioning', 'select', [
        { value: '', label: 'No File Versioning' },
        { value: 'trashcan', label: 'Trash Can' },
        { value: 'simple', label: 'Simple' },
        { value: 'staggered', label: 'Staggered' },
        { value: 'external', label: 'External' },
      ]),
      field('versioning.fsPath', 'Versions Path'),
      field('versioning.cleanupIntervalS', 'Cleanup Interval', 'number'),
    ];
  }
  return [
    field('type', 'Folder Type', 'select', [
      { value: 'sendreceive', label: 'Send & Receive' },
      { value: 'sendonly', label: 'Send Only' },
      { value: 'receiveonly', label: 'Receive Only' },
      { value: 'receiveencrypted', label: 'Receive Encrypted' },
    ]),
    field('fsWatcherEnabled', 'Watch for Changes', 'checkbox'),
    field('rescanIntervalS', 'Full Rescan Interval (s)', 'number'),
    field('ignorePerms', 'Ignore Permissions', 'checkbox'),
    field('blockIndexing', 'Block Indexing', 'checkbox'),
    field('order', 'File Pull Order', 'select', [
      { value: 'random', label: 'Random' },
      { value: 'alphabetic', label: 'Alphabetic' },
      { value: 'smallestFirst', label: 'Smallest First' },
      { value: 'largestFirst', label: 'Largest First' },
      { value: 'oldestFirst', label: 'Oldest First' },
      { value: 'newestFirst', label: 'Newest First' },
    ]),
    field('minDiskFree.value', 'Minimum Free Disk Space', 'number'),
    field('minDiskFree.unit', 'Unit', 'select', [
      { value: '%', label: '%' },
      { value: 'kB', label: 'kB' },
      { value: 'MB', label: 'MB' },
      { value: 'GB', label: 'GB' },
      { value: 'TB', label: 'TB' },
    ]),
    field('syncOwnership', 'Sync Ownership', 'checkbox'),
    field('sendOwnership', 'Send Ownership', 'checkbox'),
    field('syncXattrs', 'Sync Extended Attributes', 'checkbox'),
    field('sendXattrs', 'Send Extended Attributes', 'checkbox'),
    field(
      'xattrFilter.maxSingleEntrySize',
      'Maximum Single Entry Size',
      'number',
    ),
    field('xattrFilter.maxTotalSize', 'Maximum Total Size', 'number'),
  ];
}

export function folderPath(base, name, separator = '/') {
  return base ? base.replace(/[\\/]+$/, '') + separator + name : '';
}

export function updateFolderEditor(
  draft,
  path,
  value,
  { isNew, defaults, autoPath, config, system },
) {
  const next = setValue(draft, path, value);
  if (path === 'versioning.type' && value) {
    const versioningDefaults =
      value === 'simple'
        ? { keep: '5', cleanoutDays: '0' }
        : value === 'trashcan'
          ? { cleanoutDays: '0' }
          : value === 'staggered'
            ? { maxAge: String(365 * 86400) }
            : { command: '' };
    next.versioning.params = {
      ...versioningDefaults,
      ...next.versioning.params,
    };
    next.versioning.cleanupIntervalS ??= 3600;
    next.versioning.fsPath ??= '';
  }
  if (path === 'type') {
    next.fsWatcherEnabled = value !== 'receiveencrypted';
    if (value === 'receiveencrypted') {
      next.ignorePerms = true;
      next.versioning = { type: '' };
    }
    if (isNew || defaults)
      next.blockIndexing = ['sendreceive', 'receiveonly'].includes(value);
  }
  if (
    ['type', 'fsWatcherEnabled'].includes(path) &&
    [60, 3600, 86400].includes(next.rescanIntervalS)
  ) {
    next.rescanIntervalS =
      next.type === 'receiveencrypted'
        ? 86400
        : next.fsWatcherEnabled
          ? 3600
          : 60;
  }
  if (
    isNew &&
    autoPath &&
    ['label', 'id'].includes(path) &&
    config.defaults.folder.path
  ) {
    next.path = folderPath(
      config.defaults.folder.path,
      next.label || next.id,
      system.pathSeparator,
    );
  }
  return next;
}

export function folderEditorFieldState(field, draft, { isNew, defaults }) {
  const value = { ...field };
  if (
    field.path.startsWith('versioning.') &&
    field.path !== 'versioning.type' &&
    !['simple', 'trashcan', 'staggered'].includes(draft.versioning?.type)
  ) {
    value.hidden = true;
  }
  if (
    field.path.startsWith('xattrFilter.') &&
    !draft.syncXattrs &&
    !draft.sendXattrs
  ) {
    value.hidden = true;
  }
  if (field.path === 'type' && !isNew && !defaults) {
    value.disabled = draft.type === 'receiveencrypted';
    value.options = field.options.filter(
      (option) =>
        option.value !== 'receiveencrypted' || draft.type === option.value,
    );
  }
  value.disabled ||=
    (['fsWatcherEnabled', 'ignorePerms', 'versioning.type'].includes(
      field.path,
    ) &&
      draft.type === 'receiveencrypted') ||
    (field.path === 'order' && draft.type === 'sendonly') ||
    (['syncOwnership', 'syncXattrs'].includes(field.path) &&
      ['sendonly', 'receiveencrypted'].includes(draft.type)) ||
    (field.path === 'sendOwnership' &&
      (['receiveonly', 'receiveencrypted'].includes(draft.type) ||
        draft.syncOwnership)) ||
    (field.path === 'sendXattrs' &&
      (['receiveonly', 'receiveencrypted'].includes(draft.type) ||
        draft.syncXattrs));
  if (field.path === 'sendOwnership') {
    value.checked = draft.sendOwnership || draft.syncOwnership;
  }
  if (field.path === 'sendXattrs') {
    value.checked = draft.sendXattrs || draft.syncXattrs;
  }
  return value;
}

export function newXattrEntry(entries = []) {
  if (entries.some((entry) => entry.match === '')) return entries;
  const next = entries.slice();
  const entry = { match: '', permit: false };
  next.splice(
    next.at(-1)?.match === '*' ? next.length - 1 : next.length,
    0,
    entry,
  );
  return next;
}

export function xattrDefault(entries = []) {
  return !entries.length
    ? 'permit'
    : entries.at(-1).match !== '*'
      ? 'deny'
      : '';
}

export function xattrHint(entries = []) {
  return entries.length &&
    !(entries.length === 1 && entries[0].match === '*') &&
    entries.every((entry) => !entry.permit)
    ? 'Hint: only deny-rules detected while the default is deny. Consider adding "permit any" as last rule.'
    : '';
}

export function overlappingPath(draft, config, system) {
  if (!draft.path) return null;
  const parts = (path) =>
    path
      .replace(/^~(?=[\\/])/, system.tilde || '~')
      .split(system.pathSeparator || '/')
      .filter((part, index, all) => part || index !== all.length - 1);
  const candidate = parts(draft.path);
  for (const folder of config.folders.filter(
    (folder) => folder.id !== draft.id,
  )) {
    const existing = parts(folder.path);
    if (
      existing.length <= candidate.length &&
      existing.every((part, index) => part === candidate[index])
    ) {
      return { folder, type: 'subdirectory' };
    }
    if (
      candidate.length <= existing.length &&
      candidate.every((part, index) => part === existing[index])
    ) {
      return { folder, type: 'parent directory' };
    }
  }
  return null;
}

export function normalizeFolderEditor(draft) {
  const value = cloneConfig(draft);
  if (value.xattrFilter) {
    value.xattrFilter.entries = (value.xattrFilter.entries || []).filter(
      (entry) => entry.match !== '',
    );
  }
  const versioning = value.versioning || {};
  for (const key of versioning.type === 'simple'
    ? ['keep', 'cleanoutDays']
    : versioning.type === 'trashcan'
      ? ['cleanoutDays']
      : versioning.type === 'staggered'
        ? ['maxAge']
        : []) {
    const number = Number(versioning.params?.[key]);
    if (
      !Number.isFinite(number) ||
      number < (key === 'keep' ? 1 : 0) ||
      versioning.params[key] === ''
    ) {
      throw new Error(
        key === 'keep'
          ? 'You must keep at least one version.'
          : 'A negative number of days does not make sense.',
      );
    }
  }
  return value;
}

export async function saveFolderEditor({
  session,
  state,
  draft,
  isNew,
  defaults = false,
  ignores = [],
}) {
  const value = normalizeFolderEditor(draft);
  if (defaults) {
    return session.changeConfig((config) => {
      config.defaults.folder = value;
      config.defaults.ignores.lines = ignores;
    });
  }
  if (!value.id.trim()) throw new Error('The folder ID cannot be blank.');
  if (!value.path.trim()) throw new Error('The folder path cannot be blank.');
  if (isNew && state.config.folders.some((item) => item.id === value.id)) {
    throw new Error('The folder ID must be unique.');
  }
  if (!value.devices.some((item) => item.deviceID === state.system.myID)) {
    value.devices.push({ deviceID: state.system.myID });
  }
  if (!value.versioning?.type) value.versioning = { type: '' };
  if (
    value.versioning.type === 'external' &&
    !value.versioning.params?.command?.trim()
  ) {
    throw new Error('External Versioning Command cannot be blank.');
  }
  if (
    value.type !== 'receiveencrypted' &&
    value.devices.some(
      (member) =>
        (state.config.devices.find(
          (device) => device.deviceID === member.deviceID,
        )?.untrusted ||
          state.pendingFolders?.[value.id]?.offeredBy?.[member.deviceID]
            ?.remoteEncrypted) &&
        !member.encryptionPassword,
    )
  ) {
    throw new Error('Encryption Password is required for an untrusted device.');
  }
  return session.changeConfig((config) => {
    config.folders = [
      ...config.folders.filter((item) => item.id !== value.id),
      value,
    ];
  });
}

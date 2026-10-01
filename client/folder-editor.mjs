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

const field = (action, path, label, type = 'text', options) => ({
  action,
  path,
  label,
  type,
  options,
});

export function folderEditorFields(tab) {
  if (tab === 'General') {
    return [
      field('set-folder-label', 'label', 'Folder Label'),
      field('set-folder-group', 'group', 'Folder Group'),
      field('set-folder-id', 'id', 'Folder ID'),
      field('set-folder-path', 'path', 'Folder Path'),
    ];
  }
  if (tab === 'File Versioning') {
    return [
      field(
        'set-folder-versioning-type',
        'versioning.type',
        'File Versioning',
        'select',
        [
          { value: '', label: 'No File Versioning' },
          { value: 'trashcan', label: 'Trash Can' },
          { value: 'simple', label: 'Simple' },
          { value: 'staggered', label: 'Staggered' },
          { value: 'external', label: 'External' },
        ],
      ),
      field('set-folder-versions-path', 'versioning.fsPath', 'Versions Path'),
      field(
        'set-folder-cleanup-interval',
        'versioning.cleanupIntervalS',
        'Cleanup Interval',
        'number',
      ),
    ];
  }
  return [
    field('set-folder-type', 'type', 'Folder Type', 'select', [
      { value: 'sendreceive', label: 'Send & Receive' },
      { value: 'sendonly', label: 'Send Only' },
      { value: 'receiveonly', label: 'Receive Only' },
      { value: 'receiveencrypted', label: 'Receive Encrypted' },
    ]),
    field(
      'set-folder-watcher',
      'fsWatcherEnabled',
      'Watch for Changes',
      'checkbox',
    ),
    field(
      'set-folder-rescan-interval',
      'rescanIntervalS',
      'Full Rescan Interval (s)',
      'number',
    ),
    field(
      'set-folder-ignore-permissions',
      'ignorePerms',
      'Ignore Permissions',
      'checkbox',
    ),
    field(
      'set-folder-block-indexing',
      'blockIndexing',
      'Block Indexing',
      'checkbox',
    ),
    field('set-folder-pull-order', 'order', 'File Pull Order', 'select', [
      { value: 'random', label: 'Random' },
      { value: 'alphabetic', label: 'Alphabetic' },
      { value: 'smallestFirst', label: 'Smallest First' },
      { value: 'largestFirst', label: 'Largest First' },
      { value: 'oldestFirst', label: 'Oldest First' },
      { value: 'newestFirst', label: 'Newest First' },
    ]),
    field(
      'set-folder-minimum-free-space',
      'minDiskFree.value',
      'Minimum Free Disk Space',
      'number',
    ),
    field(
      'set-folder-minimum-free-unit',
      'minDiskFree.unit',
      'Unit',
      'select',
      [
        { value: '%', label: '%' },
        { value: 'kB', label: 'kB' },
        { value: 'MB', label: 'MB' },
        { value: 'GB', label: 'GB' },
        { value: 'TB', label: 'TB' },
      ],
    ),
    field(
      'set-folder-sync-ownership',
      'syncOwnership',
      'Sync Ownership',
      'checkbox',
    ),
    field(
      'set-folder-send-ownership',
      'sendOwnership',
      'Send Ownership',
      'checkbox',
    ),
    field(
      'set-folder-sync-xattrs',
      'syncXattrs',
      'Sync Extended Attributes',
      'checkbox',
    ),
    field(
      'set-folder-send-xattrs',
      'sendXattrs',
      'Send Extended Attributes',
      'checkbox',
    ),
    field(
      'set-folder-max-single-xattr-size',
      'xattrFilter.maxSingleEntrySize',
      'Maximum Single Entry Size',
      'number',
    ),
    field(
      'set-folder-max-total-xattr-size',
      'xattrFilter.maxTotalSize',
      'Maximum Total Size',
      'number',
    ),
  ];
}

export async function prepareFolderEditorAction(api, state, request) {
  const defaults = await api.get('config/defaults/folder');
  const random =
    typeof request.folder === 'string'
      ? null
      : (await api.get('svc/random/string', { length: 10 })).random;
  let folder = {
    ...defaults,
    id:
      typeof request.folder === 'string'
        ? request.folder
        : (random.slice(0, 5) + '-' + random.slice(5)).toLowerCase(),
    label: request.pending?.label || '',
    devices: [
      { deviceID: state.system.myID },
      ...(request.device ? [{ deviceID: request.device }] : []),
    ],
  };
  if (
    Object.values(state.pendingFolders[folder.id]?.offeredBy || {}).some(
      (offer) => offer.receiveEncrypted,
    )
  ) {
    folder = reduceFolderDraft(
      folder,
      { type: 'set-folder-type', value: 'receiveencrypted' },
      { isNew: true, config: state.config, system: state.system },
    );
  }
  return { ...request, folder };
}

export function folderPath(base, name, separator = '/') {
  return base ? base.replace(/[\\/]+$/, '') + separator + name : '';
}

const folderFieldPaths = {
  'set-folder-label': 'label',
  'set-folder-group': 'group',
  'set-folder-id': 'id',
  'set-folder-path': 'path',
  'set-folder-versioning-type': 'versioning.type',
  'set-folder-versions-path': 'versioning.fsPath',
  'set-folder-cleanup-interval': 'versioning.cleanupIntervalS',
  'set-folder-type': 'type',
  'set-folder-watcher': 'fsWatcherEnabled',
  'set-folder-rescan-interval': 'rescanIntervalS',
  'set-folder-ignore-permissions': 'ignorePerms',
  'set-folder-block-indexing': 'blockIndexing',
  'set-folder-pull-order': 'order',
  'set-folder-minimum-free-space': 'minDiskFree.value',
  'set-folder-minimum-free-unit': 'minDiskFree.unit',
  'set-folder-sync-ownership': 'syncOwnership',
  'set-folder-send-ownership': 'sendOwnership',
  'set-folder-sync-xattrs': 'syncXattrs',
  'set-folder-send-xattrs': 'sendXattrs',
  'set-folder-max-single-xattr-size': 'xattrFilter.maxSingleEntrySize',
  'set-folder-max-total-xattr-size': 'xattrFilter.maxTotalSize',
};

export function reduceFolderDraft(draft, action, context = {}) {
  let path = folderFieldPaths[action.type];
  let value = action.value;
  switch (action.type) {
    case 'set-folder-versioning-parameter':
      path = 'versioning.params.' + action.key;
      break;
    case 'set-folder-xattr-permit':
      path = 'xattrFilter.entries.' + action.index + '.permit';
      break;
    case 'set-folder-xattr-match':
      path = 'xattrFilter.entries.' + action.index + '.match';
      break;
    case 'remove-folder-xattr-rule':
      path = 'xattrFilter.entries';
      value = (draft.xattrFilter?.entries || []).filter(
        (_, index) => index !== action.index,
      );
      break;
    case 'add-folder-xattr-rule':
      path = 'xattrFilter.entries';
      value = newXattrEntry(draft.xattrFilter?.entries);
      break;
  }
  if (!path) return draft;

  const { isNew, defaults, autoPath, config, system } = context;
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

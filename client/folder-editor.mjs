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

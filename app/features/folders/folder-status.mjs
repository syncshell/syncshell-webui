// Copyright (C) 2014 The Syncthing Authors.
// SPDX-License-Identifier: MPL-2.0

const fallbackPresentation = {
  cardTone: 'info',
  summaryTone: 'info',
};

export const folderStatusPresentation = {
  'clean-waiting': {
    label: 'Waiting to Clean',
    icon: 'hourglass',
    cardTone: 'warning',
    summaryTone: 'warning',
  },
  cleaning: {
    label: 'Cleaning Versions',
    icon: 'recycle',
    cardTone: 'primary',
    summaryTone: 'warning',
  },
  error: { cardTone: 'danger', summaryTone: 'danger' },
  faileditems: {
    label: 'Failed Items',
    icon: 'circle-alert',
    cardTone: 'danger',
    summaryTone: 'danger',
  },
  idle: {
    label: 'Up to Date',
    icon: 'check',
    cardTone: 'success',
    summaryTone: 'success',
  },
  localadditions: {
    label: 'Local Additions',
    icon: 'check',
    cardTone: 'success',
    summaryTone: 'warning',
  },
  localunencrypted: {
    label: 'Unexpected Items',
    icon: 'circle-alert',
    cardTone: 'danger',
    summaryTone: 'danger',
  },
  outofsync: {
    label: 'Out of Sync',
    icon: 'circle-alert',
    cardTone: 'danger',
    summaryTone: 'warning',
  },
  paused: {
    label: 'Paused',
    icon: 'pause',
    cardTone: 'default',
    summaryTone: 'default',
  },
  'scan-waiting': {
    label: 'Waiting to Scan',
    icon: 'hourglass',
    cardTone: 'warning',
    summaryTone: 'warning',
  },
  scanning: {
    label: 'Scanning',
    icon: 'search',
    cardTone: 'primary',
    summaryTone: 'warning',
  },
  starting: {
    label: 'Starting',
    icon: 'hourglass',
    cardTone: 'primary',
    summaryTone: 'warning',
  },
  stopped: {
    label: 'Stopped',
    icon: 'stop',
    cardTone: 'danger',
    summaryTone: 'danger',
  },
  'sync-preparing': {
    label: 'Preparing to Sync',
    icon: 'hourglass',
    cardTone: 'primary',
    summaryTone: 'warning',
  },
  'sync-waiting': {
    label: 'Waiting to Sync',
    icon: 'hourglass',
    cardTone: 'warning',
    summaryTone: 'warning',
  },
  syncing: {
    label: 'Syncing',
    icon: 'refresh',
    cardTone: 'primary',
    summaryTone: 'warning',
  },
  unknown: {
    label: 'Unknown',
    icon: 'help',
    cardTone: 'info',
    summaryTone: 'info',
  },
  unshared: {
    label: 'Unshared',
    icon: 'unlink',
    cardTone: 'warning',
    summaryTone: 'warning',
  },
};

function presentation(status) {
  return folderStatusPresentation[status] || fallbackPresentation;
}

export function folderStatus(folder, info) {
  if (folder.paused) return 'paused';
  if (!info?.state) return 'unknown';
  const state = String(info.state);
  if (state === 'error') return 'stopped';
  if (state !== 'idle') return state;
  if (info.needTotalItems > 0) return 'outofsync';
  if (info.errors !== 0) return 'faileditems';
  if (
    ['receiveonly', 'receiveencrypted'].includes(folder.type) &&
    info.receiveOnlyTotalItems > 0
  ) {
    return folder.type === 'receiveonly'
      ? 'localadditions'
      : 'localunencrypted';
  }
  if (folder.devices.length <= 1) return 'unshared';
  return state;
}

export const folderClass = (status) => presentation(status).cardTone;
export const folderStateClass = (status) => presentation(status).summaryTone;
export const folderStatusIcon = (status) => presentation(status).icon;
export const folderStatusText = (status) => presentation(status).label;

export function folderStateDetails(folder, info) {
  return !!(
    info?.state &&
    !folder.paused &&
    (folderStatus(folder, info) !== 'idle' ||
      info.globalFiles !== info.localFiles ||
      info.globalDirectories !== info.localDirectories ||
      info.globalBytes !== info.localBytes)
  );
}

export function progressPercentage(current, total) {
  return current === total ? 99 : Math.floor((100 * current) / total);
}

export function syncPercentage(info) {
  if (!info || info.needTotalItems === 0) return 100;
  if (info.needBytes === 0 && info.needTotalItems > 0) return 95;
  return progressPercentage(info.inSyncBytes, info.globalBytes);
}

export function localStateTotal(models) {
  const total = { bytes: 0, directories: 0, files: 0 };
  for (const model of Object.values(models)) {
    total.bytes += model.localBytes;
    total.directories += model.localDirectories;
    total.files += model.localFiles;
  }
  return total;
}

export const folderTypes = {
  sendreceive: 'Send & Receive',
  sendonly: 'Send Only',
  receiveonly: 'Receive Only',
  receiveencrypted: 'Receive Encrypted',
};

export const pullOrders = {
  random: 'Random',
  alphabetic: 'Alphabetic',
  smallestFirst: 'Smallest First',
  largestFirst: 'Largest First',
  oldestFirst: 'Oldest First',
  newestFirst: 'Newest First',
};

export const versioningTypes = {
  trashcan: 'Trash Can',
  simple: 'Simple',
  staggered: 'Staggered',
  external: 'External',
};

export function scanRemaining(progress) {
  if (!progress) return '';
  let seconds =
    Math.ceil((progress.total - progress.current) / progress.rate / 10) * 10;
  let days = 0;
  let hours = 0;
  const result = [];
  if (seconds >= 86400) {
    days = Math.floor(seconds / 86400);
    if (days > 31) return '> 1 month';
    result.push(days + 'd');
    seconds %= 86400;
  }
  if (seconds > 3600) {
    hours = Math.floor(seconds / 3600);
    result.push(hours + 'h');
    seconds %= 3600;
  }
  const date = new Date(new Date(1970, 0, 1).setSeconds(seconds));
  if (days === 0) result.push(date.getMinutes() + 'm');
  if (days === 0 && hours === 0) {
    result.push(String(date.getSeconds()).padStart(2, '0') + 's');
  }
  return result.join(' ');
}

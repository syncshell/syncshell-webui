// Copyright (C) 2026 The Syncshell Authors.
// SPDX-License-Identifier: MPL-2.0

// Syncthing v2.1.3 folder_sendrecv.go inserts this before the last extension.
const marker = /^(.*)\.sync-conflict-\d{8}-\d{6}-[A-Z2-7]{7}(\..*)?$/;

export const parentPath = (path) =>
  path.includes('/') ? path.slice(0, path.lastIndexOf('/')) : '';

export const basename = (path) => path.slice(path.lastIndexOf('/') + 1);

export function originalPath(path) {
  const match = marker.exec(basename(path));
  if (!match) return null;
  const name = match[1] + (match[2] || '');
  if (marker.test(name)) return null;
  return (parentPath(path) ? parentPath(path) + '/' : '') + name;
}

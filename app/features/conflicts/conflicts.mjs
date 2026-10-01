// Copyright (C) 2026 The Syncshell Authors.
// SPDX-License-Identifier: MPL-2.0

import { basename, originalPath, parentPath } from './conflictFilename.mjs';

const usable = (file) =>
  file?.type === 'FILE_INFO_TYPE_FILE' &&
  !['deleted', 'ignored', 'invalid', 'mustRescan'].some((key) => file[key]);
async function record(api, folder, path, signal) {
  let info;
  try {
    info = await api.get('db/file', {
      query: { folder, file: path },
      signal,
    });
  } catch (error) {
    if (error.status === 404) return null;
    throw error;
  }
  if (!usable(info.global)) return null;
  const available = usable(info.local);
  const file = available ? info.local : info.global;
  return {
    path,
    name: basename(path),
    bytes: file.size,
    modified: file.modified,
    available,
    digest: available ? (file.blocksHash ?? null) : null,
  };
}
function* filenames(nodes, parent = '') {
  for (const node of nodes) {
    const path = parent ? parent + '/' + node.name : node.name;
    if (node.type === 'FILE_INFO_TYPE_DIRECTORY')
      yield* filenames(node.children || [], path);
    else if (node.type === 'FILE_INFO_TYPE_FILE') yield path;
  }
}
export async function folderConflicts(
  api,
  folder,
  { prefix = '', signal } = {},
) {
  const tree = await api.get('db/browse', {
    query: { folder: folder.id, prefix },
    signal,
  });
  const groups = new Map();
  for (const path of filenames(tree, prefix)) {
    const original = originalPath(path);
    if (!original) continue;
    const copy = await record(api, folder.id, path, signal);
    if (!copy) continue;
    if (!groups.has(original))
      groups.set(original, {
        id: JSON.stringify([folder.id, original]),
        folder: folder.id,
        folderName: folder.label || folder.id,
        root: folder.path,
        path: original,
        name: basename(original),
        copies: [],
        current: null,
      });
    groups.get(original).copies.push(copy);
  }
  for (const group of groups.values()) {
    group.current = await record(api, folder.id, group.path, signal);
    group.copies.sort((a, b) => b.name.localeCompare(a.name));
  }
  return [...groups.values()].sort((a, b) => a.path.localeCompare(b.path));
}
export async function listConflicts(api, folders, signal) {
  const results = await Promise.allSettled(
    folders.map((folder) => folderConflicts(api, folder, { signal })),
  );
  if (signal?.aborted) throw signal.reason;
  return {
    groups: results.flatMap((result) =>
      result.status === 'fulfilled' ? result.value : [],
    ),
    errors: results.flatMap((result, index) =>
      result.status === 'rejected'
        ? [
            (folders[index].label || folders[index].id) +
              ': ' +
              result.reason.message,
          ]
        : [],
    ),
  };
}
export async function recheckConflicts(api, folders, group, signal) {
  await api.post('db/scan', {
    query: group ? { folder: group.folder, sub: parentPath(group.path) } : {},
    signal,
  });
  if (!group) return listConflicts(api, folders, signal);
  const folder = folders.find((item) => item.id === group.folder);
  if (!folder) throw new Error('Folder is no longer configured');
  return {
    groups: await folderConflicts(api, folder, {
      prefix: parentPath(group.path),
      signal,
    }),
    errors: [],
  };
}
export function replaceDirectory(groups, group, updated) {
  const prefix = parentPath(group.path);
  return [
    ...groups.filter(
      (item) =>
        item.folder !== group.folder ||
        (prefix && !item.path.startsWith(prefix + '/')),
    ),
    ...updated,
  ];
}

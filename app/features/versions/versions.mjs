// Copyright (C) 2026 The Syncshell Authors.
// SPDX-License-Identifier: MPL-2.0

function versionDateBound(value, fallback) {
  if (!value) return { valid: true, time: fallback };
  const time = new Date(value).getTime();
  return { valid: Number.isFinite(time), time };
}

export function versionDateBounds(start = '', end = '') {
  const minimum = versionDateBound(start, -Infinity);
  const maximum = versionDateBound(end, Infinity);
  return {
    valid: minimum.valid && maximum.valid && minimum.time <= maximum.time,
    minimum: minimum.time,
    maximum: maximum.time,
  };
}

export function versionGroups(versions, search = '', start = '', end = '') {
  const groups = new Map();
  const query = search.toLowerCase().replaceAll('\\', '/');
  const bounds = versionDateBounds(start, end);
  if (!bounds.valid) return [];
  for (const [path, entries] of Object.entries(versions || {}).sort(
    ([a], [b]) => a.localeCompare(b),
  )) {
    if (!path.toLowerCase().includes(query)) continue;
    const visible = entries
      .filter((entry) => {
        const time = new Date(entry.versionTime).getTime();
        return time >= bounds.minimum && time <= bounds.maximum;
      })
      .sort((a, b) => new Date(b.versionTime) - new Date(a.versionTime));
    if (!visible.length) continue;
    const parent = path.includes('/')
      ? path.slice(0, path.lastIndexOf('/'))
      : '';
    if (!groups.has(parent)) groups.set(parent, []);
    groups.get(parent).push({ path, versions: visible });
  }
  return [...groups.entries()];
}
export const selectedVersions = (selections) =>
  Object.fromEntries(Object.entries(selections).filter(([, time]) => time));
export function selectVersions(selections, files, action) {
  const next = { ...selections };
  for (const file of files) {
    if (action === 'unset') delete next[file.path];
    else
      next[file.path] =
        file.versions[
          action === 'oldest' ? file.versions.length - 1 : 0
        ].versionTime;
  }
  return next;
}
export const versionActions = [
  { action: 'latest', label: 'Select latest version' },
  { action: 'oldest', label: 'Select oldest version' },
  { action: 'unset', label: 'Do not restore all' },
];

export async function restoreVersionSelection(api, folderId, selections) {
  const failures = await api.post('folder/versions', selections, {
    folder: folderId,
  });
  if (!Object.keys(failures).length) {
    return { complete: true, failures, selections: {}, versions: null };
  }
  return {
    complete: false,
    failures,
    selections: Object.fromEntries(
      Object.entries(selections).filter(([path]) => failures[path]),
    ),
    versions: await api.get('folder/versions', { folder: folderId }),
  };
}

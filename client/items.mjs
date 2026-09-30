export const itemViews = {
  need: {
    route: 'db/need',
    title: 'Out of Sync Items',
    icon: 'cloud-download',
  },
  failed: {
    route: 'folder/errors',
    title: 'Failed Items',
    icon: 'circle-alert',
  },
  local: {
    route: 'db/localchanged',
    title: 'Locally Changed Items',
    icon: 'circle-alert',
  },
};

export function neededItems(data) {
  return ['progress', 'queued', 'rest'].flatMap((type) =>
    (data[type] || []).map((file) => {
      const flags = file.flags;
      const action =
        (flags & 20480) === 20480
          ? 'Del (dir)'
          : flags & 4096
            ? 'Del'
            : flags & 16384
              ? 'Update'
              : 'Sync';
      return { ...file, type, action };
    }),
  );
}

export function pageItems(kind, data) {
  switch (kind) {
    case 'need':
      return neededItems(data);
    case 'failed':
      return data.errors || [];
    case 'local':
    default:
      return data.files || [];
  }
}

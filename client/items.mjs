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

const ITEM_FLAG_DELETED = 1 << 12;
const ITEM_FLAG_DIRECTORY = 1 << 14;
const ITEM_ACTION_FLAGS = ITEM_FLAG_DELETED | ITEM_FLAG_DIRECTORY;

function neededAction(flags) {
  switch (flags & ITEM_ACTION_FLAGS) {
    case ITEM_ACTION_FLAGS:
      return 'Del (dir)';
    case ITEM_FLAG_DELETED:
      return 'Del';
    case ITEM_FLAG_DIRECTORY:
      return 'Update';
    default:
      return 'Sync';
  }
}

export function neededItems(data) {
  return ['progress', 'queued', 'rest'].flatMap((type) =>
    (data[type] || []).map((file) => {
      const action = neededAction(file.flags);
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

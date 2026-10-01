export function createInitialState() {
  return {
    online: false,
    ready: false,
    error: null,
    config: { folders: [], devices: [], options: {}, gui: {} },
    system: {},
    version: {},
    model: {},
    scanProgress: {},
    folderStats: {},
    deviceStats: {},
    connections: {},
    connectionsTotal: {},
    completion: {},
    discoveryCache: {},
    pendingDevices: {},
    pendingFolders: {},
    globalChanges: [],
    errors: [],
    seenError: '',
    configInSync: true,
    downloadProgress: {},
    itemsRevision: {},
    upgradeInfo: null,
  };
}

export function reduceFolderEvent(state, event) {
  const data = event.data;
  switch (event.type) {
    case 'FolderSummary':
      return {
        ...state,
        model: { ...state.model, [data.folder]: data.summary },
      };
    case 'StateChanged': {
      if (!state.model[data.folder]) return state;
      const scanProgress = { ...state.scanProgress };
      if (data.to === 'scanning') delete scanProgress[data.folder];
      return {
        ...state,
        scanProgress,
        model: {
          ...state.model,
          [data.folder]: {
            ...state.model[data.folder],
            state: data.to,
            error: data.error,
          },
        },
      };
    }
    case 'FolderErrors':
      if (!state.model[data.folder]) return state;
      return {
        ...state,
        model: {
          ...state.model,
          [data.folder]: {
            ...state.model[data.folder],
            errors: data.errors.length,
          },
        },
      };
    case 'FolderScanProgress':
      return {
        ...state,
        scanProgress: {
          ...state.scanProgress,
          [data.folder]: {
            current: data.current,
            total: data.total,
            rate: data.rate,
          },
        },
      };
    default:
      return state;
  }
}

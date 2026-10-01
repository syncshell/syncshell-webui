import { completionTotal } from './connections.mjs';
import { endedTransfers, transferProgress } from './transfer.mjs';

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

export function reduceDaemonEvent(state, event) {
  const next = reduceFolderEvent(state, event);
  const data = event.data;

  switch (event.type) {
    case 'DownloadProgress': {
      const progress = transferProgress(data);
      const itemsRevision = { ...next.itemsRevision };
      for (const folder of endedTransfers(next.downloadProgress, progress))
        itemsRevision[folder] = (itemsRevision[folder] || 0) + 1;
      return { ...next, downloadProgress: progress, itemsRevision };
    }
    case 'FolderErrors':
    case 'LocalIndexUpdated':
    case 'RemoteIndexUpdated':
      return {
        ...next,
        itemsRevision: {
          ...next.itemsRevision,
          [data.folder]: (next.itemsRevision[data.folder] || 0) + 1,
        },
      };
    case 'FolderCompletion':
      return {
        ...next,
        completion: {
          ...next.completion,
          [data.device]: completionTotal({
            ...next.completion[data.device],
            [data.folder]: data,
          }),
        },
      };
    case 'DeviceDisconnected':
      if (!next.connections[data.id]) return next;
      return {
        ...next,
        connections: {
          ...next.connections,
          [data.id]: { ...next.connections[data.id], connected: false },
        },
      };
    case 'ConfigSaved':
      return { ...next, config: data };
    default:
      return next;
  }
}

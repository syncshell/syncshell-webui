export function removeFolder(session, folderId) {
  return session.changeConfig((config) => {
    config.folders = config.folders.filter((folder) => folder.id !== folderId);
  });
}

export function removeDevice(session, deviceId) {
  return session.changeConfig((config) => {
    config.devices = config.devices.filter(
      (device) => device.deviceID !== deviceId,
    );
    for (const folder of config.folders) {
      folder.devices = folder.devices.filter(
        (device) => device.deviceID !== deviceId,
      );
    }
  });
}

export function overrideFolder(api, folderId) {
  return api.post('db/override', { query: { folder: folderId } });
}

export function revertFolder(api, folderId) {
  return api.post('db/revert', { query: { folder: folderId } });
}

export function performManagement(action, session, api) {
  switch (action.type) {
    case 'remove-folder':
      return removeFolder(session, action.folder.id);
    case 'remove-device':
      return removeDevice(session, action.device.deviceID);
    case 'override':
      return overrideFolder(api, action.folder.id);
    case 'revert':
      return revertFolder(api, action.folder.id);
    default:
      throw new Error('Unknown management action');
  }
}

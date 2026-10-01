export const managementActions = {
  'remove-folder': {
    title: 'Remove Folder',
    button: 'Yes',
    description: 'Are you sure you want to remove folder {%label%}?',
    detail: 'No files will be deleted as a result of this operation.',
  },
  'remove-device': {
    title: 'Remove Device',
    button: 'Yes',
    description: 'Are you sure you want to remove device {%name%}?',
  },
  override: {
    title: 'Override Changes',
    button: 'Override',
    description:
      'The folder content on other devices will be overwritten to become identical with this device. Files not present here will be deleted on other devices.',
    detail: 'Are you sure you want to override all remote changes?',
  },
  revert: {
    title: 'Revert Local Changes',
    button: 'Revert',
    description:
      'The folder content on this device will be overwritten to become identical with other devices. Files newly added here will be deleted.',
    detail: 'Are you sure you want to revert all local changes?',
  },
};
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
  return api.post('db/override', undefined, { folder: folderId });
}

export function revertFolder(api, folderId) {
  return api.post('db/revert', undefined, { folder: folderId });
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

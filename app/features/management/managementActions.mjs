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

import { setValue } from './edit.mjs';

const field = (path, label, type = 'text', options) => ({
  path,
  label,
  type,
  options,
});

export function deviceEditorFields(tab) {
  if (tab === 'General') {
    return [
      field('deviceID', 'Device ID'),
      field('name', 'Device Name'),
      field('group', 'Device Group'),
    ];
  }
  return [
    field('addresses', 'Addresses', 'list'),
    field('compression', 'Compression', 'select', [
      { value: 'metadata', label: 'Metadata Only' },
      { value: 'always', label: 'All Data' },
      { value: 'never', label: 'Off' },
    ]),
    field('introducer', 'Introducer', 'checkbox'),
    field('autoAcceptFolders', 'Auto Accept', 'checkbox'),
    field('untrusted', 'Untrusted', 'checkbox'),
    field('maxRecvKbps', 'Incoming Rate Limit (KiB/s)', 'number'),
    field('maxSendKbps', 'Outgoing Rate Limit (KiB/s)', 'number'),
    field('numConnections', 'Number of Connections', 'number'),
  ];
}

export function updateDeviceEditor(draft, path, value) {
  const next = setValue(draft, path, value);
  if (path === 'untrusted' && value) {
    next.introducer = false;
    next.autoAcceptFolders = false;
  }
  return next;
}

export function deviceEditorFieldState(field, draft, myID) {
  return {
    ...field,
    disabled:
      (['introducer', 'autoAcceptFolders'].includes(field.path) &&
        draft.untrusted) ||
      (field.path === 'addresses' && draft.deviceID === myID),
  };
}

import { cloneConfig, setValue } from './edit.mjs';

const field = (action, path, label, type = 'text', options) => ({
  action,
  path,
  label,
  type,
  options,
});

export function deviceEditorFields(tab) {
  if (tab === 'General') {
    return [
      field('set-device-id', 'deviceID', 'Device ID'),
      field('set-device-name', 'name', 'Device Name'),
      field('set-device-group', 'group', 'Device Group'),
    ];
  }
  return [
    field('set-device-addresses', 'addresses', 'Addresses', 'list'),
    field('set-device-compression', 'compression', 'Compression', 'select', [
      { value: 'metadata', label: 'Metadata Only' },
      { value: 'always', label: 'All Data' },
      { value: 'never', label: 'Off' },
    ]),
    field('set-device-introducer', 'introducer', 'Introducer', 'checkbox'),
    field(
      'set-device-auto-accept',
      'autoAcceptFolders',
      'Auto Accept',
      'checkbox',
    ),
    field('set-device-untrusted', 'untrusted', 'Untrusted', 'checkbox'),
    field(
      'set-device-receive-limit',
      'maxRecvKbps',
      'Incoming Rate Limit (KiB/s)',
      'number',
    ),
    field(
      'set-device-send-limit',
      'maxSendKbps',
      'Outgoing Rate Limit (KiB/s)',
      'number',
    ),
    field(
      'set-device-connection-count',
      'numConnections',
      'Number of Connections',
      'number',
    ),
  ];
}

const deviceFieldPaths = {
  'set-device-id': 'deviceID',
  'set-device-name': 'name',
  'set-device-group': 'group',
  'set-device-addresses': 'addresses',
  'set-device-compression': 'compression',
  'set-device-introducer': 'introducer',
  'set-device-auto-accept': 'autoAcceptFolders',
  'set-device-untrusted': 'untrusted',
  'set-device-receive-limit': 'maxRecvKbps',
  'set-device-send-limit': 'maxSendKbps',
  'set-device-connection-count': 'numConnections',
};

export function reduceDeviceDraft(draft, action) {
  const path = deviceFieldPaths[action.type];
  if (!path) return draft;
  const next = setValue(draft, path, action.value);
  if (action.type === 'set-device-untrusted' && action.value) {
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

export async function saveDeviceEditor({
  session,
  api,
  state,
  draft,
  isNew,
  shares,
  defaults = false,
}) {
  const value = cloneConfig(draft);
  if (defaults) {
    return session.changeConfig((config) => {
      config.defaults.device = value;
    });
  }

  const checked = await api.get('svc/deviceid', { id: value.deviceID });
  if (checked.error) throw new Error(checked.error);
  value.deviceID = checked.id || value.deviceID;
  if (
    state.config.folders.some(
      (folder) =>
        folder.type !== 'receiveencrypted' &&
        (value.untrusted ||
          state.pendingFolders?.[folder.id]?.offeredBy?.[value.deviceID]
            ?.remoteEncrypted) &&
        shares[folder.id]?.selected &&
        !shares[folder.id]?.password,
    )
  ) {
    throw new Error('Encryption Password is required for an untrusted device.');
  }
  if (
    isNew &&
    state.config.devices.some((item) => item.deviceID === value.deviceID)
  ) {
    throw new Error('A device with that ID is already added.');
  }

  return session.changeConfig((config) => {
    config.devices = [
      ...config.devices.filter((item) => item.deviceID !== value.deviceID),
      value,
    ];
    for (const folder of config.folders) {
      const present = folder.devices.some(
        (item) => item.deviceID === value.deviceID,
      );
      if (shares[folder.id]?.selected && !present) {
        folder.devices.push({
          deviceID: value.deviceID,
          encryptionPassword: shares[folder.id].password || '',
        });
      }
      if (shares[folder.id]?.selected && present) {
        folder.devices.find(
          (item) => item.deviceID === value.deviceID,
        ).encryptionPassword = shares[folder.id].password || '';
      }
      if (!shares[folder.id]?.selected && present) {
        folder.devices = folder.devices.filter(
          (item) => item.deviceID !== value.deviceID,
        );
      }
    }
  });
}

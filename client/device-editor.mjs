import { cloneConfig, setValue } from './edit.mjs';

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

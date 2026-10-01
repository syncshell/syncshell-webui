export const deviceName = (device) =>
  device?.name || device?.deviceID?.slice(0, 7) || '';

export const sharedFolders = (config, id) =>
  config.folders.filter((folder) =>
    folder.devices.some((device) => device.deviceID === id),
  );

export function lastSeenDays(value) {
  const date = new Date(value);
  return !value || date.getTime() === 0
    ? undefined
    : (Date.now() - date) / 86400000;
}

export function deviceStatus(device, state) {
  const unused =
    sharedFolders(state.config, device.deviceID).length === 0 ? 'unused-' : '';
  const connection = state.connections[device.deviceID];
  if (!connection) return 'unknown';
  if (device.paused) return unused + 'paused';
  if (connection.connected) {
    return state.completion[device.deviceID]?._total === 100
      ? unused + 'insync'
      : 'syncing';
  }
  const age = lastSeenDays(state.deviceStats[device.deviceID]?.lastSeen);
  return (
    unused +
    (!unused && (!age || age >= 7) ? 'disconnected-inactive' : 'disconnected')
  );
}

export const deviceLabels = {
  unknown: 'Unknown',
  disconnected: 'Disconnected',
  'disconnected-inactive': 'Disconnected (Inactive)',
  insync: 'Up to Date',
  paused: 'Paused',
  syncing: 'Syncing',
  'unused-disconnected': 'Disconnected (Unused)',
  'unused-insync': 'Connected (Unused)',
  'unused-paused': 'Paused (Unused)',
};

export const deviceIcons = {
  disconnected: 'power',
  'disconnected-inactive': 'power',
  insync: 'check',
  paused: 'pause',
  syncing: 'refresh',
  unknown: 'help',
  'unused-disconnected': 'unlink',
  'unused-insync': 'unlink',
  'unused-paused': 'unlink',
};

export function deviceColor(device, state) {
  const connection = state.connections[device.deviceID];
  return !connection
    ? 'info'
    : device.paused
      ? 'default'
      : !connection.connected
        ? 'info'
        : state.completion[device.deviceID]?._total === 100
          ? 'success'
          : 'primary';
}

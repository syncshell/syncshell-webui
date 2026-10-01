export const deviceName = (device) =>
  device?.name || device?.deviceID?.slice(0, 7) || '';

export const sharedFolders = (config, id) =>
  config.folders.filter((folder) =>
    folder.devices.some((device) => device.deviceID === id),
  );

export function lastSeenDays(value) {
  if (!value) return undefined;
  const date = new Date(value);
  if (date.getTime() === 0) return undefined;
  return (Date.now() - date) / 86400000;
}

export function deviceStatus(device, state) {
  const unused =
    sharedFolders(state.config, device.deviceID).length === 0 ? 'unused-' : '';
  const connection = state.connections[device.deviceID];
  if (!connection) return 'unknown';
  if (device.paused) return unused + 'paused';
  if (connection.connected) {
    return state.completion[device.deviceID]?.totalPercentage === 100
      ? unused + 'insync'
      : 'syncing';
  }
  const age = lastSeenDays(state.deviceStats[device.deviceID]?.lastSeen);
  if (!unused && (age === undefined || age >= 7))
    return 'disconnected-inactive';
  return unused + 'disconnected';
}

export const devicePresentation = {
  unknown: { label: 'Unknown', icon: 'help' },
  disconnected: { label: 'Disconnected', icon: 'power' },
  'disconnected-inactive': {
    label: 'Disconnected (Inactive)',
    icon: 'power',
  },
  insync: { label: 'Up to Date', icon: 'check' },
  paused: { label: 'Paused', icon: 'pause' },
  syncing: { label: 'Syncing', icon: 'refresh' },
  'unused-disconnected': { label: 'Disconnected (Unused)', icon: 'unlink' },
  'unused-insync': { label: 'Connected (Unused)', icon: 'unlink' },
  'unused-paused': { label: 'Paused (Unused)', icon: 'unlink' },
};

export function deviceColor(device, state) {
  const connection = state.connections[device.deviceID];
  if (!connection) return 'info';
  if (device.paused) return 'default';
  if (!connection.connected) return 'info';
  if (state.completion[device.deviceID]?.totalPercentage === 100)
    return 'success';
  return 'primary';
}

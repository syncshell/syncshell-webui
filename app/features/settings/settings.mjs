import { cloneConfig } from '../../../client/edit.mjs';

const isUnixAddress = (address) =>
  address.startsWith('/') ||
  address.startsWith('unix://') ||
  address.startsWith('unixs://');
export const settingsTabs = [
  'General',
  'GUI',
  'Connections',
  'Ignored Devices',
  'Ignored Folders',
];
export const upgradeMode = (config) =>
  config.options.upgradeToPreReleases
    ? 'candidate'
    : config.options.autoUpgradeIntervalH > 0
      ? 'stable'
      : 'none';

const field = (path, label, type = 'text', options) => ({
  path,
  label,
  type,
  options,
});

function settingsFieldDescriptions(tab, config, myID) {
  if (tab === 'GUI') {
    return [
      field('gui.user', 'GUI Authentication User'),
      field('gui.password', 'GUI Authentication Password', 'password'),
      field('gui.address', 'GUI Listen Address'),
      field('gui.useTLS', 'Use HTTPS for GUI', 'checkbox'),
      field('gui.unixSocketPermissions', 'Unix Socket Permissions'),
    ];
  }
  if (tab === 'Connections') {
    return [
      field(
        'options.listenAddresses',
        'Sync Protocol Listen Addresses',
        'list',
      ),
      field('options.globalAnnounceEnabled', 'Global Discovery', 'checkbox'),
      field(
        'options.globalAnnounceServers',
        'Global Discovery Servers',
        'list',
      ),
      field('options.localAnnounceEnabled', 'Local Discovery', 'checkbox'),
      field('options.natEnabled', 'Enable NAT traversal', 'checkbox'),
      field('options.relaysEnabled', 'Enable Relaying', 'checkbox'),
      field('options.maxRecvKbps', 'Incoming Rate Limit (KiB/s)', 'number'),
      field('options.maxSendKbps', 'Outgoing Rate Limit (KiB/s)', 'number'),
      field(
        'options.limitBandwidthInLan',
        'Limit Bandwidth in LAN',
        'checkbox',
      ),
    ];
  }
  const self = config.devices.findIndex((device) => device.deviceID === myID);
  return [
    field('devices.' + self + '.name', 'Device Name'),
    field('options.startBrowser', 'Start Browser', 'checkbox'),
    field('options.minHomeDiskFree.value', 'Minimum Free Disk Space', 'number'),
    field('options.minHomeDiskFree.unit', 'Unit', 'select', [
      { value: '%', label: '%' },
      { value: 'kB', label: 'kB' },
      { value: 'MB', label: 'MB' },
      { value: 'GB', label: 'GB' },
      { value: 'TB', label: 'TB' },
    ]),
  ];
}

export function settingsFields(tab, draft, myID, themes) {
  const fields = settingsFieldDescriptions(tab, draft, myID).map((field) =>
    field.type === 'number' ? { ...field, min: 0, required: true } : field,
  );
  if (tab === 'General')
    return fields.filter((field) => field.path !== 'options.startBrowser');
  if (tab === 'GUI')
    return fields
      .filter(
        (field) =>
          field.path !== 'gui.unixSocketPermissions' ||
          isUnixAddress(draft.gui.address),
      )
      .concat([
        {
          path: 'options.startBrowser',
          label: 'Start Browser',
          type: 'checkbox',
        },
        ...(themes.length > 1
          ? [
              {
                path: 'gui.theme',
                label: 'GUI Theme',
                type: 'select',
                options: [...new Set([...themes, draft.gui.theme])]
                  .filter(Boolean)
                  .map((theme) => ({ value: theme, label: theme })),
              },
            ]
          : []),
      ]);
  return fields;
}
export function prepareSettingsForSave(
  draft,
  mode,
  system,
  version,
  supported,
) {
  const config = cloneConfig(draft);
  const options = config.options;
  if (supported) {
    options.autoUpgradeIntervalH =
      mode === 'none' ? 0 : options.autoUpgradeIntervalH || 12;
    options.upgradeToPreReleases = mode === 'candidate';
  }
  if (mode === 'candidate' || version.isCandidate) {
    options.urAccepted = system.urVersionMax;
    options.urSeen = system.urVersionMax;
  }
  for (const value of [
    options.minHomeDiskFree.value,
    options.maxRecvKbps,
    options.maxSendKbps,
  ]) {
    if (!Number.isFinite(value) || value < 0)
      throw new Error('Enter a non-negative number.');
  }
  const address = config.gui.address;
  if (!isUnixAddress(address)) {
    const port = Number(address.slice(address.lastIndexOf(':') + 1));
    if (
      !address.includes(':') ||
      !Number.isInteger(port) ||
      port < 1024 ||
      port > 65535
    )
      throw new Error('Enter a non-privileged port number (1024 - 65535).');
  } else if (!/^0?[0-7]{0,3}$/.test(config.gui.unixSocketPermissions || '')) {
    throw new Error('Enter up to three octal digits.');
  }
  return config;
}
export const ignoredFolders = (config) =>
  config.devices.flatMap((device) =>
    (device.ignoredFolders || []).map((folder) => ({ device, folder })),
  );
export function unignore(config, deviceID, folderID) {
  const next = cloneConfig(config);
  if (folderID !== undefined) {
    const device = next.devices.find((device) => device.deviceID === deviceID);
    device.ignoredFolders = device.ignoredFolders.filter(
      (folder) => folder.id !== folderID,
    );
  } else
    next.remoteIgnoredDevices = next.remoteIgnoredDevices.filter(
      (device) => device.deviceID !== deviceID,
    );
  return next;
}
export async function loadSettings(api, signal) {
  const [upgrade, themes] = await Promise.allSettled([
    api.get('system/upgrade', undefined, signal),
    fetch(new URL('themes.json', location.href), { signal }).then(
      (response) => {
        if (!response.ok) throw new Error('Could not load GUI themes');
        return response.json();
      },
    ),
  ]);
  return {
    upgrade: upgrade.status === 'fulfilled' ? upgrade.value : null,
    themes: themes.status === 'fulfilled' ? themes.value.themes : [],
  };
}
export function buildAdvancedConfigSections(config) {
  const sections = [
    { label: 'GUI', path: 'gui' },
    { label: 'LDAP', path: 'ldap' },
    { label: 'Options', path: 'options' },
    ...config.folders.map((folder, index) => ({
      label: 'Folder: ' + (folder.label || folder.id),
      path: 'folders.' + index,
    })),
    ...config.devices.map((device, index) => ({
      label: 'Device: ' + (device.name || device.deviceID),
      path: 'devices.' + index,
    })),
    { label: 'Default Folder', path: 'defaults.folder' },
    { label: 'Default Device', path: 'defaults.device' },
    { label: 'Default Ignore Patterns', path: 'defaults.ignores' },
  ];
  return sections.map(({ label, path }) => {
    const object = path.split('.').reduce((value, key) => value?.[key], config);
    const fields = Object.entries(object || {}).flatMap(([key, value]) => {
      if (
        key.startsWith('_') ||
        (value && !Array.isArray(value) && typeof value === 'object') ||
        (Array.isArray(value) &&
          value.some((item) => !['number', 'string'].includes(typeof item)))
      )
        return [];
      return [
        {
          path: path + '.' + key,
          label: key.replace(/([a-z])([A-Z])/g, '$1 $2'),
          type:
            key === 'lines'
              ? 'lines'
              : Array.isArray(value)
                ? 'list'
                : typeof value === 'boolean'
                  ? 'checkbox'
                  : typeof value === 'number'
                    ? 'number'
                    : 'text',
        },
      ];
    });
    return { label, path, fields };
  });
}

import { cloneConfig } from '../../core/config/configValues.mjs';
import { isUnixAddress } from './settings-address.mjs';

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

export const cloneConfig = (value) => JSON.parse(JSON.stringify(value));
export const getValue = (object, path) =>
  path.split('.').reduce((value, key) => value?.[key], object);
export function setValue(object, path, value) {
  const result = cloneConfig(object);
  const keys = path.split('.');
  let target = result;
  for (const key of keys.slice(0, -1)) target = target[key] ||= {};
  target[keys.at(-1)] = value;
  return result;
}
const field = (path, label, type = 'text', options) => ({
  path,
  label,
  type,
  options,
});
export function editorFields(tab, config, myID) {
  if (tab === 'GUI')
    return [
      field('gui.user', 'GUI Authentication User'),
      field('gui.password', 'GUI Authentication Password', 'password'),
      field('gui.address', 'GUI Listen Address'),
      field('gui.useTLS', 'Use HTTPS for GUI', 'checkbox'),
      field('gui.unixSocketPermissions', 'Unix Socket Permissions'),
    ];
  if (tab === 'Connections')
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

export function inputValue(draft, field) {
  const value = getValue(draft, field.path);
  return field.type === 'list' ? (value || []).join(', ') : (value ?? '');
}
export function changedValue(field, input) {
  if (field.type === 'checkbox') return input.checked;
  if (field.type === 'number')
    return input.value === '' ? 0 : Number(input.value);
  if (field.type === 'list')
    return input.value
      .split(/[,\s]+/)
      .map((value) => value.trim())
      .filter(Boolean);
  return input.value;
}
export function ignoreLines(text) {
  return text === '' ? [] : text.split('\n');
}

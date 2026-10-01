// explanations retained from the accepted Syncshell UI
import { DefinitionRow } from '../../ui/DefinitionRow.jsx';

export const deviceFieldHelp = {
  'Local State (Total)': {
    icon: 'house',
    help:
      'Local files and data indexed across all folders on this device. These totals do not ' +
      'indicate whether every folder is synchronized.',
  },
  Listeners: {
    icon: 'network',
    help:
      'Listening services that accept incoming device connections. Shows working services out of ' +
      'the total. Click the count for addresses and errors.',
  },
  Discovery: {
    icon: 'signpost',
    help:
      'Services used to find other devices. Shows working discovery methods out of the total. ' +
      'Click the count for details; discovery success does not mean a device is connected.',
  },
  Uptime: {
    icon: 'clock',
    help: 'Time since this Syncthing process started. Reloading the Web UI does not reset it.',
  },
  Identification: {
    icon: 'qrcode',
    help: 'Show the full device ID and QR code for this remote device.',
  },
  Version: {
    icon: 'tag',
    help: 'Syncthing client version reported by this remote device.',
  },
  'Device Status': {
    icon: 'help',
    help: 'Connection and synchronization status of this remote device.',
  },
  'Sync Status': {
    icon: 'cloud',
    help:
      'Last known synchronization progress across folders shared with this device. An offline ' +
      'device may have changed since its last connection.',
  },
  'Out of Sync Items': {
    icon: 'arrow-left-right',
    help:
      'Items still needed by this remote device across shared folders, including pending ' +
      'deletions. Click the count to view the remaining work.',
  },
  Address: {
    icon: 'link',
    help:
      'Address used for the current connection, or configured and discovered addresses to try ' +
      'while disconnected. Connection errors appear beside each address.',
  },
  'Last seen': {
    icon: 'eye',
    help: 'When this device was last seen connected. Never means no previous connection is recorded.',
  },
  'Number of Connections': {
    icon: 'shuffle',
    help:
      'Current connections to this device: one primary connection plus any additional ' +
      'connections.',
  },
  'Introduced By': {
    icon: 'handshake',
    help: 'The device that introduced this peer to this machine.',
  },
  Compression: {
    icon: 'minimize',
    help: 'Whether messages sent to this device are compressed: metadata only, all data, or off.',
  },
  'Allowed Networks': {
    icon: 'filter',
    help: 'Connections to this device are restricted to these networks.',
  },
  Introducer: {
    icon: 'thumbs-up',
    help: 'Automatically follows the devices this peer shares folders with.',
  },
  'Auto Accept': {
    icon: 'folder-input',
    help:
      'Automatically accepts folders offered by this device and adds them locally using the ' +
      'default folder path.',
  },
  Untrusted: {
    icon: 'shield-user',
    help: 'Only encrypted folder data may be shared with this device.',
  },
  Folders: {
    icon: 'folder',
    help:
      'Folders this machine shares with this device. Select a folder to edit its sharing ' +
      'settings.',
  },
  Encrypted: {
    icon: 'lock',
    help: 'Folder data is encrypted for this remote device.',
  },
  'Not Sharing': {
    icon: 'circle-alert',
    help: 'The remote device has not accepted sharing this folder.',
  },
  Paused: { icon: 'pause', help: 'The remote device has paused this folder.' },
  'Remote GUI': {
    icon: 'monitor',
    help: 'Remote GUI address is unavailable. A direct connection to this device is required.',
  },
  Pause: {
    icon: 'pause',
    help: 'Temporarily pause synchronization with this remote device.',
  },
  Resume: {
    icon: 'play',
    help: 'Resume synchronization with this remote device.',
  },
  Edit: {
    icon: 'pencil',
    help: 'Edit the configuration for this remote device.',
  },
};

export function DeviceDefinitionRow({ label, ...props }) {
  return (
    <DefinitionRow
      definition={deviceFieldHelp[label]}
      label={label}
      {...props}
    />
  );
}

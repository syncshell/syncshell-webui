import { timestamp } from '../../../client/format.mjs';

export function connectionType(connection) {
  if (!connection) return '-1';
  for (const type of ['relay', 'quic', 'tcp']) {
    if (connection.type?.startsWith(type)) {
      return type + (connection.isLocal ? 'lan' : 'wan');
    }
  }
  return 'disconnected';
}

export const connectionLabels = {
  relaywan: 'Relay WAN',
  relaylan: 'Relay LAN',
  quicwan: 'QUIC WAN',
  quiclan: 'QUIC LAN',
  tcpwan: 'TCP WAN',
  tcplan: 'TCP LAN',
};

export const connectionIcons = {
  tcplan: 'reception-4',
  quiclan: 'reception-4',
  tcpwan: 'reception-3',
  quicwan: 'reception-3',
  relaylan: 'reception-2',
  relaywan: 'reception-1',
  disconnected: 'reception-0',
};

export function remoteGui(device, connection) {
  if (
    !device.remoteGUIPort ||
    !connection?.connected ||
    !connection.address ||
    connection.type?.includes('Relay')
  ) {
    return '';
  }
  const index = connection.address.lastIndexOf(':');
  const address =
    index < 0
      ? connection.address
      : connection.address.slice(0, index) + ':' + device.remoteGUIPort;
  return 'http://' + address.replace(/%.*?\]:/, ']:').replace('%', '%25');
}

export function addressError(status) {
  return status?.error
    ? status.error.replace(/.+: /, '') +
        ' (' +
        timestamp(status.when).slice(-8) +
        ')'
    : '';
}

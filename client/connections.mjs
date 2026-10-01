// Copyright (C) 2014 The Syncthing Authors.
// SPDX-License-Identifier: MPL-2.0

// Session connection metrics and device-facing connection selectors.

import { timestamp } from './format.mjs';

export function completionTotal(folders = {}) {
  let bytes = 0;
  let needed = 0;
  let items = 0;
  let deletes = 0;
  for (const [key, folder] of Object.entries(folders)) {
    if (key.startsWith('_')) continue;
    bytes += folder.globalBytes;
    needed += folder.needBytes;
    items += folder.needItems;
    deletes += folder.needDeletes;
  }
  return {
    ...folders,
    _total:
      needed === 0 && items + deletes > 0
        ? 95
        : bytes === 0
          ? 100
          : Math.floor(100 * (1 - needed / bytes)),
    _needBytes: bytes === 0 ? 0 : needed,
    _needItems: bytes === 0 ? 0 : items + deletes,
  };
}

export function connectionRates(current, previous, elapsed) {
  const rate = (value = {}, old) => ({
    ...value,
    inbps:
      Number.isFinite(old?.inBytesTotal) && elapsed > 0
        ? Math.max(0, (value.inBytesTotal - old.inBytesTotal) / elapsed)
        : 0,
    outbps:
      Number.isFinite(old?.outBytesTotal) && elapsed > 0
        ? Math.max(0, (value.outBytesTotal - old.outBytesTotal) / elapsed)
        : 0,
  });
  return {
    connectionsTotal: rate(current.total, previous.connectionsTotal),
    connections: Object.fromEntries(
      Object.entries(current.connections || {}).map(([id, conn]) => [
        id,
        rate(conn, previous.connections?.[id]),
      ]),
    ),
  };
}

export function connectionType(conn) {
  if (!conn) return '-1';
  for (const type of ['relay', 'quic', 'tcp']) {
    if (conn.type?.startsWith(type))
      return type + (conn.isLocal ? 'lan' : 'wan');
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
export function remoteGui(device, conn) {
  if (
    !device.remoteGUIPort ||
    !conn?.connected ||
    !conn.address ||
    conn.type?.includes('Relay')
  )
    return '';
  const index = conn.address.lastIndexOf(':');
  const address =
    index < 0
      ? conn.address
      : conn.address.slice(0, index) + ':' + device.remoteGUIPort;
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
export function serviceHealth(services = {}) {
  const entries = Object.entries(services);
  const failed = entries.filter(([, value]) => value?.error);
  return {
    entries,
    failed,
    total: entries.length,
    running: entries.length - failed.length,
    color:
      entries.length && !failed.length
        ? 'success'
        : entries.length === failed.length
          ? 'danger'
          : '',
  };
}

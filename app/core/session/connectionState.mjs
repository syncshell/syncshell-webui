export function completionTotal(folders = {}) {
  let bytes = 0;
  let needed = 0;
  let items = 0;
  let deletes = 0;
  for (const folder of Object.values(folders)) {
    bytes += folder.globalBytes;
    needed += folder.needBytes;
    items += folder.needItems;
    deletes += folder.needDeletes;
  }
  return {
    folders,
    totalPercentage:
      needed === 0 && items + deletes > 0
        ? 95
        : bytes === 0
          ? 100
          : Math.floor(100 * (1 - needed / bytes)),
    neededBytes: bytes === 0 ? 0 : needed,
    neededItems: bytes === 0 ? 0 : items + deletes,
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
      Object.entries(current.connections || {}).map(([id, connection]) => [
        id,
        rate(connection, previous.connections?.[id]),
      ]),
    ),
  };
}

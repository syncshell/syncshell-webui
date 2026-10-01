const transferSegmentKeys = [
  'reused',
  'copiedFromOrigin',
  'copiedFromElsewhere',
  'pulled',
  'pulling',
];
const ACTIVE_TRANSFER_FLOOR = 1;

function transferPercentages(value) {
  const total = Number(value.total);
  const parts = Object.fromEntries(
    transferSegmentKeys.map((key) => [
      key,
      Number.isFinite(total) && total > 0
        ? (100 * (Number(value[key]) || 0)) / total
        : 0,
    ]),
  );
  const completed =
    parts.pulled +
    parts.copiedFromElsewhere +
    parts.copiedFromOrigin +
    parts.reused;
  if (
    total > 0 &&
    parts.pulling < ACTIVE_TRANSFER_FLOOR &&
    completed <= 100 - ACTIVE_TRANSFER_FLOOR
  ) {
    parts.pulling = ACTIVE_TRANSFER_FLOOR;
  }
  return parts;
}

export function transferProgress(stats) {
  return Object.fromEntries(
    Object.entries(stats).map(([folder, files]) => [
      folder,
      Object.fromEntries(
        Object.entries(files).map(([file, value]) => [
          file,
          {
            ...transferPercentages(value),
            bytesTotal: value.bytesTotal,
            bytesDone: value.bytesDone,
          },
        ]),
      ),
    ]),
  );
}

export function endedTransfers(previous, next) {
  return Object.keys(previous).filter((folder) =>
    Object.keys(previous[folder]).some((file) => !next[folder]?.[file]),
  );
}

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { transferProgress } from '../app/core/session/transferState.mjs';

test('transfer percentages guard missing totals and keep active work visible', () => {
  const progress = transferProgress({
    photos: {
      missing: { pulled: 1, bytesDone: 0, bytesTotal: 0 },
      active: {
        total: 1000,
        pulled: 500,
        pulling: 0,
        bytesDone: 500,
        bytesTotal: 1000,
      },
    },
  }).photos;

  assert.deepEqual(
    {
      reused: progress.missing.reused,
      copiedFromOrigin: progress.missing.copiedFromOrigin,
      copiedFromElsewhere: progress.missing.copiedFromElsewhere,
      pulled: progress.missing.pulled,
      pulling: progress.missing.pulling,
    },
    {
      reused: 0,
      copiedFromOrigin: 0,
      copiedFromElsewhere: 0,
      pulled: 0,
      pulling: 0,
    },
  );
  assert.equal(progress.active.pulled, 50);
  assert.equal(progress.active.pulling, 1);
});

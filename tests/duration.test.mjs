import assert from 'node:assert/strict';
import { test } from 'node:test';
import { duration, timestamp } from '../client/format.mjs';

test('durations use compact English units and truncate at the requested precision', () => {
  for (const [seconds, precision, expected] of [
    [0, 's', '0s'],
    [0, 'd', '0d'],
    [1, 's', '1s'],
    [59, 'm', '0m'],
    [60, 's', '1m'],
    [61, 'm', '1m'],
    [61, 's', '1m 1s'],
    [3600, 'm', '1h'],
    [90061, 'h', '1d 1h'],
    [86401, 'h', '1d 0h'],
    [90061, 's', '1d 1h 1m 1s'],
    [1860050, 's', '21d 12h 40m 50s'],
    [-61, 's', '1m 1s'],
    [undefined, 's', '0s'],
  ])
    assert.equal(duration(seconds, precision), expected);
  assert.equal(duration(61), '1m 1s');
  assert.throws(() => duration(1, 'weeks'), RangeError);
});

test('timestamps use local yyyy-MM-dd HH:mm:ss layout', () => {
  assert.equal(timestamp(new Date(2026, 8, 8, 1, 2, 3)), '2026-09-08 01:02:03');
  assert.equal(timestamp('invalid'), '');
});

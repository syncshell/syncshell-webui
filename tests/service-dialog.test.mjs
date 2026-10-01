import assert from 'node:assert/strict';
import { test } from 'node:test';
import { servicePresentation } from '../app/features/system/servicePresentation.mjs';

test('service phases select their title, tone and icon', () => {
  for (const [input, expected] of [
    [
      ['upgrade', 'confirm', '', false],
      { title: 'Upgrade', status: 'warning', icon: 'hourglass' },
    ],
    [
      ['upgrade', 'confirm', '', true],
      { title: 'Major Upgrade', status: 'danger', icon: 'hourglass' },
    ],
    [
      ['restart', 'working', '', false],
      { title: 'Restarting', status: 'info', icon: 'hourglass' },
    ],
    [
      ['shutdown', 'working', '', false],
      { title: 'Shutdown Complete', status: 'success', icon: 'hourglass' },
    ],
    [
      ['shutdown', 'waiting', '', false],
      { title: 'Shutdown Complete', status: 'success', icon: 'power' },
    ],
    [
      ['restart', 'waiting', 'service unavailable', false],
      { title: 'Error', status: 'danger', icon: 'hourglass' },
    ],
  ])
    assert.deepEqual(servicePresentation(...input), expected);
});

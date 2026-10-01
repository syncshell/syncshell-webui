import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  deviceColor,
  devicePresentation,
  deviceStatus,
} from '../app/features/devices/device-status.mjs';

const device = { deviceID: 'peer', paused: false };

function state(overrides = {}) {
  return {
    config: {
      folders: [{ devices: [{ deviceID: 'peer' }] }],
    },
    connections: { peer: { connected: true } },
    completion: { peer: { totalPercentage: 100 } },
    deviceStats: { peer: { lastSeen: new Date().toISOString() } },
    ...overrides,
  };
}

test('device status and color describe connection and sync decisions', () => {
  for (const { currentDevice, currentState, status, color } of [
    {
      currentDevice: device,
      currentState: state({ connections: {} }),
      status: 'unknown',
      color: 'info',
    },
    {
      currentDevice: { ...device, paused: true },
      currentState: state(),
      status: 'paused',
      color: 'default',
    },
    {
      currentDevice: device,
      currentState: state(),
      status: 'insync',
      color: 'success',
    },
    {
      currentDevice: device,
      currentState: state({
        completion: { peer: { totalPercentage: 75 } },
      }),
      status: 'syncing',
      color: 'primary',
    },
    {
      currentDevice: device,
      currentState: state({
        connections: { peer: { connected: false } },
      }),
      status: 'disconnected',
      color: 'info',
    },
    {
      currentDevice: device,
      currentState: state({
        connections: { peer: { connected: false } },
        deviceStats: {
          peer: { lastSeen: new Date(Date.now() - 8 * 86400000).toISOString() },
        },
      }),
      status: 'disconnected-inactive',
      color: 'info',
    },
    {
      currentDevice: device,
      currentState: state({
        config: { folders: [] },
        connections: { peer: { connected: false } },
      }),
      status: 'unused-disconnected',
      color: 'info',
    },
  ]) {
    assert.equal(deviceStatus(currentDevice, currentState), status);
    assert.equal(deviceColor(currentDevice, currentState), color);
    assert.ok(devicePresentation[status].label);
    assert.ok(devicePresentation[status].icon);
  }
});

// Copyright (C) 2014 The Syncthing Authors.
// SPDX-License-Identifier: MPL-2.0

import { deviceName } from '../devices/device-status.mjs';
import { folderStatus } from '../folders/folder-status.mjs';
import { notificationCards } from './notification-definitions.mjs';

function isGuiAuthenticated(config) {
  const gui = config.gui || {};
  return gui.authMode === 'ldap' || (gui.user && gui.password);
}

function createAuthenticationWarning(state, authenticated) {
  const gui = state.config.gui || {};
  const address = state.system.guiAddressUsed;
  if (
    !address ||
    address.startsWith('127.') ||
    address.startsWith('[::1]:') ||
    address.startsWith('/') ||
    authenticated ||
    gui.insecureAdminAccess
  ) {
    return null;
  }
  return {
    id: 'openNoAuth',
    severity: 'danger',
    title: 'Danger!',
    paragraphs: [
      'The Syncthing admin interface is configured to allow remote access without a password.',
      'This can easily give hackers access to read and change any files on your computer.',
      'Please set a GUI Authentication User and Password in the Settings dialog.',
    ],
    actions: ['Settings'],
  };
}

function createRestartWarning(state) {
  if (state.configInSync) return null;
  return {
    id: 'restart',
    severity: 'warning',
    title: 'Restart Needed',
    paragraphs: [
      'The configuration has been saved but not activated. Syncthing must restart to activate the new configuration.',
    ],
    actions: ['Restart'],
  };
}

function createAcknowledgementCards(config, authenticated) {
  return (config.options?.unackedNotificationIDs || []).flatMap((id) => {
    if (id === 'authenticationUserAndPassword' && authenticated) return [];
    if (!notificationCards[id]) return [];
    return {
      id,
      ...notificationCards[id],
      params: { syncthingInotify: 'syncthing-inotify' },
    };
  });
}

function createPendingDeviceCards(state) {
  return Object.entries(state.pendingDevices).map(([id, pending]) => ({
    id: 'device-' + id,
    kind: 'device',
    device: id,
    pending,
    severity: 'warning',
    title: 'New Device',
    time: pending.time,
    paragraphs: [
      'Device "{%name%}" ({%device%} at {%address%}) wants to connect. Add new device?',
    ],
    params: { name: pending.name, device: id, address: pending.address },
    actions: ['Add Device', 'Ignore', 'Dismiss'],
  }));
}

function createPendingFolderCards(state) {
  const config = state.config;
  return Object.entries(state.pendingFolders).flatMap(([folder, pending]) =>
    Object.entries(pending.offeredBy || {}).map(([device, offered]) => {
      const existing = config.folders.find((item) => item.id === folder);
      return {
        id: 'folder-' + folder + '-' + device,
        kind: 'folder',
        folder,
        device,
        pending: offered,
        folderConfig: existing,
        severity: 'warning',
        title: existing ? 'Share Folder' : 'New Folder',
        time: offered.time,
        paragraphs: [
          offered.label
            ? '{%device%} wants to share folder "{%folderlabel%}" ({%folder%}).'
            : '{%device%} wants to share folder "{%folder%}".',
          existing ? 'Share this folder?' : 'Add new folder?',
        ],
        params: {
          device: deviceName(
            config.devices.find((item) => item.deviceID === device),
          ),
          folder,
          folderlabel: offered.label,
        },
        actions: [existing ? 'Share' : 'Add', 'Ignore', 'Dismiss'],
      };
    }),
  );
}

function createErrorCard(state) {
  const errors = state.errors.filter(
    (error) => !state.seenError || error.when > state.seenError,
  );
  if (!errors.length) return null;
  return {
    id: 'errors',
    severity: 'warning',
    title: 'Notice',
    errors: errors.map((error) => ({
      ...error,
      message: state.config.devices.reduce(
        (text, device) => text.replace(device.deviceID, deviceName(device)),
        error.message,
      ),
    })),
    actions: ['OK'],
  };
}

function createWatcherCard(state) {
  const watchers = state.config.folders
    .filter(
      (folder) =>
        folder.fsWatcherEnabled &&
        !folder.paused &&
        state.model[folder.id]?.watchError &&
        folderStatus(folder, state.model[folder.id]) !== 'stopped',
    )
    .map((folder) => ({
      name: folder.label || folder.id,
      error: state.model[folder.id].watchError,
    }));
  if (!watchers.length) return null;
  return {
    id: 'watchers',
    severity: 'warning',
    title: 'Filesystem Watcher Errors',
    watchers,
    paragraphs: [
      "For the following folders an error occurred while starting to watch for changes. It will be retried every minute, so the errors might go away soon. If they persist, try to fix the underlying issue and ask for help if you can't.",
    ],
    link: 'https://forum.syncthing.net',
    actions: [],
  };
}

export function notices(state) {
  const authenticated = isGuiAuthenticated(state.config);
  return [
    createAuthenticationWarning(state, authenticated),
    createRestartWarning(state),
    ...createAcknowledgementCards(state.config, authenticated),
    ...createPendingDeviceCards(state),
    ...createPendingFolderCards(state),
    createErrorCard(state),
    createWatcherCard(state),
  ].filter(Boolean);
}

export async function noticeAction(session, card, action, open) {
  switch (action) {
    case 'Settings':
      open({ type: 'settings' });
      if (card.id === 'channelNotification') {
        await session.dismissNotification(card.id);
      }
      return;
    case 'Restart':
      return open({ type: 'restart' });
    case 'Ignore':
      return session.ignorePending(card.device, card.folder, card.pending);
    case 'Dismiss':
      return session.dismissPending(card.device, card.folder);
    case 'Share':
      if (
        card.folderConfig?.type !== 'receiveencrypted' &&
        card.pending.remoteEncrypted
      ) {
        const folder = JSON.parse(JSON.stringify(card.folderConfig));
        if (!folder.devices.some((member) => member.deviceID === card.device)) {
          folder.devices.push({
            deviceID: card.device,
            encryptionPassword: '',
          });
        }
        return open({ type: 'edit-folder', folder, tab: 'sharing' });
      }
      return session.changeConfig((config) => {
        const folder = config.folders.find((item) => item.id === card.folder);
        if (!folder.devices.some((item) => item.deviceID === card.device)) {
          folder.devices.push({ deviceID: card.device });
        }
      });
    case 'Add':
    case 'Add Device':
      open({
        type: card.kind === 'folder' ? 'add-folder' : 'add-device',
        ...card,
      });
      return;
    case 'Yes':
      if (card.id === 'fsWatcherNotification') {
        await session.changeConfig((config) => {
          for (const folder of config.folders)
            if (!folder.fsWatcherEnabled) {
              folder.fsWatcherEnabled = true;
              if (folder.rescanIntervalS)
                folder.rescanIntervalS = Math.min(
                  86400,
                  folder.rescanIntervalS * 60,
                );
            }
        });
      }
      break;
    case 'Enable Crash Reporting':
    case 'Disable Crash Reporting':
      await session.changeConfig((config) => {
        config.options.crashReportingEnabled = action.startsWith('Enable');
      });
      break;
    default:
      if (card.id === 'errors') return session.clearErrors();
  }
  return session.dismissNotification(card.id);
}

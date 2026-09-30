import { ShareStatus } from './ShareStatus.jsx';
import { useContext, useEffect, useRef, useState } from 'preact/hooks';
import { LocaleContext } from './locale-context.jsx';
import {
  deviceName,
  sharedFolders,
  deviceStatus,
  deviceLabels,
  deviceIcons,
  deviceColor,
  connectionType,
  connectionLabels,
  connectionIcons,
  lastSeenDays,
  addressError,
  remoteGui,
  serviceHealth,
} from '../client/devices.mjs';
import { localStateTotal } from '../client/folders.mjs';
import {
  unitPrefixed,
  compactNumber,
  duration,
  timestamp,
} from '../client/format.mjs';
import { stripeSections } from '../client/stripes.mjs';
import { Field } from './Field.jsx';
import { Counts } from './Counts.jsx';
import { Tooltip } from './Tooltip.jsx';
import { Identicon } from './Identicon.jsx';
import { Icon } from './Icon.jsx';
import { useDismissibleMenu } from './useDismissibleMenu.mjs';
import { runReportedSessionAction } from '../client/session.mjs';

export function Device({
  device,
  state,
  session,
  isLocalDevice = false,
  usesMetricRates,
  toggleUnits,
  onAction,
}) {
  const { t } = useContext(LocaleContext);
  const [open, setOpen] = useState(isLocalDevice);
  const [foldersOpen, setFoldersOpen] = useState(false);
  const panel = useRef();
  const foldersMenu = useRef();
  useDismissibleMenu(foldersMenu, foldersOpen, setFoldersOpen);
  useEffect(() => {
    if (open) return stripeSections(panel.current);
  }, [open]);
  const conn = isLocalDevice
    ? state.connectionsTotal
    : state.connections[device.deviceID] || {};
  const completion = state.completion[device.deviceID] || {};
  const folders = isLocalDevice
    ? state.config.folders
    : sharedFolders(state.config, device.deviceID);
  const status = deviceStatus(device, state);
  const type = connectionType(conn);
  const age = lastSeenDays(state.deviceStats[device.deviceID]?.lastSeen);
  const totals = localStateTotal(state.model);
  const listeners = serviceHealth(state.system.connectionServiceStatus);
  const discovery = serviceHealth(state.system.discoveryStatus);
  const gui = remoteGui(device, conn);
  const addresses = [
    ...(device.addresses || []).map((address) => ({
      address,
      source: 'Configured',
    })),
    ...(state.discoveryCache[device.deviceID]?.addresses || []).map(
      (address) => ({ address, source: 'Discovered' }),
    ),
  ];
  const openAction = (type, extra = {}) => onAction({ type, device, ...extra });
  const rate = (bytes) =>
    unitPrefixed(usesMetricRates ? bytes * 8 : bytes, !usesMetricRates) +
    (usesMetricRates ? 'bps' : 'B/s');
  const link = (event, action) => {
    event.preventDefault();
    openAction(action);
  };
  return (
    <div class="panel panel-default">
      <button
        class="btn panel-heading"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        {!isLocalDevice && status === 'syncing' && (
          <span
            class="panel-progress"
            style={{ width: completion._total + '%' }}
          />
        )}
        <span class="panel-title device-title">
          <Identicon id={device.deviceID} />
          {!isLocalDevice && (
            <span
              class={`panel-status pull-right text-${deviceColor(device, state)}`}
            >
              <span class="hidden-xs">{t(deviceLabels[status])}</span>
              {status === 'syncing' &&
                ` (${completion._total}%, ${unitPrefixed(completion._needBytes, true)}B)`}
              <Icon
                name={deviceIcons[status]}
                class="visible-xs icon-fixed"
                label={t(deviceLabels[status])}
              />
              <span class="inline-icon">
                <span
                  class={`reception reception-theme ${connectionIcons[type] || ''}`}
                />
              </span>
            </span>
          )}
          <span class="panel-title-text">
            <span class="device-name" title={deviceName(device)}>
              {deviceName(device)}
            </span>
            <small class="device-role text-success">
              ({t(isLocalDevice ? 'This Device' : 'Remote')})
            </small>
          </span>
        </span>
      </button>
      {open && (
        <div class="panel-collapse" ref={panel}>
          <div class="panel-body less-padding">
            {!isLocalDevice && (
              <table class="table table-condensed visible-xs remote-status">
                <tbody>
                  <Field label="Device Status" icon={deviceIcons[status]}>
                    {t(deviceLabels[status])}
                  </Field>
                </tbody>
              </table>
            )}
            {(isLocalDevice ||
              conn.connected ||
              folders.length > 0 ||
              completion._needItems > 0) && (
              <details class="device-details" open>
                <summary>{t('Current activity')}</summary>
                <table class="table table-condensed table-auto">
                  <tbody>
                    {!isLocalDevice &&
                      !conn.connected &&
                      folders.length > 0 && (
                        <Field label="Sync Status">
                          {completion._total === 100
                            ? t('Up to Date')
                            : completion._total < 100
                              ? t('Out of Sync') +
                                ' (' +
                                completion._total +
                                '%)'
                              : ''}
                        </Field>
                      )}
                    {(isLocalDevice || conn.connected) &&
                      ['in', 'out'].map((direction) => (
                        <Field
                          key={direction}
                          label={
                            direction === 'in' ? 'Download Rate' : 'Upload Rate'
                          }
                          icon={direction === 'in' ? 'download' : 'upload'}
                          help={
                            direction === 'in'
                              ? isLocalDevice
                                ? 'Incoming traffic across all connected devices. Click the rate to switch between bytes and bits per second. A configured limit appears below.'
                                : 'Data received by this machine from this remote device. Click the rate to switch between bytes and bits per second.'
                              : isLocalDevice
                                ? 'Outgoing traffic across all connected devices. Click the rate to switch between bytes and bits per second. A configured limit appears below.'
                                : 'Data sent by this machine to this remote device. Click the rate to switch between bytes and bits per second.'
                          }
                          totalBytes={conn[direction + 'BytesTotal']}
                        >
                          <a
                            href="#units"
                            onClick={(event) => {
                              event.preventDefault();
                              toggleUnits();
                            }}
                          >
                            {rate(conn[direction + 'bps'] || 0)}
                            {(isLocalDevice ? state.config.options : device)[
                              direction === 'in' ? 'maxRecvKbps' : 'maxSendKbps'
                            ] > 0 && (
                              <small>
                                <br />
                                <i class="text-muted">
                                  {t('Limit')}:{' '}
                                  {rate(
                                    (isLocalDevice
                                      ? state.config.options
                                      : device)[
                                      direction === 'in'
                                        ? 'maxRecvKbps'
                                        : 'maxSendKbps'
                                    ] * 1024,
                                  )}
                                  {isLocalDevice &&
                                    state.config.options.limitBandwidthInLan &&
                                    ` (${t('Applied to LAN')})`}
                                </i>
                              </small>
                            )}
                          </a>
                        </Field>
                      ))}
                    {isLocalDevice && (
                      <Field label="Local State (Total)">
                        <Counts
                          prefix="local"
                          info={{
                            localFiles: totals.files,
                            localDirectories: totals.directories,
                            localBytes: totals.bytes,
                          }}
                        />
                      </Field>
                    )}
                    {!isLocalDevice && completion._needItems > 0 && (
                      <Field label="Out of Sync Items">
                        <a
                          href="#remote-needed"
                          onClick={(event) => link(event, 'remote-needed')}
                        >
                          <Tooltip
                            icon="arrow-left-right"
                            label="Out of Sync Items"
                            text={`${completion._needItems.toLocaleString()} ${t('items')}, ~${unitPrefixed(completion._needBytes, true)}B`}
                          />
                          {compactNumber(completion._needItems)} {t('items')}, ~
                          {unitPrefixed(completion._needBytes, true)}B
                        </a>
                      </Field>
                    )}
                  </tbody>
                </table>
              </details>
            )}
            <details class="device-details" open>
              <summary>{t('Connectivity')}</summary>
              <table class="table table-condensed table-auto">
                <tbody>
                  {isLocalDevice ? (
                    <>
                      <Field label="Listeners">
                        <a
                          href="#listeners"
                          class={`text-${listeners.color}`}
                          onClick={(event) => link(event, 'listeners')}
                        >
                          {listeners.running}/{listeners.total}
                        </a>
                      </Field>
                      {state.system.discoveryEnabled && (
                        <Field label="Discovery">
                          <a
                            href="#discovery"
                            class={`text-${discovery.color}`}
                            onClick={(event) => link(event, 'discovery')}
                          >
                            {discovery.running}/{discovery.total}
                          </a>
                        </Field>
                      )}
                    </>
                  ) : (
                    <>
                      <Field label="Address">
                        {conn.connected
                          ? conn.address
                          : addresses.map((item, index) => (
                              <span class="remote-address" key={index}>
                                <span
                                  class="folder-text"
                                  title={t(item.source) + ': ' + item.address}
                                >
                                  {item.address}
                                </span>
                                {state.system.lastDialStatus?.[item.address]
                                  ?.error &&
                                  !device.paused && (
                                    <small
                                      class="text-danger"
                                      title={
                                        state.system.lastDialStatus[
                                          item.address
                                        ].error
                                      }
                                    >
                                      {addressError(
                                        state.system.lastDialStatus[
                                          item.address
                                        ],
                                      )}
                                    </small>
                                  )}
                              </span>
                            ))}
                      </Field>
                      {!conn.connected ? (
                        <Field label="Last seen">
                          {!age ? (
                            t('Never')
                          ) : (
                            <>
                              {timestamp(
                                state.deviceStats[device.deviceID].lastSeen,
                              )}
                              {age >= 7 && (
                                <>
                                  <br />
                                  <i
                                    class={
                                      age >= 365
                                        ? 'text-danger'
                                        : age >= 30
                                          ? 'text-warning'
                                          : ''
                                    }
                                  >
                                    {t(
                                      age >= 365
                                        ? 'More than a year ago'
                                        : age >= 30
                                          ? 'More than a month ago'
                                          : 'More than a week ago',
                                    )}
                                  </i>
                                </>
                              )}
                            </>
                          )}
                        </Field>
                      ) : (
                        <>
                          <Field
                            label="Connection Type"
                            icon="signal"
                            help="Transport and network used to reach this device. A relay forwards traffic when a direct connection is unavailable."
                          >
                            {t(connectionLabels[type] || 'Disconnected')}
                          </Field>
                          <Field label="Number of Connections">
                            1
                            {conn.secondary?.length
                              ? ' + ' + conn.secondary.length
                              : ''}
                          </Field>
                        </>
                      )}
                    </>
                  )}
                </tbody>
              </table>
            </details>
            <details class="device-details">
              <summary>{t('Device information')}</summary>
              <table class="table table-condensed table-auto">
                <tbody>
                  {isLocalDevice ? (
                    <>
                      <Field label="Uptime">
                        {duration(state.system.uptime, 'm')}
                      </Field>
                      <Field
                        label="Version"
                        help="Version and platform of the Syncthing service running on this device."
                      >
                        {state.version.version} ({state.version.os}{' '}
                        {state.version.arch})
                      </Field>
                    </>
                  ) : (
                    <>
                      {conn.clientVersion && (
                        <Field label="Version">{conn.clientVersion}</Field>
                      )}
                      {device.introducedBy && (
                        <Field label="Introduced By">
                          {deviceName(
                            state.config.devices.find(
                              (item) => item.deviceID === device.introducedBy,
                            ),
                          ) || device.introducedBy.slice(0, 7)}
                        </Field>
                      )}
                      <Field label="Compression">
                        {t(
                          {
                            always: 'All Data',
                            metadata: 'Metadata Only',
                            never: 'Off',
                          }[device.compression] || '',
                        )}
                      </Field>
                      {device.allowedNetworks?.length > 0 && (
                        <Field label="Allowed Networks">
                          {device.allowedNetworks.join(', ')}
                        </Field>
                      )}
                      {[
                        ['introducer', 'Introducer'],
                        ['autoAcceptFolders', 'Auto Accept'],
                        ['untrusted', 'Untrusted'],
                      ].map(
                        ([property, label]) =>
                          device[property] && (
                            <Field key={property} label={label}>
                              {t('Yes')}
                            </Field>
                          ),
                      )}
                    </>
                  )}
                </tbody>
              </table>
            </details>
          </div>
          <div class="panel-footer folder-actions device-actions">
            <button
              class="btn btn-sm btn-default"
              onClick={() => openAction('identification')}
            >
              <Icon name="qrcode" />
              &nbsp;{t('Identification')}
            </button>
            {folders.length > 0 && (
              <div
                ref={foldersMenu}
                class={`dropup folder-sharing device-folders ${foldersOpen ? 'open' : ''}`}
              >
                <button
                  class="btn btn-sm btn-default dropdown-toggle"
                  aria-expanded={foldersOpen}
                  onClick={() => setFoldersOpen(!foldersOpen)}
                >
                  <Icon name="folder" />
                  &nbsp;{t('Folders')} <span class="caret" />
                </button>
                <ul class="dropdown-menu">
                  {folders.map((folder) => (
                    <li key={folder.id}>
                      <a
                        href={isLocalDevice ? '#folder' : '#folder-sharing'}
                        onClick={(event) => {
                          event.preventDefault();
                          setFoldersOpen(false);
                          onAction({
                            type: 'edit-folder',
                            folder,
                            ...(isLocalDevice ? {} : { tab: 'sharing' }),
                          });
                        }}
                      >
                        {folder.label || folder.id}
                        {!isLocalDevice && (
                          <>
                            {' '}
                            <ShareStatus
                              encrypted={
                                folder.type === 'receiveencrypted' ||
                                !!folder.devices.find(
                                  (member) =>
                                    member.deviceID === device.deviceID,
                                )?.encryptionPassword
                              }
                              remoteState={
                                state.completion[device.deviceID]?.[folder.id]
                                  ?.remoteState
                              }
                            />
                          </>
                        )}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <span class="pull-right">
              {isLocalDevice ? (
                state.config.folders.length > 0 && (
                  <button
                    class="btn btn-sm btn-default"
                    onClick={() =>
                      runReportedSessionAction(
                        () =>
                          session.setPaused(
                            'folders',
                            undefined,
                            state.config.folders.some(
                              (folder) => !folder.paused,
                            ),
                          ),
                        session.reportError,
                      )
                    }
                  >
                    <Icon
                      name={
                        state.config.folders.some((folder) => !folder.paused)
                          ? 'pause'
                          : 'play'
                      }
                    />
                    &nbsp;
                    {t(
                      state.config.folders.some((folder) => !folder.paused)
                        ? 'Pause'
                        : 'Resume',
                    )}
                  </button>
                )
              ) : (
                <>
                  {device.remoteGUIPort > 0 && (
                    <a
                      class="btn btn-sm btn-default"
                      href={gui || undefined}
                      aria-disabled={!gui}
                    >
                      <Icon name="monitor" />
                      &nbsp;{t('Remote GUI')}
                    </a>
                  )}
                  <button
                    class="btn btn-sm btn-default"
                    onClick={() =>
                      runReportedSessionAction(
                        () =>
                          session.setPaused(
                            'devices',
                            device.deviceID,
                            !device.paused,
                          ),
                        session.reportError,
                      )
                    }
                  >
                    <Icon name={device.paused ? 'play' : 'pause'} />
                    &nbsp;{t(device.paused ? 'Resume' : 'Pause')}
                  </button>
                  <button
                    class="btn btn-sm btn-default"
                    onClick={() => openAction('edit-device')}
                  >
                    <Icon name="pencil" />
                    &nbsp;{t('Edit')}
                  </button>
                </>
              )}
              {isLocalDevice && (
                <button
                  class="btn btn-sm btn-default"
                  onClick={() => openAction('settings')}
                >
                  <Icon name="settings" />
                  &nbsp;{t('Settings')}
                </button>
              )}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

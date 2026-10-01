import { useState } from 'preact/hooks';
import { useLocale } from '../../core/locale/LocaleContext.jsx';
import {
  deviceName,
  sharedFolders,
  deviceStatus,
  devicePresentation,
} from './device-status.mjs';
import { connectionType, remoteGui } from './connections.mjs';
import { localStateTotal } from '../folders/folder-status.mjs';
import {
  unitPrefixed,
  compactNumber,
  duration,
} from '../../../client/format.mjs';
import { DeviceDefinitionRow } from './DeviceDefinitionRow.jsx';
import { FolderCounts } from '../folders/FolderCounts.jsx';
import { Tooltip } from '../../ui/Tooltip.jsx';
import { DeviceHeader } from './DeviceHeader.jsx';
import { DeviceActions } from './DeviceActions.jsx';
import { ConnectionDetails } from './ConnectionDetails.jsx';
import { TransferRates } from './TransferRates.jsx';
import './DeviceCard.css';

const deviceFlags = [
  { property: 'introducer', label: 'Introducer' },
  { property: 'autoAcceptFolders', label: 'Auto Accept' },
  { property: 'untrusted', label: 'Untrusted' },
];

export function DeviceCard({
  device,
  state,
  session,
  isLocalDevice = false,
  usesMetricRates,
  toggleUnits,
  onAction,
}) {
  const { t } = useLocale();
  const [open, setOpen] = useState(isLocalDevice);
  const conn = isLocalDevice
    ? state.connectionsTotal
    : state.connections[device.deviceID] || {};
  const completion = state.completion[device.deviceID] || {};
  const folders = isLocalDevice
    ? state.config.folders
    : sharedFolders(state.config, device.deviceID);
  const status = deviceStatus(device, state);
  const presentation = devicePresentation[status];
  const type = connectionType(conn);
  const totals = localStateTotal(state.model);
  const gui = remoteGui(device, conn);
  const openAction = (type, extra = {}) => onAction({ type, device, ...extra });
  const link = (event, action) => {
    event.preventDefault();
    openAction(action);
  };
  return (
    <div class="panel panel-default">
      <DeviceHeader
        completion={completion}
        device={device}
        isLocalDevice={isLocalDevice}
        open={open}
        state={state}
        status={status}
        type={type}
        onToggle={() => setOpen(!open)}
      />
      {open && (
        <div class="panel-collapse">
          <div class="panel-body less-padding">
            {!isLocalDevice && (
              <table class="table table-condensed visible-xs remote-status">
                <tbody>
                  <DeviceDefinitionRow
                    label="Device Status"
                    icon={presentation.icon}
                  >
                    {t(presentation.label)}
                  </DeviceDefinitionRow>
                </tbody>
              </table>
            )}
            {(isLocalDevice ||
              conn.connected ||
              folders.length > 0 ||
              completion.neededItems > 0) && (
              <details class="device-details" open>
                <summary>{t('Current activity')}</summary>
                <table class="table table-condensed table-striped table-auto">
                  <tbody>
                    {!isLocalDevice &&
                      !conn.connected &&
                      folders.length > 0 && (
                        <DeviceDefinitionRow label="Sync Status">
                          {completion.totalPercentage === 100
                            ? t('Up to Date')
                            : completion.totalPercentage < 100
                              ? t('Out of Sync') +
                                ' (' +
                                completion.totalPercentage +
                                '%)'
                              : ''}
                        </DeviceDefinitionRow>
                      )}
                    {(isLocalDevice || conn.connected) && (
                      <TransferRates
                        connection={conn}
                        device={device}
                        isLocalDevice={isLocalDevice}
                        options={state.config.options}
                        usesMetricRates={usesMetricRates}
                        onToggleUnits={toggleUnits}
                      />
                    )}
                    {isLocalDevice && (
                      <DeviceDefinitionRow label="Local State (Total)">
                        <FolderCounts
                          prefix="local"
                          info={{
                            localFiles: totals.files,
                            localDirectories: totals.directories,
                            localBytes: totals.bytes,
                          }}
                        />
                      </DeviceDefinitionRow>
                    )}
                    {!isLocalDevice && completion.neededItems > 0 && (
                      <DeviceDefinitionRow label="Out of Sync Items">
                        <a
                          href="#remote-needed"
                          onClick={(event) => link(event, 'remote-needed')}
                        >
                          <Tooltip
                            icon="arrow-left-right"
                            label="Out of Sync Items"
                            text={`${completion.neededItems.toLocaleString()} ${t('items')}, ~${unitPrefixed(completion.neededBytes, true)}B`}
                          />
                          {compactNumber(completion.neededItems)} {t('items')},
                          ~{unitPrefixed(completion.neededBytes, true)}B
                        </a>
                      </DeviceDefinitionRow>
                    )}
                  </tbody>
                </table>
              </details>
            )}
            <ConnectionDetails
              connection={conn}
              device={device}
              isLocalDevice={isLocalDevice}
              state={state}
              type={type}
              onAction={onAction}
            />
            <details class="device-details">
              <summary>{t('Device information')}</summary>
              <table class="table table-condensed table-striped table-auto">
                <tbody>
                  {isLocalDevice ? (
                    <>
                      <DeviceDefinitionRow label="Uptime">
                        {duration(state.system.uptime, 'm')}
                      </DeviceDefinitionRow>
                      <DeviceDefinitionRow
                        label="Version"
                        help="Version and platform of the Syncthing service running on this device."
                      >
                        {state.version.version} ({state.version.os}{' '}
                        {state.version.arch})
                      </DeviceDefinitionRow>
                    </>
                  ) : (
                    <>
                      {conn.clientVersion && (
                        <DeviceDefinitionRow label="Version">
                          {conn.clientVersion}
                        </DeviceDefinitionRow>
                      )}
                      {device.introducedBy && (
                        <DeviceDefinitionRow label="Introduced By">
                          {deviceName(
                            state.config.devices.find(
                              (item) => item.deviceID === device.introducedBy,
                            ),
                          ) || device.introducedBy.slice(0, 7)}
                        </DeviceDefinitionRow>
                      )}
                      <DeviceDefinitionRow label="Compression">
                        {t(
                          {
                            always: 'All Data',
                            metadata: 'Metadata Only',
                            never: 'Off',
                          }[device.compression] || '',
                        )}
                      </DeviceDefinitionRow>
                      {device.allowedNetworks?.length > 0 && (
                        <DeviceDefinitionRow label="Allowed Networks">
                          {device.allowedNetworks.join(', ')}
                        </DeviceDefinitionRow>
                      )}
                      {deviceFlags.map(
                        ({ property, label }) =>
                          device[property] && (
                            <DeviceDefinitionRow key={property} label={label}>
                              {t('Yes')}
                            </DeviceDefinitionRow>
                          ),
                      )}
                    </>
                  )}
                </tbody>
              </table>
            </details>
          </div>
          <DeviceActions
            device={device}
            folders={folders}
            gui={gui}
            isLocalDevice={isLocalDevice}
            session={session}
            state={state}
            onAction={onAction}
          />
        </div>
      )}
    </div>
  );
}

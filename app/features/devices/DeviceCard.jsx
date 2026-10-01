import { useContext, useEffect, useRef, useState } from 'preact/hooks';
import { LocaleContext } from '../../locale-context.jsx';
import {
  deviceName,
  sharedFolders,
  deviceStatus,
  deviceLabels,
  deviceIcons,
} from './device-status.mjs';
import { connectionType, remoteGui } from '../../../client/connections.mjs';
import { localStateTotal } from '../folders/folder-status.mjs';
import {
  unitPrefixed,
  compactNumber,
  duration,
} from '../../../client/format.mjs';
import { stripeSections } from '../../../client/stripes.mjs';
import { DefinitionRow } from '../../DefinitionRow.jsx';
import { FolderCounts } from '../folders/FolderCounts.jsx';
import { Tooltip } from '../../Tooltip.jsx';
import { DeviceHeader } from './DeviceHeader.jsx';
import { DeviceActions } from './DeviceActions.jsx';
import { ConnectionDetails } from './ConnectionDetails.jsx';
import { TransferRates } from './TransferRates.jsx';

export function DeviceCard({
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
  const panel = useRef();
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
        <div class="panel-collapse" ref={panel}>
          <div class="panel-body less-padding">
            {!isLocalDevice && (
              <table class="table table-condensed visible-xs remote-status">
                <tbody>
                  <DefinitionRow
                    label="Device Status"
                    icon={deviceIcons[status]}
                  >
                    {t(deviceLabels[status])}
                  </DefinitionRow>
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
                        <DefinitionRow label="Sync Status">
                          {completion._total === 100
                            ? t('Up to Date')
                            : completion._total < 100
                              ? t('Out of Sync') +
                                ' (' +
                                completion._total +
                                '%)'
                              : ''}
                        </DefinitionRow>
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
                      <DefinitionRow label="Local State (Total)">
                        <FolderCounts
                          prefix="local"
                          info={{
                            localFiles: totals.files,
                            localDirectories: totals.directories,
                            localBytes: totals.bytes,
                          }}
                        />
                      </DefinitionRow>
                    )}
                    {!isLocalDevice && completion._needItems > 0 && (
                      <DefinitionRow label="Out of Sync Items">
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
                      </DefinitionRow>
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
              <table class="table table-condensed table-auto">
                <tbody>
                  {isLocalDevice ? (
                    <>
                      <DefinitionRow label="Uptime">
                        {duration(state.system.uptime, 'm')}
                      </DefinitionRow>
                      <DefinitionRow
                        label="Version"
                        help="Version and platform of the Syncthing service running on this device."
                      >
                        {state.version.version} ({state.version.os}{' '}
                        {state.version.arch})
                      </DefinitionRow>
                    </>
                  ) : (
                    <>
                      {conn.clientVersion && (
                        <DefinitionRow label="Version">
                          {conn.clientVersion}
                        </DefinitionRow>
                      )}
                      {device.introducedBy && (
                        <DefinitionRow label="Introduced By">
                          {deviceName(
                            state.config.devices.find(
                              (item) => item.deviceID === device.introducedBy,
                            ),
                          ) || device.introducedBy.slice(0, 7)}
                        </DefinitionRow>
                      )}
                      <DefinitionRow label="Compression">
                        {t(
                          {
                            always: 'All Data',
                            metadata: 'Metadata Only',
                            never: 'Off',
                          }[device.compression] || '',
                        )}
                      </DefinitionRow>
                      {device.allowedNetworks?.length > 0 && (
                        <DefinitionRow label="Allowed Networks">
                          {device.allowedNetworks.join(', ')}
                        </DefinitionRow>
                      )}
                      {[
                        ['introducer', 'Introducer'],
                        ['autoAcceptFolders', 'Auto Accept'],
                        ['untrusted', 'Untrusted'],
                      ].map(
                        ([property, label]) =>
                          device[property] && (
                            <DefinitionRow key={property} label={label}>
                              {t('Yes')}
                            </DefinitionRow>
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

import { addressError, connectionLabels } from './connections.mjs';
import { timestamp } from '../../../client/format.mjs';
import { serviceHealth } from '../system/serviceHealth.mjs';
import { DeviceDefinitionRow } from './DeviceDefinitionRow.jsx';
import { useLocale } from '../../core/locale/LocaleContext.jsx';
import { lastSeenDays } from './device-status.mjs';

export function ConnectionDetails({
  connection,
  device,
  isLocalDevice,
  state,
  type,
  onAction,
}) {
  const { t } = useLocale();
  const age = lastSeenDays(state.deviceStats[device.deviceID]?.lastSeen);
  const listeners = serviceHealth(state.system.connectionServiceStatus);
  const discovery = serviceHealth(state.system.discoveryStatus);
  const addresses = [
    ...(device.addresses || []).map((address) => ({
      address,
      source: 'Configured',
    })),
    ...(state.discoveryCache[device.deviceID]?.addresses || []).map(
      (address) => ({ address, source: 'Discovered' }),
    ),
  ];
  function openAction(event, action) {
    event.preventDefault();
    onAction({ type: action, device });
  }
  return (
    <details class="device-details" open>
      <summary>{t('Connectivity')}</summary>
      <table class="table table-condensed table-striped table-auto">
        <tbody>
          {isLocalDevice ? (
            <>
              <DeviceDefinitionRow label="Listeners">
                <a
                  href="#listeners"
                  class={`text-${listeners.color}`}
                  onClick={(event) => openAction(event, 'listeners')}
                >
                  {listeners.running}/{listeners.total}
                </a>
              </DeviceDefinitionRow>
              {state.system.discoveryEnabled && (
                <DeviceDefinitionRow label="Discovery">
                  <a
                    href="#discovery"
                    class={`text-${discovery.color}`}
                    onClick={(event) => openAction(event, 'discovery')}
                  >
                    {discovery.running}/{discovery.total}
                  </a>
                </DeviceDefinitionRow>
              )}
            </>
          ) : (
            <>
              <DeviceDefinitionRow label="Address">
                {connection.connected
                  ? connection.address
                  : addresses.map((item, index) => (
                      <span class="remote-address" key={index}>
                        <span
                          class="folder-text"
                          title={t(item.source) + ': ' + item.address}
                        >
                          {item.address}
                        </span>
                        {state.system.lastDialStatus?.[item.address]?.error &&
                          !device.paused && (
                            <small
                              class="text-danger"
                              title={
                                state.system.lastDialStatus[item.address].error
                              }
                            >
                              {addressError(
                                state.system.lastDialStatus[item.address],
                              )}
                            </small>
                          )}
                      </span>
                    ))}
              </DeviceDefinitionRow>
              {!connection.connected ? (
                <DeviceDefinitionRow label="Last seen">
                  {!age ? (
                    t('Never')
                  ) : (
                    <>
                      {timestamp(state.deviceStats[device.deviceID].lastSeen)}
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
                </DeviceDefinitionRow>
              ) : (
                <>
                  <DeviceDefinitionRow
                    label="Connection Type"
                    icon="signal"
                    help="Transport and network used to reach this device. A relay forwards traffic when a direct connection is unavailable."
                  >
                    {t(connectionLabels[type] || 'Disconnected')}
                  </DeviceDefinitionRow>
                  <DeviceDefinitionRow label="Number of Connections">
                    1
                    {connection.secondary?.length
                      ? ' + ' + connection.secondary.length
                      : ''}
                  </DeviceDefinitionRow>
                </>
              )}
            </>
          )}
        </tbody>
      </table>
    </details>
  );
}

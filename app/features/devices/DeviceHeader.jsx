import { useContext } from 'preact/hooks';
import { connectionIcons } from './connections.mjs';
import { unitPrefixed } from '../../../client/format.mjs';
import { Icon } from '../../ui/Icon.jsx';
import { DeviceIdenticon } from './DeviceIdenticon.jsx';
import { LocaleContext } from '../../core/locale/LocaleContext.jsx';
import {
  deviceColor,
  deviceIcons,
  deviceLabels,
  deviceName,
} from './device-status.mjs';

export function DeviceHeader({
  completion,
  device,
  isLocalDevice,
  open,
  state,
  status,
  type,
  onToggle,
}) {
  const { t } = useContext(LocaleContext);
  return (
    <button class="btn panel-heading" aria-expanded={open} onClick={onToggle}>
      {!isLocalDevice && status === 'syncing' && (
        <span
          class="panel-progress"
          style={{ width: completion._total + '%' }}
        />
      )}
      <span class="panel-title device-title">
        <DeviceIdenticon id={device.deviceID} />
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
  );
}

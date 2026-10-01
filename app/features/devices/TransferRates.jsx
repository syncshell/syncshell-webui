import { useContext } from 'preact/hooks';
import { unitPrefixed } from '../../../client/format.mjs';
import { DeviceDefinitionRow } from './DeviceDefinitionRow.jsx';
import { LocaleContext } from '../../locale-context.jsx';

export function TransferRates({
  connection,
  device,
  isLocalDevice,
  options,
  usesMetricRates,
  onToggleUnits,
}) {
  const { t } = useContext(LocaleContext);
  const rate = (bytes) =>
    unitPrefixed(usesMetricRates ? bytes * 8 : bytes, !usesMetricRates) +
    (usesMetricRates ? 'bps' : 'B/s');
  return ['in', 'out'].map((direction) => {
    const limits = isLocalDevice ? options : device;
    const limit = limits[direction === 'in' ? 'maxRecvKbps' : 'maxSendKbps'];
    return (
      <DeviceDefinitionRow
        key={direction}
        label={direction === 'in' ? 'Download Rate' : 'Upload Rate'}
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
        totalBytes={connection[direction + 'BytesTotal']}
      >
        <a
          href="#units"
          onClick={(event) => {
            event.preventDefault();
            onToggleUnits();
          }}
        >
          {rate(connection[direction + 'bps'] || 0)}
          {limit > 0 && (
            <small>
              <br />
              <i class="text-muted">
                {t('Limit')}: {rate(limit * 1024)}
                {isLocalDevice &&
                  options.limitBandwidthInLan &&
                  ` (${t('Applied to LAN')})`}
              </i>
            </small>
          )}
        </a>
      </DeviceDefinitionRow>
    );
  });
}

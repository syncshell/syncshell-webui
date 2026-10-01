import { Dialog } from '../../ui/Dialog.jsx';
import { useLocale } from '../../core/locale/LocaleContext.jsx';
import { deviceName } from './device-status.mjs';
import { ShareDeviceIdentity } from './ShareDeviceIdentity.jsx';

export function DeviceIdentificationDialog({ api, device, onClose }) {
  const { t } = useLocale();
  return (
    <Dialog
      title={t('Device Identification') + ' - ' + deviceName(device)}
      large
      status="info"
      icon="qrcode"
      onClose={onClose}
    >
      <div class="text-center">
        <div class="well well-sm text-monospace">
          <strong>{device.deviceID}</strong>
        </div>
        <img
          class="img-thumbnail"
          src={'qr/?text=' + encodeURIComponent(device.deviceID)}
          height="328"
          width="328"
          alt={t('QR code')}
        />
        <ShareDeviceIdentity device={device} api={api} />
      </div>
    </Dialog>
  );
}

import { useLocale } from '../../core/locale/LocaleContext.jsx';
import { deviceName } from '../devices/device-status.mjs';
import { EncryptedShareField } from '../sharing/EncryptedShareField.jsx';

export function FolderSharingFields({
  folder,
  devices,
  localDeviceID,
  pendingFolders,
  completion,
  passwords,
  onSelectAll,
  onSelected,
  onPassword,
}) {
  const { t } = useLocale();

  return (
    <>
      <div class="action-row">
        {[true, false].map((select) => (
          <button
            key={String(select)}
            type="button"
            class="btn btn-link btn-sm"
            onClick={() => onSelectAll(select)}
          >
            {t(select ? 'Select All' : 'Deselect All')}
          </button>
        ))}
      </div>
      <p class="help-block">
        {t('Select additional devices to share this folder with.')}
      </p>
      {devices
        .filter((device) => device.deviceID !== localDeviceID)
        .map((device) => {
          const member = folder.devices.find(
            (item) => item.deviceID === device.deviceID,
          );
          return (
            <EncryptedShareField
              key={device.deviceID}
              label={deviceName(device)}
              id={device.deviceID}
              isSelected={!!member}
              password={passwords[device.deviceID] || ''}
              isEncrypted={folder.type === 'receiveencrypted'}
              isPasswordRequired={
                device.untrusted ||
                pendingFolders[folder.id]?.offeredBy?.[device.deviceID]
                  ?.remoteEncrypted
              }
              remoteState={
                completion[device.deviceID]?.[folder.id]?.remoteState
              }
              onSelected={(value) => onSelected(device.deviceID, value)}
              onPassword={(value) => onPassword(device.deviceID, value)}
            />
          );
        })}
    </>
  );
}

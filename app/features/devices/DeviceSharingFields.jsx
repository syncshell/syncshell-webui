import { useLocale } from '../../core/locale/LocaleContext.jsx';
import { EncryptedShareField } from '../sharing/EncryptedShareField.jsx';

export function DeviceSharingFields({
  device,
  folders,
  pendingFolders,
  completion,
  shares,
  onSelectAll,
  onChange,
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
        {t('Select the folders to share with this device.')}
      </p>
      {folders.map((folder) => (
        <EncryptedShareField
          key={folder.id}
          label={folder.label || folder.id}
          id={folder.id}
          isSelected={shares[folder.id].selected}
          password={shares[folder.id].password}
          isEncrypted={folder.type === 'receiveencrypted'}
          isPasswordRequired={
            device.untrusted ||
            pendingFolders[folder.id]?.offeredBy?.[device.deviceID]
              ?.remoteEncrypted
          }
          remoteState={
            completion[device.deviceID]?.folders?.[folder.id]?.remoteState
          }
          onSelected={(value) => onChange(folder.id, 'selected', value)}
          onPassword={(value) => onChange(folder.id, 'password', value)}
        />
      ))}
    </>
  );
}

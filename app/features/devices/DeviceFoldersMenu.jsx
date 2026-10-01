import { Icon } from '../../ui/Icon.jsx';
import { useLocale } from '../../core/locale/LocaleContext.jsx';
import { MenuButton } from '../../ui/MenuButton.jsx';
import { ShareStatus } from '../sharing/ShareStatus.jsx';

export function DeviceFoldersMenu({
  device,
  folders,
  isLocalDevice,
  state,
  onAction,
}) {
  const { t } = useLocale();
  if (folders.length === 0) return null;
  return (
    <MenuButton
      placement="dropup"
      className="action-row-leading device-folders"
      buttonClass="btn btn-sm btn-default"
      label={
        <>
          <Icon name="folder" />
          &nbsp;{t('Folders')} <span class="caret" />
        </>
      }
    >
      {({ close }) =>
        folders.map((folder) => (
          <li key={folder.id}>
            <a
              href={isLocalDevice ? '#folder' : '#folder-sharing'}
              onClick={(event) => {
                event.preventDefault();
                close();
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
                    isEncrypted={
                      folder.type === 'receiveencrypted' ||
                      !!folder.devices.find(
                        (member) => member.deviceID === device.deviceID,
                      )?.encryptionPassword
                    }
                    remoteState={
                      state.completion[device.deviceID]?.folders?.[folder.id]
                        ?.remoteState
                    }
                  />
                </>
              )}
            </a>
          </li>
        ))
      }
    </MenuButton>
  );
}

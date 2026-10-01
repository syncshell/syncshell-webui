import { useContext } from 'preact/hooks';
import { managementActions } from '../management/management.mjs';
import { Icon } from '../../ui/Icon.jsx';
import { LocaleContext } from '../../core/locale/LocaleContext.jsx';
import { MenuButton } from '../../ui/MenuButton.jsx';
import { ShareStatus } from '../sharing/ShareStatus.jsx';
import { recoveryActions } from './folder-status.mjs';

export function FolderActions({
  folder,
  info,
  scanning,
  state,
  status,
  onAction,
  onPause,
  onScan,
}) {
  const { t } = useContext(LocaleContext);
  return (
    <div class="panel-footer folder-actions">
      {recoveryActions(folder, info, status).map((type) => (
        <button
          key={type}
          class="btn btn-danger btn-sm"
          onClick={() => onAction({ type, folder })}
        >
          {t(managementActions[type].title)}
        </button>
      ))}
      <MenuButton
        className="folder-sharing pull-left"
        buttonClass="btn btn-sm btn-default"
        disabled={
          !folder.devices.some(
            (device) => device.deviceID !== state.system.myID,
          )
        }
        label={
          <>
            <Icon name="share" /> {t('Shared')} <span class="caret" />
          </>
        }
      >
        {({ close }) =>
          folder.devices
            .filter((device) => device.deviceID !== state.system.myID)
            .map((member) => {
              const device = state.config.devices.find(
                (item) => item.deviceID === member.deviceID,
              );
              return (
                <li key={member.deviceID}>
                  <a
                    href="#edit-device"
                    onClick={(event) => {
                      event.preventDefault();
                      close();
                      if (device) onAction({ type: 'edit-device', device });
                    }}
                  >
                    {device?.name || member.deviceID.slice(0, 7)}{' '}
                    <ShareStatus
                      isEncrypted={
                        folder.type === 'receiveencrypted' ||
                        !!member.encryptionPassword
                      }
                      remoteState={
                        state.completion[member.deviceID]?.[folder.id]
                          ?.remoteState
                      }
                    />
                  </a>
                </li>
              );
            })
        }
      </MenuButton>
      <button class="btn btn-sm btn-default" onClick={onPause}>
        <Icon name={folder.paused ? 'play' : 'pause'} />{' '}
        {t(folder.paused ? 'Resume' : 'Pause')}
      </button>
      <button
        class="btn btn-sm btn-default"
        disabled={
          scanning ||
          ![
            'idle',
            'stopped',
            'unshared',
            'outofsync',
            'faileditems',
            'localadditions',
          ].includes(status)
        }
        onClick={onScan}
      >
        <Icon name="refresh" class="icon-fixed" /> {t('Rescan')}
      </button>
      {folder.versioning?.type && folder.versioning.type !== 'external' && (
        <button
          class="btn btn-sm btn-default"
          disabled={folder.paused}
          onClick={() => onAction({ type: 'versions', folder })}
        >
          <Icon name="undo" /> {t('Versions')}
        </button>
      )}
      <button
        class="btn btn-sm btn-default"
        onClick={() => onAction({ type: 'edit-folder', folder })}
      >
        <Icon name="pencil" /> {t('Edit')}
      </button>
    </div>
  );
}

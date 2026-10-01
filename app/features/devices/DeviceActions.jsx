import { useContext } from 'preact/hooks';
import { runReportedSessionAction } from '../../../client/session.mjs';
import { Icon } from '../../Icon.jsx';
import { LocaleContext } from '../../locale-context.jsx';
import { MenuButton } from '../../MenuButton.jsx';
import { ShareStatus } from '../../ShareStatus.jsx';

export function DeviceActions({
  device,
  folders,
  gui,
  isLocalDevice,
  session,
  state,
  onAction,
}) {
  const { t } = useContext(LocaleContext);
  const openAction = (type) => onAction({ type, device });
  const hasRunningFolders = state.config.folders.some(
    (folder) => !folder.paused,
  );
  return (
    <div class="panel-footer folder-actions device-actions">
      <button
        class="btn btn-sm btn-default"
        onClick={() => openAction('identification')}
      >
        <Icon name="qrcode" />
        &nbsp;{t('Identification')}
      </button>
      {folders.length > 0 && (
        <MenuButton
          placement="dropup"
          className="folder-sharing device-folders"
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
                        encrypted={
                          folder.type === 'receiveencrypted' ||
                          !!folder.devices.find(
                            (member) => member.deviceID === device.deviceID,
                          )?.encryptionPassword
                        }
                        remoteState={
                          state.completion[device.deviceID]?.[folder.id]
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
      )}
      <span class="pull-right">
        {isLocalDevice ? (
          state.config.folders.length > 0 && (
            <button
              class="btn btn-sm btn-default"
              onClick={() =>
                runReportedSessionAction(
                  () =>
                    session.setPaused('folders', undefined, hasRunningFolders),
                  session.reportError,
                )
              }
            >
              <Icon name={hasRunningFolders ? 'pause' : 'play'} />
              &nbsp;{t(hasRunningFolders ? 'Pause' : 'Resume')}
            </button>
          )
        ) : (
          <>
            {device.remoteGUIPort > 0 && (
              <a
                class="btn btn-sm btn-default"
                href={gui || undefined}
                aria-disabled={!gui}
              >
                <Icon name="monitor" />
                &nbsp;{t('Remote GUI')}
              </a>
            )}
            <button
              class="btn btn-sm btn-default"
              onClick={() =>
                runReportedSessionAction(
                  () =>
                    session.setPaused(
                      'devices',
                      device.deviceID,
                      !device.paused,
                    ),
                  session.reportError,
                )
              }
            >
              <Icon name={device.paused ? 'play' : 'pause'} />
              &nbsp;{t(device.paused ? 'Resume' : 'Pause')}
            </button>
            <button
              class="btn btn-sm btn-default"
              onClick={() => openAction('edit-device')}
            >
              <Icon name="pencil" />
              &nbsp;{t('Edit')}
            </button>
          </>
        )}
        {isLocalDevice && (
          <button
            class="btn btn-sm btn-default"
            onClick={() => openAction('settings')}
          >
            <Icon name="settings" />
            &nbsp;{t('Settings')}
          </button>
        )}
      </span>
    </div>
  );
}

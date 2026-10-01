import { useContext } from 'preact/hooks';
import { LocaleContext } from './locale-context.jsx';
import { Dialog } from './Dialog.jsx';
import { About } from './About.jsx';
import { IdentityControls } from './IdentityControls.jsx';
import { ServiceDialog } from './ServiceDialog.jsx';
import { Logs } from './Logs.jsx';
import { Editor } from './Editor.jsx';
import { Settings } from './Settings.jsx';
import { ConfirmAction } from './ConfirmAction.jsx';
import { RemoteFiles } from './RemoteFiles.jsx';
import { RestoreVersions } from './RestoreVersions.jsx';
import { deviceName, sharedFolders } from '../client/devices.mjs';
import { ServiceHealthDialog } from './ServiceHealthDialog.jsx';
import { RecentChangesDialog } from './RecentChangesDialog.jsx';

/**
 * @typedef (
 *   | {type: 'about'}
 *   | {type: 'logs'}
 *   | {type: 'settings' | 'advanced'}
 *   | {type: 'restart' | 'shutdown' | 'upgrade'}
 *   | {type: 'add-device' | 'edit-device', device: object}
 *   | {type: 'add-folder' | 'edit-folder', folder: object}
 *   | {type: 'override' | 'revert', folder: object}
 *   | {type: 'versions', folder: object}
 *   | {type: 'identification' | 'remote-needed', device: object}
 *   | {type: 'listeners' | 'discovery'}
 *   | {type: 'changes'}
 * ) DialogRequest
 */

/** @param {{action: DialogRequest, state: object, api: object, session: object, onClose: function}} props */
export function DialogHost({ action, state, api, session, onClose }) {
  const { t } = useContext(LocaleContext);
  switch (action.type) {
    case 'restart':
    case 'shutdown':
    case 'upgrade':
      return (
        <ServiceDialog
          kind={action.type}
          state={state}
          session={session}
          onClose={onClose}
        />
      );
    case 'logs':
      return <Logs api={api} onClose={onClose} />;
    case 'settings':
    case 'advanced':
      return (
        <Settings
          state={state}
          api={api}
          session={session}
          onClose={onClose}
          advanced={action.type === 'advanced'}
        />
      );
    case 'add-device':
    case 'edit-device':
    case 'add-folder':
    case 'edit-folder':
      return (
        <Editor
          action={action}
          state={state}
          api={api}
          session={session}
          onClose={onClose}
        />
      );
    case 'override':
    case 'revert':
      return (
        <ConfirmAction
          action={action}
          api={api}
          session={session}
          onClose={onClose}
          onDone={onClose}
        />
      );
    case 'versions':
      return (
        <RestoreVersions api={api} folder={action.folder} onClose={onClose} />
      );
    case 'about':
      return <About api={api} version={state.version} onClose={onClose} />;
    case 'identification':
      return (
        <Dialog
          title={t('Device Identification') + ' - ' + deviceName(action.device)}
          large
          status="info"
          icon="qrcode"
          onClose={onClose}
        >
          <div class="text-center">
            <div class="well well-sm text-monospace">
              <strong>{action.device.deviceID}</strong>
            </div>
            <img
              class="img-thumbnail"
              src={'qr/?text=' + encodeURIComponent(action.device.deviceID)}
              height="328"
              width="328"
              alt={t('QR code')}
            />
            <IdentityControls device={action.device} api={api} />
          </div>
        </Dialog>
      );
    case 'listeners':
    case 'discovery':
      return (
        <ServiceHealthDialog
          kind={action.type}
          state={state}
          onClose={onClose}
        />
      );
    case 'remote-needed': {
      const folders = sharedFolders(
        state.config,
        action.device.deviceID,
      ).filter((folder) => {
        const completion =
          state.completion[action.device.deviceID]?.[folder.id];
        return !completion || completion.needItems + completion.needDeletes > 0;
      });
      return (
        <Dialog
          title={t('Out of Sync Items') + ' - ' + deviceName(action.device)}
          large
          status="info"
          icon="arrow-left-right"
          onClose={onClose}
        >
          {folders.map((folder) => (
            <RemoteFiles
              key={folder.id}
              api={api}
              folder={folder}
              device={action.device}
              state={state}
              single={folders.length === 1}
            />
          ))}
        </Dialog>
      );
    }
    case 'changes':
      return <RecentChangesDialog state={state} onClose={onClose} />;
    default:
      throw new Error(`Unknown dialog request: ${action.type}`);
  }
}

import { About } from './features/about/About.jsx';
import { ServiceDialog } from './ServiceDialog.jsx';
import { Logs } from './features/logs/Logs.jsx';
import { Editor } from './Editor.jsx';
import { Settings } from './Settings.jsx';
import { ConfirmAction } from './ConfirmAction.jsx';
import { RestoreVersionsDialog } from './features/versions/RestoreVersionsDialog.jsx';
import { ServiceHealthDialog } from './ServiceHealthDialog.jsx';
import { RecentChangesDialog } from './RecentChangesDialog.jsx';
import { DeviceIdentificationDialog } from './DeviceIdentificationDialog.jsx';
import { RemoteNeededDialog } from './RemoteNeededDialog.jsx';

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
        <RestoreVersionsDialog
          api={api}
          folder={action.folder}
          onClose={onClose}
        />
      );
    case 'about':
      return <About api={api} version={state.version} onClose={onClose} />;
    case 'identification':
      return (
        <DeviceIdentificationDialog
          api={api}
          device={action.device}
          onClose={onClose}
        />
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
    case 'remote-needed':
      return (
        <RemoteNeededDialog
          api={api}
          device={action.device}
          state={state}
          onClose={onClose}
        />
      );
    case 'changes':
      return <RecentChangesDialog state={state} onClose={onClose} />;
    default:
      throw new Error(`Unknown dialog request: ${action.type}`);
  }
}

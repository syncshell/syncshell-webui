import { useContext } from 'preact/hooks';
import {
  deviceName,
  sharedFolders,
} from './features/devices/device-status.mjs';
import { Dialog } from './Dialog.jsx';
import { LocaleContext } from './locale-context.jsx';
import { RemoteFiles } from './RemoteFiles.jsx';

export function RemoteNeededDialog({ api, device, state, onClose }) {
  const { t } = useContext(LocaleContext);
  const folders = sharedFolders(state.config, device.deviceID).filter(
    (folder) => {
      const completion = state.completion[device.deviceID]?.[folder.id];
      return !completion || completion.needItems + completion.needDeletes > 0;
    },
  );
  return (
    <Dialog
      title={t('Out of Sync Items') + ' - ' + deviceName(device)}
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
          device={device}
          state={state}
          single={folders.length === 1}
        />
      ))}
    </Dialog>
  );
}

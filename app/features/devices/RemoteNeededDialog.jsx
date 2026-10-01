import { Dialog } from '../../ui/Dialog.jsx';
import { useLocale } from '../../core/locale/LocaleContext.jsx';
import { deviceName, sharedFolders } from './device-status.mjs';
import { RemoteNeededFiles } from './RemoteNeededFiles.jsx';

export function RemoteNeededDialog({ api, device, state, onClose }) {
  const { t } = useLocale();
  const folders = sharedFolders(state.config, device.deviceID).filter(
    (folder) => {
      const completion =
        state.completion[device.deviceID]?.folders?.[folder.id];
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
        <RemoteNeededFiles
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

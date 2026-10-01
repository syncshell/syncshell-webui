import { useContext } from 'preact/hooks';
import { deviceName } from '../client/devices.mjs';
import { timestamp } from '../client/format.mjs';
import { Dialog } from './Dialog.jsx';
import { LocaleContext } from './locale-context.jsx';
import { Tooltip } from './Tooltip.jsx';

export function RecentChangesDialog({ state, onClose }) {
  const { t } = useContext(LocaleContext);
  const friendlyDeviceName = (id) =>
    deviceName(
      state.config.devices.find((device) =>
        device.deviceID.startsWith(id || '\0'),
      ),
    ) ||
    id ||
    t('Unknown');
  return (
    <Dialog
      title="Recent Changes"
      large
      expandable
      icon="info"
      onClose={onClose}
    >
      <div class="table-responsive">
        <table class="table table-condensed table-striped recent-changes-table">
          <colgroup>
            <col class="recent-device" />
            <col class="recent-action" />
            <col class="recent-type" />
            <col class="recent-folder" />
            <col class="recent-path" />
            <col class="recent-time" />
          </colgroup>
          <thead>
            <tr>
              {['Device', 'Action', 'Type', 'Folder', 'Path', 'Time'].map(
                (label) => (
                  <th key={label}>{t(label)}</th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {state.globalChanges.map((event) => {
              const folder =
                state.config.folders.find(
                  (item) => item.id === event.data.folder,
                )?.label || event.data.folder;
              const device = friendlyDeviceName(event.data.modifiedBy);
              return (
                <tr key={event.id}>
                  <td title={device}>{device}</td>
                  <td>{t(event.data.action)}</td>
                  <td>{t(event.data.type)}</td>
                  <td title={folder}>{folder}</td>
                  <td>
                    <Tooltip
                      label={event.data.path}
                      text={event.data.path}
                      triggerText={event.data.path}
                      tail
                    />
                  </td>
                  <td>{timestamp(event.time)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Dialog>
  );
}

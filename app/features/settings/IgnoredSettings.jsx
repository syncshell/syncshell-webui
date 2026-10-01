import { timestamp } from '../../../client/format.mjs';
import { useLocale } from '../../core/locale/LocaleContext.jsx';
import { ignoredFolders, unignore } from './settings.mjs';

export function IgnoredDevicesSettings({ config, onChange }) {
  const { t } = useLocale();
  const devices = config.remoteIgnoredDevices || [];
  return (
    <>
      {!devices.length && <p>{t('You have no ignored devices.')}</p>}
      <div class="table-responsive">
        <table class="table table-striped">
          <tbody>
            {devices.map((device) => (
              <tr key={device.deviceID}>
                <td>{timestamp(device.time)}</td>
                <td class="word-break-all" title={device.deviceID}>
                  {device.name || device.deviceID}
                </td>
                <td class="word-break-all">{device.address}</td>
                <td>
                  <button
                    type="button"
                    class="btn btn-default btn-sm"
                    onClick={() => onChange(unignore(config, device.deviceID))}
                  >
                    {t('Unignore')}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

export function IgnoredFoldersSettings({ config, onChange }) {
  const { t } = useLocale();
  const folders = ignoredFolders(config);
  return (
    <>
      {!folders.length && <p>{t('You have no ignored folders.')}</p>}
      <div class="table-responsive">
        <table class="table table-striped">
          <tbody>
            {folders.map(({ device, folder }) => (
              <tr key={device.deviceID + folder.id}>
                <td>{timestamp(folder.time)}</td>
                <td>{folder.label || folder.id}</td>
                <td class="word-break-all" title={device.deviceID}>
                  {device.name || device.deviceID}
                </td>
                <td>
                  <button
                    type="button"
                    class="btn btn-default btn-sm"
                    onClick={() =>
                      onChange(unignore(config, device.deviceID, folder.id))
                    }
                  >
                    {t('Unignore')}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

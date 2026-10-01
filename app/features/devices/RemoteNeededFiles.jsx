import { useEffect, useState } from 'preact/hooks';
import { timestamp, unitPrefixed } from '../../../client/format.mjs';
import { useLocale } from '../../core/locale/LocaleContext.jsx';
import { Pagination } from '../../ui/Pagination.jsx';
import { deviceName } from './device-status.mjs';

function loadRemoteNeededFiles(api, folderId, deviceId, page, perpage, signal) {
  return api
    .get('db/remoteneed', {
      query: { folder: folderId, device: deviceId, page, perpage },
      signal,
    })
    .then((data) => data.files || []);
}

function createRemoteNeededRow(file, devices, t) {
  const modifyingDevice =
    deviceName(
      devices.find((device) =>
        device.deviceID.startsWith(file.modifiedBy || '\0'),
      ),
    ) ||
    file.modifiedBy ||
    t('Unknown');
  return {
    key: file.name,
    path: file.name,
    size: ['DIRECTORY', 'FILE_INFO_TYPE_DIRECTORY'].includes(file.type)
      ? ''
      : unitPrefixed(file.size, true) + 'B',
    modified: timestamp(file.modified),
    modifyingDevice,
  };
}

export function RemoteNeededFiles({ api, folder, device, state, single }) {
  const { t } = useLocale();
  const [page, setPage] = useState(1);
  const [perpage, setPerpage] = useState(10);
  const [files, setFiles] = useState([]);
  const [error, setError] = useState('');
  const completion = state.completion[device.deviceID]?.[folder.id];
  const revision = completion?.needItems + ':' + completion?.needBytes;
  useEffect(() => {
    const controller = new AbortController();
    loadRemoteNeededFiles(
      api,
      folder.id,
      device.deviceID,
      page,
      perpage,
      controller.signal,
    )
      .then((files) => {
        setFiles(files);
        setError('');
      })
      .catch((error) => {
        if (!controller.signal.aborted) setError(error.message);
      });
    return () => controller.abort();
  }, [api, folder.id, device.deviceID, page, perpage, revision]);
  const rows = files.map((file) =>
    createRemoteNeededRow(file, state.config.devices, t),
  );
  return (
    <details class="panel panel-default" open={single}>
      <summary class="panel-heading">{folder.label || folder.id}</summary>
      <div class="panel-body less-padding">
        {error && (
          <p class="text-danger" role="alert">
            {error}
          </p>
        )}
        <table class="table table-striped">
          <thead>
            <tr>
              {['Path', 'Size', 'Mod. Time', 'Mod. Device'].map((label) => (
                <th
                  key={label}
                  title={
                    label === 'Mod. Time'
                      ? t('Time the item was last modified')
                      : label === 'Mod. Device'
                        ? t('Device that last modified the item')
                        : undefined
                  }
                >
                  {t(label)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key}>
                <td class="word-break-all">{row.path}</td>
                <td>{row.size}</td>
                <td>{row.modified}</td>
                <td>{row.modifyingDevice}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pagination
          page={page}
          perpage={perpage}
          total={completion?.needItems || files.length}
          onPage={setPage}
          onSize={setPerpage}
        />
      </div>
    </details>
  );
}

import { useContext, useEffect, useState } from 'preact/hooks';
import { LocaleContext } from './locale-context.jsx';
import { Pagination } from './Pagination.jsx';
import { Dialog } from './Dialog.jsx';
import { TransferProgress } from './TransferProgress.jsx';
import { needIcons } from '../client/transfer.mjs';
import { Tooltip } from './Tooltip.jsx';
import { itemViews, pageItems } from '../client/items.mjs';
import { unitPrefixed } from '../client/format.mjs';
import { Icon } from './Icon.jsx';

export function ItemsDialog({
  api,
  folder,
  kind,
  total,
  revision = 0,
  progress = {},
  progressEnabled = false,
  onClose,
}) {
  const { t } = useContext(LocaleContext);
  const [page, setPage] = useState(1);
  const [perpage, setPerpage] = useState(10);
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const view = itemViews[kind];
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    api
      .get(view.route, { folder: folder.id, page, perpage }, controller.signal)
      .then((data) => {
        setItems(pageItems(kind, data));
        setError('');
      })
      .catch((error) => {
        if (!controller.signal.aborted) setError(error.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [api, folder.id, kind, page, perpage, revision, total, view.route]);
  async function prioritize(file) {
    try {
      const data = await api.post('db/prio', undefined, {
        folder: folder.id,
        file,
        page,
        perpage,
      });
      setItems(pageItems('need', data));
    } catch (error) {
      setError(error.message);
    }
  }
  function renderItemPath(file) {
    if (kind !== 'need') return file.path || file.name;
    return (
      <>
        {file.type === 'queued' && (
          <button
            class="btn btn-link btn-sm"
            aria-label={t('Move to top of queue')}
            onClick={() => prioritize(file.name)}
          >
            <Icon name="arrow-up-to-line" />
          </button>
        )}
        <Tooltip
          label={file.name}
          text={file.name}
          triggerText={file.name.split('/').at(-1)}
        />
      </>
    );
  }
  function renderItemDetail(file) {
    if (
      kind === 'need' &&
      file.type === 'progress' &&
      file.action === 'Sync' &&
      progress[file.name]
    )
      return <TransferProgress progress={progress[file.name]} />;
    if (kind === 'failed') return file.error;
    if (kind === 'local')
      return ['DIRECTORY', 'FILE_INFO_TYPE_DIRECTORY'].includes(file.type)
        ? ''
        : unitPrefixed(file.size, true) + 'B';
    return file.size > 0 ? unitPrefixed(file.size, true) + 'B' : '';
  }
  return (
    <Dialog
      title={view.title}
      large
      status={
        kind === 'failed' ||
        (kind === 'local' && folder.type === 'receiveencrypted')
          ? 'warning'
          : 'info'
      }
      icon={view.icon}
      onClose={onClose}
    >
      {kind === 'failed' && (
        <p>
          {t('The following items could not be synchronized.')}{' '}
          {t(
            'They are retried automatically and will be synced when the error is resolved.',
          )}
        </p>
      )}
      {kind === 'local' && (
        <p>
          {t(
            folder.type === 'receiveencrypted'
              ? 'The following unexpected items were found.'
              : 'The following items were changed locally.',
          )}
        </p>
      )}
      {kind === 'local' && folder.type === 'receiveencrypted' && (
        <p>
          {t(
            'You should never add or change anything locally in a "{%receiveEncrypted%}" folder.',
            { receiveEncrypted: t('Receive Encrypted') },
          )}
        </p>
      )}
      {error && (
        <p role="alert" class="text-danger">
          {error}
        </p>
      )}
      {kind === 'need' && progressEnabled && <TransferProgress legend />}
      <table
        class="table table-striped table-condensed folder-items-table"
        aria-busy={loading}
      >
        {kind === 'local' && (
          <thead>
            <tr>
              <th>{t('Path')}</th>
              <th>{t('Size')}</th>
            </tr>
          </thead>
        )}
        <tbody>
          {items.map((file, index) => (
            <tr key={`${file.name || file.path}:${index}`}>
              {kind === 'need' && (
                <td class="small-data">
                  <Icon name={needIcons[file.action]} /> {t(file.action)}
                </td>
              )}
              <td class="word-break-all">{renderItemPath(file)}</td>
              <td>{renderItemDetail(file)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <Pagination
        page={page}
        perpage={perpage}
        total={total}
        onPage={setPage}
        onSize={setPerpage}
      />
    </Dialog>
  );
}

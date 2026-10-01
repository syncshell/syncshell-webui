import { ConflictRow } from './ConflictRow.jsx';
import { useContext, useState } from 'preact/hooks';
import { LocaleContext } from '../../core/locale/LocaleContext.jsx';
import './conflicts.css';
import { desktopHelp } from '../../../client/desktop.mjs';
import { Icon } from '../../Icon.jsx';
import { ConflictRenameDialog } from './ConflictRenameDialog.jsx';
import { useConflictGroups } from './useConflictGroups.mjs';

export function Conflicts({
  api,
  folders,
  active,
  ready,
  hostActions = null,
  device,
}) {
  const { t } = useContext(LocaleContext);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState({});
  const {
    groups,
    loading,
    scanning,
    errors,
    message,
    rename,
    desktopError,
    permission,
    openConflict,
    rescan,
    selectRename,
    cancelRename,
    restoreConflictName,
  } = useConflictGroups({
    api,
    folders,
    active,
    ready,
    hostActions,
    device,
  });
  const visible = groups.filter((group) =>
    [
      group.folderName,
      group.path,
      ...group.copies.map((file) => file.path),
    ].some((value) =>
      value.toLocaleLowerCase().includes(search.toLocaleLowerCase()),
    ),
  );
  return (
    <>
      <section class="conflict-review" aria-label={t('Conflict files')}>
        <h3>{t('Review in your file manager')}</h3>
        {(!hostActions || desktopError) && (
          <p role="status">{t(desktopError || desktopHelp)}</p>
        )}
        <div class="review-tools">
          <input
            type="search"
            class="form-control input-sm review-search"
            placeholder={t('Search filenames or paths')}
            aria-label={t('Search filenames or paths')}
            value={search}
            onInput={(event) => setSearch(event.currentTarget.value)}
          />
          <button
            class="btn btn-default review-recheck"
            disabled={loading}
            aria-busy={scanning === 'all'}
            onClick={() => rescan()}
          >
            <span
              class={scanning === 'all' ? 'text-warning review-rechecking' : ''}
            >
              <Icon
                name="refresh"
                class={scanning === 'all' ? 'icon-spin' : ''}
              />{' '}
              {t('Recheck all files')}
            </span>
          </button>
        </div>
        {loading && <p role="status">{t('Loading data...')}</p>}
        {message && (
          <p class="review-message" role="status">
            {t(message)}
          </p>
        )}
        {errors.map((error) => (
          <p key={error} class="review-message text-danger" role="alert">
            {error}
          </p>
        ))}
        <table
          class="table table-striped review-table"
          aria-label={t('Conflict files')}
        >
          <thead>
            <tr class="review-column-headings">
              {['Location', 'Current file', 'Conflict files', 'Actions'].map(
                (heading) => (
                  <th key={heading} scope="col">
                    {t(heading)}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {visible.map((group) => (
              <ConflictRow
                key={group.id}
                group={group}
                selected={selected[group.id]}
                permission={permission}
                showAccessReason={Boolean(hostActions && !desktopError)}
                loading={loading}
                scanning={scanning}
                onSelect={(path) =>
                  setSelected({ ...selected, [group.id]: path })
                }
                onOpen={openConflict}
                onRename={(file) => selectRename(group, file)}
                onRecheck={() => rescan(group)}
              />
            ))}
          </tbody>
        </table>
        {!loading && !visible.length && !errors.length && (
          <p class="text-success">
            {t(groups.length ? 'No matches' : 'No conflict files remain')}
          </p>
        )}
      </section>
      {rename && (
        <ConflictRenameDialog
          conflict={rename}
          errors={errors}
          loading={loading}
          onCancel={cancelRename}
          onRename={restoreConflictName}
        />
      )}
    </>
  );
}

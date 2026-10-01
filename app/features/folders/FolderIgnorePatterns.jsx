import { useContext } from 'preact/hooks';
import { LocaleContext } from '../../core/locale/LocaleContext.jsx';

export function FolderIgnorePatterns({
  folder,
  isNew,
  savingAddedIgnores,
  addedIgnoresReady,
  busy,
  addIgnores,
  ignores,
  loadedIgnores,
  onRetry,
  onToggleAdd,
  onInput,
}) {
  const { t } = useContext(LocaleContext);

  return (
    <>
      <p class="help-block">
        {t('Enter ignore patterns, one per line.')}{' '}
        <a
          href="https://docs.syncthing.net/users/ignoring.html"
          target="_blank"
          rel="noreferrer"
        >
          {t('full documentation')}
        </a>
      </p>
      {savingAddedIgnores && (
        <>
          <p>
            {t('Set Ignores on Added Folder')} · {folder.label || folder.id}
          </p>
          {!addedIgnoresReady && (
            <button
              type="button"
              class="btn btn-default"
              disabled={busy}
              onClick={onRetry}
            >
              {t('Retry')}
            </button>
          )}
        </>
      )}
      {isNew && !savingAddedIgnores ? (
        <>
          <label>
            <input
              type="checkbox"
              checked={addIgnores}
              onChange={(event) => onToggleAdd(event.currentTarget.checked)}
            />{' '}
            {t('Add Ignore Patterns')}
          </label>
          <p>
            {t('Patterns are applied before the folder starts synchronizing.')}
          </p>
        </>
      ) : (
        <textarea
          class="form-control"
          rows="12"
          aria-label={t('Ignore Patterns')}
          value={ignores}
          disabled={folder.type === 'receiveencrypted' || !loadedIgnores}
          onInput={(event) => onInput(event.currentTarget.value)}
        />
      )}
    </>
  );
}

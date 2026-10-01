import { useContext } from 'preact/hooks';
import { LocaleContext } from '../../core/locale/LocaleContext.jsx';
import { xattrDefault, xattrHint } from './folder-editor.mjs';
import './FolderExtendedAttributes.css';

export function FolderExtendedAttributes({ draft, dispatch }) {
  const { t } = useContext(LocaleContext);

  return (
    <>
      <p>
        {t('Extended Attributes Filter')} ·{' '}
        <a
          href="https://docs.syncthing.net/advanced/folder-xattr-filter.html"
          target="_blank"
          rel="noreferrer"
        >
          {t('Help')}
        </a>
      </p>
      <p>
        {t(
          'To permit a rule, have the checkbox checked. To deny a rule, leave it unchecked.',
        )}
      </p>
      {(draft.xattrFilter?.entries || []).map((entry, index) => (
        <div class="xattr-rule" key={index}>
          <input
            type="checkbox"
            aria-label={t('permit') + ' ' + (index + 1)}
            checked={entry.permit}
            onChange={(event) =>
              dispatch({
                type: 'set-folder-xattr-permit',
                index,
                value: event.currentTarget.checked,
              })
            }
          />
          <input
            class="form-control"
            aria-label={t('Active filter rules') + ' ' + (index + 1)}
            value={entry.match}
            onInput={(event) =>
              dispatch({
                type: 'set-folder-xattr-match',
                index,
                value: event.currentTarget.value,
              })
            }
          />
          <button
            type="button"
            class="btn btn-default"
            onClick={() =>
              dispatch({
                type: 'remove-folder-xattr-rule',
                index,
              })
            }
          >
            {t('Remove')}
          </button>
        </div>
      ))}
      <button
        type="button"
        class="btn btn-default"
        onClick={() => dispatch({ type: 'add-folder-xattr-rule' })}
      >
        {t('Add filter entry')}
      </button>
      <p>
        {t('Default')}: {t(xattrDefault(draft.xattrFilter?.entries))}
      </p>
      <p>{t(xattrHint(draft.xattrFilter?.entries))}</p>
    </>
  );
}

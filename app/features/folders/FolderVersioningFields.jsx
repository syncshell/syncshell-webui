import { useLocale } from '../../core/locale/LocaleContext.jsx';

export function FolderVersioningFields({ draft, dispatch }) {
  const { t } = useLocale();
  if (!draft.versioning.type) return null;

  const fields =
    draft.versioning.type === 'simple'
      ? [
          ['keep', 'Keep Versions'],
          ['cleanoutDays', 'Clean out after'],
        ]
      : draft.versioning.type === 'trashcan'
        ? [['cleanoutDays', 'Clean out after']]
        : draft.versioning.type === 'staggered'
          ? [['maxAge', 'Maximum Age']]
          : [['command', 'External Versioning Command']];

  return fields.map(([key, label]) => (
    <div class="form-group" key={key}>
      <label for={'version-' + key}>
        {t(label)}
        {key === 'maxAge' ? ' (' + t('days') + ')' : ''}
      </label>
      <input
        id={'version-' + key}
        class="form-control"
        type={key === 'command' ? 'text' : 'number'}
        min={key === 'keep' ? 1 : 0}
        required
        value={
          key === 'maxAge'
            ? Math.floor(Number(draft.versioning.params?.[key] || 0) / 86400)
            : draft.versioning.params?.[key] || ''
        }
        onInput={(event) =>
          dispatch({
            type: 'set-folder-versioning-parameter',
            key,
            value:
              key === 'maxAge'
                ? String(Number(event.currentTarget.value) * 86400)
                : event.currentTarget.value,
          })
        }
      />
    </div>
  ));
}

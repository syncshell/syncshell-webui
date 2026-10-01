import { useLocale } from '../../core/locale/LocaleContext.jsx';

const versioningFields = {
  simple: [
    { key: 'keep', label: 'Keep Versions', minimum: 1 },
    { key: 'cleanoutDays', label: 'Clean out after', minimum: 0 },
  ],
  trashcan: [{ key: 'cleanoutDays', label: 'Clean out after', minimum: 0 }],
  staggered: [
    { key: 'maxAge', label: 'Maximum Age', minimum: 0, usesDays: true },
  ],
  external: [
    { key: 'command', label: 'External Versioning Command', type: 'text' },
  ],
};

export function FolderVersioningFields({ draft, dispatch }) {
  const { t } = useLocale();
  if (!draft.versioning.type) return null;

  const fields =
    versioningFields[draft.versioning.type] || versioningFields.external;

  return fields.map((field) => (
    <div class="form-group" key={field.key}>
      <label for={'version-' + field.key}>
        {t(field.label)}
        {field.usesDays ? ' (' + t('days') + ')' : ''}
      </label>
      <input
        id={'version-' + field.key}
        class="form-control"
        type={field.type || 'number'}
        min={field.minimum}
        required
        value={
          field.usesDays
            ? Math.floor(
                Number(draft.versioning.params?.[field.key] || 0) / 86400,
              )
            : draft.versioning.params?.[field.key] || ''
        }
        onInput={(event) =>
          dispatch({
            type: 'set-folder-versioning-parameter',
            key: field.key,
            value: field.usesDays
              ? String(Number(event.currentTarget.value) * 86400)
              : event.currentTarget.value,
          })
        }
      />
    </div>
  ));
}

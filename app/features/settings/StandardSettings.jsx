import { useContext } from 'preact/hooks';
import { FormFields } from '../../FormFields.jsx';
import { LocaleContext } from '../../locale-context.jsx';

function SettingsFields({ describedBy, draft, fields, onUpdate }) {
  return (
    <FormFields
      describedBy={describedBy}
      draft={draft}
      fields={fields}
      onChange={onUpdate}
    />
  );
}

export function GuiSettings({
  addressOverridden,
  describedBy,
  draft,
  fields,
  onUpdate,
}) {
  const { t } = useContext(LocaleContext);
  return (
    <>
      <SettingsFields
        describedBy={describedBy}
        draft={draft}
        fields={fields}
        onUpdate={onUpdate}
      />
      {addressOverridden && (
        <p class="text-warning">
          {t(
            'The GUI address is overridden by startup options. Changes here will not take effect while the override is in place.',
          )}
        </p>
      )}
    </>
  );
}

export function ConnectionSettings({ describedBy, draft, fields, onUpdate }) {
  return (
    <SettingsFields
      describedBy={describedBy}
      draft={draft}
      fields={fields}
      onUpdate={onUpdate}
    />
  );
}

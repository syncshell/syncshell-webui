import { useContext } from 'preact/hooks';
import { LocaleContext } from '../../core/locale/LocaleContext.jsx';
import { SettingsFields } from './SettingsFields.jsx';

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
        onChange={onUpdate}
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
      onChange={onUpdate}
    />
  );
}

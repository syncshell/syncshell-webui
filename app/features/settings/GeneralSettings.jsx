import { useContext } from 'preact/hooks';
import { FormFields } from '../../FormFields.jsx';
import { LocaleContext } from '../../locale-context.jsx';

export function GeneralSettings({
  describedBy,
  draft,
  fields,
  mode,
  options,
  system,
  version,
  onDefaults,
  onGenerateKey,
  onMode,
  onPreview,
  onUpdate,
}) {
  const { t } = useContext(LocaleContext);
  return (
    <>
      <FormFields
        describedBy={describedBy}
        draft={draft}
        fields={fields}
        onChange={onUpdate}
      />
      <label for="settings-api-key">{t('API Key')}</label>
      <div class="input-group">
        <input
          id="settings-api-key"
          class="form-control"
          type="text"
          readOnly
          value={draft.gui.apiKey}
        />
        <span class="input-group-btn">
          <button type="button" class="btn btn-default" onClick={onGenerateKey}>
            {t('Generate')}
          </button>
        </span>
      </div>
      <div class="form-group">
        <label for="settings-usage">{t('Anonymous Usage Reporting')}</label>{' '}
        <button type="button" class="btn btn-link btn-sm" onClick={onPreview}>
          {t('Preview')}
        </button>
        {mode === 'candidate' || version.isCandidate ? (
          <p>
            {t('Usage reporting is always enabled for candidate releases.')}
          </p>
        ) : (
          <select
            id="settings-usage"
            class="form-control"
            value={draft.options.urAccepted}
            onChange={(event) =>
              onUpdate('options.urAccepted', Number(event.currentTarget.value))
            }
          >
            {Array.from(
              { length: Math.max(0, (system.urVersionMax || 1) - 1) },
              (_, index) => system.urVersionMax - index,
            ).map((reportVersion) => (
              <option key={reportVersion} value={reportVersion}>
                {t('Version')} {reportVersion}
              </option>
            ))}
            <option value={0}>{t('Undecided (will prompt)')}</option>
            <option value={-1}>{t('Disabled')}</option>
          </select>
        )}
      </div>
      <div class="form-group">
        <label for="settings-upgrades">{t('Automatic upgrades')}</label>
        {options.upgrade ? (
          <select
            id="settings-upgrades"
            class="form-control"
            value={mode}
            onChange={(event) => onMode(event.currentTarget.value)}
          >
            {!version.isCandidate && (
              <option value="none">{t('No upgrades')}</option>
            )}
            <option value="stable">{t('Stable releases only')}</option>
            <option value="candidate">
              {t('Stable releases and release candidates')}
            </option>
          </select>
        ) : (
          <p>{t('Unavailable/Disabled by administrator or maintainer')}</p>
        )}
      </div>
      <p>
        <strong>{t('Default Configuration')}</strong>
      </p>
      <div class="folder-actions">
        <button
          type="button"
          class="btn btn-default"
          onClick={() => onDefaults('folder')}
        >
          {t('Edit Folder Defaults')}
        </button>
        <button
          type="button"
          class="btn btn-default"
          onClick={() => onDefaults('device')}
        >
          {t('Edit Device Defaults')}
        </button>
      </div>
    </>
  );
}

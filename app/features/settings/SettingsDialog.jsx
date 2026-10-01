import { useContext, useEffect, useRef, useState } from 'preact/hooks';
import { cloneConfig, setValue } from '../../../client/edit.mjs';
import { settingsTabs, settingsFields, upgradeMode } from './settings.mjs';
import { buildAdvancedConfigSections } from './advancedConfigFields.mjs';
import { loadSettingsOptions } from './loadSettingsOptions.mjs';
import { prepareSettingsForSave } from './prepareSettingsForSave.mjs';
import { Dialog } from '../../Dialog.jsx';
import { Editor } from '../../Editor.jsx';
import { FormFields } from '../../FormFields.jsx';
import { LocaleContext } from '../../locale-context.jsx';
import { Tabs } from '../../Tabs.jsx';
import { UsageReport } from '../reports/UsageReport.jsx';
import {
  IgnoredDevicesSettings,
  IgnoredFoldersSettings,
} from './IgnoredSettings.jsx';
import { GeneralSettings } from './GeneralSettings.jsx';

export function SettingsDialog({
  state,
  api,
  session,
  onClose,
  advanced = false,
}) {
  const { t } = useContext(LocaleContext);
  const form = useRef();
  const [initial] = useState(() => cloneConfig(state.config));
  const [draft, setDraft] = useState(() => cloneConfig(initial));
  const [mode, setMode] = useState(upgradeMode(initial));
  const [tab, setTab] = useState('General');
  const [options, setOptions] = useState({ themes: [], upgrade: null });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [nested, setNested] = useState(null);
  const [report, setReport] = useState(null);
  const [discard, setDiscard] = useState(false);
  const fields = settingsFields(tab, draft, state.system.myID, options.themes);
  const tabItems = settingsTabs.map((name) => ({
    id: name,
    tabId: 'settings-' + name.toLowerCase().replaceAll(' ', '-') + '-tab',
    panelId: 'settings-panel',
    label: t(name),
  }));
  useEffect(() => {
    const controller = new AbortController();
    loadSettingsOptions(api, controller.signal).then((value) => {
      if (!controller.signal.aborted) setOptions(value);
    });
    return () => controller.abort();
  }, [api]);
  function update(path, value) {
    setDraft((previous) => setValue(previous, path, value));
  }
  async function save() {
    if (!form.current.reportValidity()) return;
    setBusy(true);
    setError('');
    try {
      const config = advanced
        ? cloneConfig(draft)
        : prepareSettingsForSave(
            draft,
            mode,
            state.system,
            state.version,
            !!options.upgrade,
          );
      await session.saveConfig(config);
      onClose();
      if (initial.gui.theme !== config.gui.theme) location.reload();
    } catch (error) {
      setError(error.message);
    } finally {
      setBusy(false);
    }
  }
  function close() {
    if (busy) return;
    if (
      JSON.stringify(draft) !== JSON.stringify(initial) ||
      mode !== upgradeMode(initial)
    )
      setDiscard(true);
    else onClose();
  }
  async function defaults(kind) {
    try {
      setNested({
        type: 'edit-' + kind,
        defaults: true,
        [kind]: await api.get('config/defaults/' + kind),
      });
    } catch (error) {
      setError(error.message);
    }
  }
  async function generateKey() {
    try {
      update(
        'gui.apiKey',
        (await api.get('svc/random/string', { length: 32 })).random,
      );
    } catch (error) {
      setError(error.message);
    }
  }
  function preview() {
    setReport(true);
  }
  return (
    <>
      <Dialog
        title={advanced ? 'Advanced Configuration' : 'Settings'}
        status={advanced ? 'danger' : 'default'}
        icon="settings"
        large
        onClose={onClose}
        onCancel={close}
        footer={
          <>
            <button
              class="btn btn-primary btn-sm"
              disabled={busy}
              onClick={save}
            >
              {t('Save')}
            </button>
            <button
              class="btn btn-default btn-sm"
              disabled={busy}
              onClick={close}
            >
              {t('Close')}
            </button>
          </>
        }
      >
        <form
          ref={form}
          aria-describedby={error ? 'settings-error' : undefined}
          onSubmit={(event) => {
            event.preventDefault();
            save();
          }}
        >
          {error && (
            <p id="settings-error" class="text-danger" role="alert">
              {t(error)}
            </p>
          )}
          <fieldset disabled={busy}>
            {advanced ? (
              <>
                <p class="text-danger">
                  <strong>{t('Be careful!')}</strong>{' '}
                  {t(
                    'Incorrect configuration may damage your folder contents and render Syncthing inoperable.',
                  )}
                </p>
                {buildAdvancedConfigSections(draft).map((section) => (
                  <details key={section.path} class="panel panel-default">
                    <summary class="panel-heading">{t(section.label)}</summary>
                    <div class="panel-body">
                      <FormFields
                        describedBy={error ? 'settings-error' : undefined}
                        draft={draft}
                        fields={section.fields}
                        onChange={update}
                      />
                    </div>
                  </details>
                ))}
              </>
            ) : (
              <>
                <Tabs activeId={tab} items={tabItems} onSelect={setTab} />
                <div
                  id="settings-panel"
                  role="tabpanel"
                  aria-labelledby={
                    'settings-' +
                    tab.toLowerCase().replaceAll(' ', '-') +
                    '-tab'
                  }
                >
                  {tab === 'Ignored Devices' ? (
                    <IgnoredDevicesSettings
                      config={draft}
                      onChange={setDraft}
                    />
                  ) : tab === 'Ignored Folders' ? (
                    <IgnoredFoldersSettings
                      config={draft}
                      onChange={setDraft}
                    />
                  ) : tab === 'General' ? (
                    <GeneralSettings
                      describedBy={error ? 'settings-error' : undefined}
                      draft={draft}
                      fields={fields}
                      mode={mode}
                      options={options}
                      system={state.system}
                      version={state.version}
                      onDefaults={defaults}
                      onGenerateKey={generateKey}
                      onMode={setMode}
                      onPreview={preview}
                      onUpdate={update}
                    />
                  ) : (
                    <>
                      <FormFields
                        describedBy={error ? 'settings-error' : undefined}
                        draft={draft}
                        fields={fields}
                        onChange={update}
                      />
                      {tab === 'GUI' && state.system.guiAddressOverridden && (
                        <p class="text-warning">
                          {t(
                            'The GUI address is overridden by startup options. Changes here will not take effect while the override is in place.',
                          )}
                        </p>
                      )}
                    </>
                  )}
                </div>
              </>
            )}
          </fieldset>
        </form>
      </Dialog>
      {nested && (
        <Editor
          action={nested}
          state={state}
          api={api}
          session={session}
          onSaved={(value, lines) => {
            setDraft((previous) => {
              const next = setValue(
                previous,
                'defaults.' + (nested.folder ? 'folder' : 'device'),
                value,
              );
              if (nested.folder) next.defaults.ignores.lines = lines;
              return next;
            });
          }}
          onClose={() => setNested(null)}
        />
      )}
      {report && (
        <UsageReport
          api={api}
          session={session}
          state={state}
          onClose={() => setReport(null)}
        />
      )}
      {discard && (
        <Dialog
          title="Discard Changes"
          onClose={() => setDiscard(false)}
          footer={
            <>
              <button class="btn btn-warning" onClick={onClose}>
                {t('Discard Changes')}
              </button>
              <button class="btn btn-default" onClick={() => setDiscard(false)}>
                {t('Cancel')}
              </button>
            </>
          }
        >
          <p>{t('Discard unsaved changes?')}</p>
        </Dialog>
      )}
    </>
  );
}

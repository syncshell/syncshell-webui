import { useContext, useRef, useState } from 'preact/hooks';
import { Dialog } from '../../ui/Dialog.jsx';
import { Icon } from '../../Icon.jsx';
import { Tabs } from '../../Tabs.jsx';
import { LocaleContext } from '../../core/locale/LocaleContext.jsx';
import { cloneConfig } from '../../core/config/configValues.mjs';
import { EditorField } from '../../ui/EditorField.jsx';
import { ConfirmManagementAction } from '../management/ConfirmManagementAction.jsx';
import { deviceFieldHelp } from './DeviceDefinitionRow.jsx';
import { DeviceSharingFields } from './DeviceSharingFields.jsx';
import { ShareDeviceIdentity } from './ShareDeviceIdentity.jsx';
import {
  deviceEditorFieldState,
  deviceEditorFields,
  reduceDeviceDraft,
  saveDeviceEditor,
} from './device-editor.mjs';

export function DeviceEditor({
  action,
  state,
  api,
  session,
  onClose,
  onSaved,
}) {
  const { t } = useContext(LocaleContext);
  const defaults = !!action.defaults;
  const isNew = action.type === 'add-device';
  const [draft, setDraft] = useState(() => cloneConfig(action.device));
  const [tab, setTab] = useState(
    action.tab === 'sharing' ? 'Sharing' : 'General',
  );
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const form = useRef();
  const [shares, setShares] = useState(() =>
    Object.fromEntries(
      state.config.folders.map((folder) => {
        const member = folder.devices.find(
          (device) => device.deviceID === draft.deviceID,
        );
        return [
          folder.id,
          { selected: !!member, password: member?.encryptionPassword || '' },
        ];
      }),
    ),
  );
  const tabs = ['General', 'Sharing', 'Advanced'].filter(
    (name) => !defaults || name !== 'Sharing',
  );
  const tabItems = tabs.map((name) => ({
    id: name,
    tabId: 'editor-' + name.toLowerCase().replaceAll(' ', '-') + '-tab',
    panelId: 'editor-panel',
    label: t(name),
    disabled: false,
  }));
  const fields = deviceEditorFields(tab)
    .map((field) => deviceEditorFieldState(field, draft, state.system.myID))
    .filter(
      (field) =>
        !field.hidden &&
        (!defaults || !['id', 'deviceID'].includes(field.path)),
    );
  const title = defaults
    ? 'Edit Device Defaults'
    : (isNew ? 'Add ' : 'Edit ') + 'Device';

  function updateField(field, value) {
    setDraft((previous) =>
      reduceDeviceDraft(previous, { type: field.action, value }),
    );
  }

  function updateShare(id, property, value) {
    setShares((previous) => ({
      ...previous,
      [id]: { ...previous[id], [property]: value },
    }));
  }

  function selectAllFolders(selected) {
    setShares((previous) =>
      Object.fromEntries(
        Object.entries(previous).map(([id, share]) => [
          id,
          { ...share, selected },
        ]),
      ),
    );
  }

  async function save() {
    if (!form.current.reportValidity()) return;
    setBusy(true);
    setError('');
    try {
      await saveDeviceEditor({
        session,
        api,
        state,
        draft,
        isNew,
        shares,
        defaults,
      });
      onSaved?.(cloneConfig(draft), []);
      onClose();
    } catch (error) {
      setError(error.message);
    } finally {
      setBusy(false);
    }
  }

  function cancel() {
    if (!busy) onClose();
  }

  const footer = (
    <>
      {!defaults && !isNew && draft.deviceID !== state.system.myID && (
        <button
          class="btn btn-warning btn-sm pull-left"
          disabled={busy}
          onClick={() => setRemoving(true)}
        >
          {t('Remove')}
        </button>
      )}
      <button class="btn btn-primary btn-sm" disabled={busy} onClick={save}>
        <Icon name="check" />
        &nbsp;{t('Save')}
      </button>
      <button class="btn btn-default btn-sm" disabled={busy} onClick={cancel}>
        <Icon name="x" />
        &nbsp;{t('Cancel')}
      </button>
    </>
  );

  return (
    <>
      <Dialog
        title={title}
        large
        icon="settings"
        footer={footer}
        onClose={cancel}
        onCancel={cancel}
      >
        <form
          ref={form}
          aria-describedby={error ? 'editor-error' : undefined}
          onSubmit={(event) => {
            event.preventDefault();
            save();
          }}
        >
          <Tabs activeId={tab} items={tabItems} onSelect={setTab} />
          {error && (
            <p id="editor-error" class="text-danger" role="alert">
              {t(error)}
            </p>
          )}
          <datalist id="editor-groups">
            {[
              ...new Set(
                state.config.devices
                  .map((device) => device.group)
                  .filter(Boolean),
              ),
            ].map((group) => (
              <option key={group} value={group} />
            ))}
          </datalist>
          <div
            id="editor-panel"
            class="tab-content"
            role="tabpanel"
            aria-labelledby={
              'editor-' + tab.toLowerCase().replaceAll(' ', '-') + '-tab'
            }
          >
            {tab === 'Sharing' ? (
              <DeviceSharingFields
                device={draft}
                folders={state.config.folders}
                pendingFolders={state.pendingFolders}
                completion={state.completion}
                shares={shares}
                onSelectAll={selectAllFolders}
                onChange={updateShare}
              />
            ) : (
              <>
                {tab === 'General' && !defaults && (
                  <ShareDeviceIdentity device={draft} api={api} />
                )}
                {fields.map((field) => (
                  <div class="form-group" key={field.path}>
                    <EditorField
                      field={field}
                      draft={draft}
                      help={deviceFieldHelp[field.label]}
                      hasError={Boolean(error)}
                      isNew={isNew}
                      defaults={defaults}
                      onChange={(value) => updateField(field, value)}
                    />
                  </div>
                ))}
              </>
            )}
          </div>
        </form>
      </Dialog>
      {removing && (
        <ConfirmManagementAction
          action={{ type: 'remove-device', device: draft }}
          api={api}
          session={session}
          devices={state.config.devices}
          onClose={() => setRemoving(false)}
          onDone={onClose}
        />
      )}
    </>
  );
}

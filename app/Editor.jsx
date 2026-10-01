import { useContext, useEffect, useRef, useState } from 'preact/hooks';
import { LocaleContext } from './core/locale/LocaleContext.jsx';
import { Dialog } from './Dialog.jsx';
import { ConfirmManagementAction } from './features/management/ConfirmManagementAction.jsx';
import { cloneConfig, ignoreLines } from '../client/edit.mjs';
import { deviceFieldHelp } from './features/devices/DeviceDefinitionRow.jsx';
import { folderFieldHelp } from './features/folders/FolderDefinitionRow.jsx';
import { ShareDeviceIdentity } from './features/devices/ShareDeviceIdentity.jsx';
import { DeviceSharingFields } from './features/devices/DeviceSharingFields.jsx';
import {
  deviceEditorFieldState,
  deviceEditorFields,
  reduceDeviceDraft,
  saveDeviceEditor,
} from './features/devices/device-editor.mjs';
import {
  folderEditorFieldState,
  folderEditorFields,
  folderPath,
  newFolderSavePhases,
  overlappingPath,
  reduceNewFolderSavePhase,
  reduceFolderDraft,
  saveFolderEditor,
} from './features/folders/folder-editor.mjs';
import { Icon } from './Icon.jsx';
import { Tabs } from './Tabs.jsx';
import { FolderExtendedAttributes } from './features/folders/FolderExtendedAttributes.jsx';
import { FolderIgnorePatterns } from './features/folders/FolderIgnorePatterns.jsx';
import { FolderSharingFields } from './features/folders/FolderSharingFields.jsx';
import { FolderVersioningFields } from './features/folders/FolderVersioningFields.jsx';
import { EditorField } from './EditorField.jsx';

export function Editor({ action, state, api, session, onClose, onSaved }) {
  const { t } = useContext(LocaleContext);
  const kind = action.type.includes('device') ? 'device' : 'folder';
  const activeFieldHelp = kind === 'folder' ? folderFieldHelp : deviceFieldHelp;
  const defaults = !!action.defaults;
  const isNew = action.type.startsWith('add');
  const [draft, setDraft] = useState(() => cloneConfig(action[kind]));
  const [tab, setTab] = useState(
    action.tab === 'sharing'
      ? 'Sharing'
      : action.tab === 'ignores'
        ? 'Ignore Patterns'
        : 'General',
  );
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [addIgnores, setAddIgnores] = useState(false);
  const autoPath = useRef(true);
  const [directories, setDirectories] = useState([]);
  const [savePhase, setSavePhase] = useState(newFolderSavePhases.editing);
  const [ignores, setIgnores] = useState('');
  const originalIgnores = useRef([]);
  const [loadedIgnores, setLoadedIgnores] = useState(false);
  const saved = useRef(false);
  const form = useRef();
  const savingAddedIgnores = savePhase !== newFolderSavePhases.editing;
  const addedIgnoresReady = savePhase === newFolderSavePhases.editingIgnores;
  const [passwords, setPasswords] = useState(() =>
    Object.fromEntries(
      (draft.devices || []).map((member) => [
        member.deviceID,
        member.encryptionPassword || '',
      ]),
    ),
  );
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
  const tabs = (
    kind === 'folder'
      ? ['General', 'Sharing', 'File Versioning', 'Ignore Patterns', 'Advanced']
      : ['General', 'Sharing', 'Advanced']
  ).filter((name) => !defaults || name !== 'Sharing');
  const tabItems = tabs.map((name) => ({
    id: name,
    tabId: 'editor-' + name.toLowerCase().replaceAll(' ', '-') + '-tab',
    panelId: 'editor-panel',
    label: t(name),
    disabled: tabDisabled(name),
  }));
  const describedFields =
    kind === 'device' ? deviceEditorFields(tab) : folderEditorFields(tab);
  const fields = describedFields
    .map((field) =>
      kind === 'device'
        ? deviceEditorFieldState(field, draft, state.system.myID)
        : folderEditorFieldState(field, draft, { isNew, defaults }),
    )
    .filter(
      (field) =>
        !field.hidden &&
        (!defaults || !['id', 'deviceID'].includes(field.path)),
    );
  const title = defaults
    ? 'Edit ' + (kind === 'folder' ? 'Folder' : 'Device') + ' Defaults'
    : (isNew ? 'Add ' : 'Edit ') + (kind === 'folder' ? 'Folder' : 'Device');
  const overlap =
    kind === 'folder'
      ? overlappingPath(draft, state.config, state.system)
      : null;
  useEffect(() => {
    if (kind !== 'folder' || (!isNew && !defaults) || !draft.path) return;
    const controller = new AbortController();
    api
      .get('system/browse', {
        query: { current: draft.path },
        signal: controller.signal,
      })
      .then(setDirectories)
      .catch((error) => {
        if (!controller.signal.aborted) setError(error.message);
      });
    return () => controller.abort();
  }, [api, kind, isNew, defaults, draft.path]);
  useEffect(() => {
    if (kind === 'folder' && isNew && state.config.defaults.folder.path)
      setDraft((previous) => ({
        ...previous,
        path: folderPath(
          state.config.defaults.folder.path,
          previous.label || previous.id,
          state.system.pathSeparator,
        ),
      }));
    if (defaults && kind === 'folder') {
      originalIgnores.current = state.config.defaults.ignores.lines;
      setIgnores(originalIgnores.current.join('\n'));
      setLoadedIgnores(true);
      return;
    }
    if (kind === 'folder' && !isNew && draft.type !== 'receiveencrypted') {
      api
        .get('db/ignores', { query: { folder: draft.id } })
        .then((data) => {
          originalIgnores.current = data.ignore || [];
          setIgnores(originalIgnores.current.join('\n'));
          setLoadedIgnores(true);
          if (data.error) setError(data.error);
        })
        .catch((error) => setError(error.message));
    }
  }, []);
  function tabDisabled(name) {
    return (
      (savingAddedIgnores && name !== 'Ignore Patterns') ||
      (kind === 'folder' &&
        draft.type === 'receiveencrypted' &&
        name === 'Ignore Patterns')
    );
  }
  function updateField(field, value) {
    if (field.path === 'path') autoPath.current = false;
    setDraft((previous) => {
      if (kind === 'device') {
        return reduceDeviceDraft(previous, { type: field.action, value });
      }
      return reduceFolderDraft(
        previous,
        { type: field.action, value },
        {
          isNew,
          defaults,
          autoPath: autoPath.current,
          config: state.config,
          system: state.system,
        },
      );
    });
  }
  function dispatchFolder(action) {
    setDraft((previous) =>
      reduceFolderDraft(previous, action, {
        isNew,
        defaults,
        autoPath: autoPath.current,
        config: state.config,
        system: state.system,
      }),
    );
  }
  async function loadAddedIgnores() {
    setSavePhase((phase) =>
      reduceNewFolderSavePhase(phase, 'start-ignore-load'),
    );
    setLoadedIgnores(false);
    setBusy(true);
    setError('');
    try {
      const data = await api.get('db/ignores', {
        query: { folder: draft.id },
      });
      originalIgnores.current =
        data.ignore?.length || data.error
          ? data.ignore || []
          : state.config.defaults?.ignores?.lines || [];
      setIgnores(originalIgnores.current.join('\n'));
      setLoadedIgnores(true);
      setSavePhase((phase) =>
        reduceNewFolderSavePhase(phase, 'ignore-load-succeeded'),
      );
      if (data.error) setError(data.error);
    } catch (error) {
      setSavePhase((phase) =>
        reduceNewFolderSavePhase(phase, 'ignore-load-failed'),
      );
      setError(error.message);
    } finally {
      setBusy(false);
    }
  }
  function sharePassword(id, value) {
    setPasswords((previous) => ({ ...previous, [id]: value }));
    setDraft((previous) => ({
      ...previous,
      devices: previous.devices.map((member) =>
        member.deviceID === id
          ? { ...member, encryptionPassword: value }
          : member,
      ),
    }));
  }
  function shareDevice(id, selected) {
    setDraft((draft) => ({
      ...draft,
      devices: selected
        ? [
            ...draft.devices,
            { deviceID: id, encryptionPassword: passwords[id] || '' },
          ]
        : draft.devices.filter((device) => device.deviceID !== id),
    }));
  }
  function selectFolderDevices(selected) {
    setDraft((previous) => ({
      ...previous,
      devices: selected
        ? state.config.devices.map(
            (device) =>
              previous.devices.find(
                (member) => member.deviceID === device.deviceID,
              ) || {
                deviceID: device.deviceID,
                encryptionPassword: passwords[device.deviceID] || '',
              },
          )
        : previous.devices.filter(
            (member) => member.deviceID === state.system.myID,
          ),
    }));
  }
  function shareFolder(id, property, value) {
    setShares((shares) => ({
      ...shares,
      [id]: { ...shares[id], [property]: value },
    }));
  }
  function selectDeviceFolders(selected) {
    setShares((previous) =>
      Object.fromEntries(
        Object.entries(previous).map(([id, share]) => [
          id,
          { ...share, selected },
        ]),
      ),
    );
  }
  function saveDraft(options = {}) {
    const request = {
      session,
      api,
      state,
      draft,
      isNew,
      shares,
      ...options,
    };
    return kind === 'device'
      ? saveDeviceEditor(request)
      : saveFolderEditor(request);
  }
  async function save() {
    if (!form.current.reportValidity()) return;
    setBusy(true);
    setError('');
    try {
      if (defaults) {
        await saveDraft({
          defaults,
          ignores: ignoreLines(ignores),
        });
      } else if (savingAddedIgnores) {
        if (!addedIgnoresReady) return;
        await api.post('db/ignores', {
          body: { ignore: ignoreLines(ignores) },
          query: { folder: draft.id },
        });
        await session.setPaused('folders', draft.id, !!draft.paused);
      } else if (
        kind === 'folder' &&
        isNew &&
        addIgnores &&
        draft.type !== 'receiveencrypted'
      ) {
        await saveDraft({
          draft: { ...cloneConfig(draft), paused: true },
        });
        setTab('Ignore Patterns');
        await loadAddedIgnores();
        return;
      } else {
        if (
          kind === 'folder' &&
          loadedIgnores &&
          ignores !== originalIgnores.current.join('\n')
        )
          await api.post('db/ignores', {
            body: { ignore: ignoreLines(ignores) },
            query: { folder: draft.id },
          });
        await saveDraft();
      }
      saved.current = true;
      onSaved?.(cloneConfig(draft), ignoreLines(ignores));
      onClose();
    } catch (error) {
      setError(error.message);
    } finally {
      setBusy(false);
    }
  }
  async function cancel() {
    if (busy) return;
    if (!saved.current && addedIgnoresReady) {
      saved.current = true;
      try {
        await api.post('db/ignores', {
          body: { ignore: originalIgnores.current },
          query: { folder: draft.id },
        });
        await session.setPaused('folders', draft.id, !!draft.paused);
      } catch (error) {
        session.reportError(error);
      }
    }
    onClose();
  }
  const footer = (
    <>
      {!defaults &&
        !isNew &&
        savePhase === newFolderSavePhases.editing &&
        draft.deviceID !== state.system.myID && (
          <button
            class="btn btn-warning btn-sm pull-left"
            disabled={busy}
            onClick={() => setRemoving(true)}
          >
            {t('Remove')}
          </button>
        )}
      <button
        class="btn btn-primary btn-sm"
        disabled={busy || (savingAddedIgnores && !addedIgnoresReady)}
        onClick={save}
      >
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
          <datalist id="directory-list">
            {directories.map((directory) => (
              <option key={directory} value={directory} />
            ))}
          </datalist>
          <datalist id="editor-groups">
            {[
              ...new Set(
                state.config[kind === 'folder' ? 'folders' : 'devices']
                  .map((item) => item.group)
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
            {tab === 'Sharing' && kind === 'folder' ? (
              <FolderSharingFields
                folder={draft}
                devices={state.config.devices}
                localDeviceID={state.system.myID}
                pendingFolders={state.pendingFolders}
                completion={state.completion}
                passwords={passwords}
                onSelectAll={selectFolderDevices}
                onSelected={shareDevice}
                onPassword={sharePassword}
              />
            ) : tab === 'Sharing' ? (
              <DeviceSharingFields
                device={draft}
                folders={state.config.folders}
                pendingFolders={state.pendingFolders}
                completion={state.completion}
                shares={shares}
                onSelectAll={selectDeviceFolders}
                onChange={shareFolder}
              />
            ) : tab === 'Ignore Patterns' ? (
              <FolderIgnorePatterns
                folder={draft}
                isNew={isNew}
                savingAddedIgnores={savingAddedIgnores}
                addedIgnoresReady={addedIgnoresReady}
                busy={busy}
                addIgnores={addIgnores}
                ignores={ignores}
                loadedIgnores={loadedIgnores}
                onRetry={loadAddedIgnores}
                onToggleAdd={setAddIgnores}
                onInput={setIgnores}
              />
            ) : (
              <>
                {kind === 'device' && tab === 'General' && !defaults && (
                  <ShareDeviceIdentity device={draft} api={api} />
                )}
                {fields.map((field) => (
                  <div class="form-group" key={field.path}>
                    <EditorField
                      field={field}
                      draft={draft}
                      help={activeFieldHelp[field.label]}
                      hasError={Boolean(error)}
                      isNew={isNew}
                      defaults={defaults}
                      onChange={(value) => updateField(field, value)}
                    />
                    {field.path === 'path' && overlap && (
                      <p class="text-warning">
                        {t(
                          overlap.type === 'subdirectory'
                            ? 'Warning, this path is a subdirectory of an existing folder "{%otherFolder%}".'
                            : 'Warning, this path is a parent directory of an existing folder "{%otherFolder%}".',
                        ).replace(
                          '{%otherFolder%}',
                          overlap.folder.label || overlap.folder.id,
                        )}
                      </p>
                    )}
                  </div>
                ))}
                {tab === 'File Versioning' && (
                  <FolderVersioningFields
                    draft={draft}
                    dispatch={dispatchFolder}
                  />
                )}
                {kind === 'folder' &&
                  tab === 'Advanced' &&
                  (draft.syncXattrs || draft.sendXattrs) && (
                    <FolderExtendedAttributes
                      draft={draft}
                      dispatch={dispatchFolder}
                    />
                  )}
              </>
            )}
          </div>
        </form>
      </Dialog>
      {removing && (
        <ConfirmManagementAction
          action={{ type: 'remove-' + kind, [kind]: draft }}
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

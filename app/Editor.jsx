import { useContext, useEffect, useRef, useState } from 'preact/hooks';
import { LocaleContext } from './locale-context.jsx';
import { Dialog } from './Dialog.jsx';
import { ConfirmManagementAction } from './features/management/ConfirmManagementAction.jsx';
import {
  cloneConfig,
  getValue,
  inputValue,
  changedValue,
  ignoreLines,
} from '../client/edit.mjs';
import { fieldHelp } from '../client/field-help.mjs';
import { Tooltip } from './Tooltip.jsx';
import { ShareDeviceIdentity } from './features/devices/ShareDeviceIdentity.jsx';
import { EncryptedShareField } from './features/sharing/EncryptedShareField.jsx';
import { deviceName } from './features/devices/device-status.mjs';
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
  xattrDefault,
  xattrHint,
} from './features/folders/folder-editor.mjs';
import { Icon } from './Icon.jsx';
import { Tabs } from './Tabs.jsx';

export function Editor({ action, state, api, session, onClose, onSaved }) {
  const { t } = useContext(LocaleContext);
  const kind = action.type.includes('device') ? 'device' : 'folder';
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
      .get('system/browse', { current: draft.path }, controller.signal)
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
        .get('db/ignores', { folder: draft.id })
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
  function fieldDescriptions(field) {
    const descriptions = [];
    if (fieldHelp[field.label]) {
      descriptions.push('editor-' + field.path + '-help');
    }
    if (error) descriptions.push('editor-error');
    return descriptions.join(' ') || undefined;
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
      const data = await api.get('db/ignores', { folder: draft.id });
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
  function shareFolder(id, property, value) {
    setShares((shares) => ({
      ...shares,
      [id]: { ...shares[id], [property]: value },
    }));
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
        await api.post(
          'db/ignores',
          { ignore: ignoreLines(ignores) },
          { folder: draft.id },
        );
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
          await api.post(
            'db/ignores',
            { ignore: ignoreLines(ignores) },
            { folder: draft.id },
          );
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
        await api.post(
          'db/ignores',
          { ignore: originalIgnores.current },
          { folder: draft.id },
        );
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
            {tab === 'Sharing' ? (
              <>
                <div class="folder-actions">
                  {[true, false].map((select) => (
                    <button
                      key={String(select)}
                      type="button"
                      class="btn btn-link btn-sm"
                      onClick={() => {
                        if (kind === 'folder')
                          setDraft((previous) => ({
                            ...previous,
                            devices: select
                              ? state.config.devices.map(
                                  (device) =>
                                    previous.devices.find(
                                      (member) =>
                                        member.deviceID === device.deviceID,
                                    ) || {
                                      deviceID: device.deviceID,
                                      encryptionPassword:
                                        passwords[device.deviceID] || '',
                                    },
                                )
                              : previous.devices.filter(
                                  (member) =>
                                    member.deviceID === state.system.myID,
                                ),
                          }));
                        else
                          setShares((previous) =>
                            Object.fromEntries(
                              Object.entries(previous).map(([id, share]) => [
                                id,
                                { ...share, selected: select },
                              ]),
                            ),
                          );
                      }}
                    >
                      {t(select ? 'Select All' : 'Deselect All')}
                    </button>
                  ))}
                </div>
                <p class="help-block">
                  {t(
                    kind === 'folder'
                      ? 'Select additional devices to share this folder with.'
                      : 'Select the folders to share with this device.',
                  )}
                </p>
                {kind === 'folder'
                  ? state.config.devices
                      .filter((device) => device.deviceID !== state.system.myID)
                      .map((device) => {
                        const member = draft.devices.find(
                          (item) => item.deviceID === device.deviceID,
                        );
                        return (
                          <EncryptedShareField
                            key={device.deviceID}
                            label={deviceName(device)}
                            id={device.deviceID}
                            isSelected={!!member}
                            password={passwords[device.deviceID] || ''}
                            isEncrypted={draft.type === 'receiveencrypted'}
                            isPasswordRequired={
                              device.untrusted ||
                              state.pendingFolders[draft.id]?.offeredBy?.[
                                device.deviceID
                              ]?.remoteEncrypted
                            }
                            remoteState={
                              state.completion[device.deviceID]?.[draft.id]
                                ?.remoteState
                            }
                            onSelected={(value) =>
                              shareDevice(device.deviceID, value)
                            }
                            onPassword={(value) =>
                              sharePassword(device.deviceID, value)
                            }
                          />
                        );
                      })
                  : state.config.folders.map((folder) => (
                      <EncryptedShareField
                        key={folder.id}
                        label={folder.label || folder.id}
                        id={folder.id}
                        isSelected={shares[folder.id].selected}
                        password={shares[folder.id].password}
                        isEncrypted={folder.type === 'receiveencrypted'}
                        isPasswordRequired={
                          draft.untrusted ||
                          state.pendingFolders[folder.id]?.offeredBy?.[
                            draft.deviceID
                          ]?.remoteEncrypted
                        }
                        remoteState={
                          state.completion[draft.deviceID]?.[folder.id]
                            ?.remoteState
                        }
                        onSelected={(value) =>
                          shareFolder(folder.id, 'selected', value)
                        }
                        onPassword={(value) =>
                          shareFolder(folder.id, 'password', value)
                        }
                      />
                    ))}
              </>
            ) : tab === 'Ignore Patterns' ? (
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
                      {t('Set Ignores on Added Folder')} ·{' '}
                      {draft.label || draft.id}
                    </p>
                    {!addedIgnoresReady && (
                      <button
                        type="button"
                        class="btn btn-default"
                        disabled={busy}
                        onClick={loadAddedIgnores}
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
                        onChange={(event) =>
                          setAddIgnores(event.currentTarget.checked)
                        }
                      />{' '}
                      {t('Add Ignore Patterns')}
                    </label>
                    <p>
                      {t(
                        'Patterns are applied before the folder starts synchronizing.',
                      )}
                    </p>
                  </>
                ) : (
                  <textarea
                    class="form-control"
                    rows="12"
                    aria-label={t('Ignore Patterns')}
                    value={ignores}
                    disabled={
                      draft.type === 'receiveencrypted' || !loadedIgnores
                    }
                    onInput={(event) => setIgnores(event.currentTarget.value)}
                  />
                )}
              </>
            ) : (
              <>
                {kind === 'device' && tab === 'General' && !defaults && (
                  <ShareDeviceIdentity device={draft} api={api} />
                )}
                {fields.map((field) => (
                  <div class="form-group" key={field.path}>
                    {field.type === 'checkbox' ? (
                      <label>
                        <input
                          type="checkbox"
                          checked={
                            field.checked ?? !!getValue(draft, field.path)
                          }
                          disabled={field.disabled}
                          aria-describedby={fieldDescriptions(field)}
                          onChange={(event) =>
                            updateField(
                              field,
                              changedValue(field, event.currentTarget),
                            )
                          }
                        />{' '}
                        {t(field.label)}
                      </label>
                    ) : (
                      <>
                        <label for={'editor-' + field.path}>
                          {t(field.label)}
                        </label>
                        {fieldHelp[field.label] && (
                          <Tooltip
                            icon="info"
                            label={field.label}
                            text={fieldHelp[field.label].help}
                          />
                        )}
                        {field.type === 'select' ? (
                          <select
                            id={'editor-' + field.path}
                            class="form-control"
                            value={inputValue(draft, field)}
                            disabled={field.disabled}
                            aria-describedby={fieldDescriptions(field)}
                            onChange={(event) =>
                              updateField(field, event.currentTarget.value)
                            }
                          >
                            {field.options.map(({ value, label }) => (
                              <option key={value} value={value}>
                                {t(label)}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            id={'editor-' + field.path}
                            class="form-control"
                            type={field.type === 'list' ? 'text' : field.type}
                            value={inputValue(draft, field)}
                            disabled={field.disabled}
                            aria-describedby={fieldDescriptions(field)}
                            list={
                              field.path === 'path'
                                ? 'directory-list'
                                : field.path === 'group'
                                  ? 'editor-groups'
                                  : undefined
                            }
                            readOnly={
                              !isNew &&
                              !defaults &&
                              ['id', 'path', 'deviceID'].includes(field.path)
                            }
                            required={
                              !defaults &&
                              ['id', 'path', 'deviceID'].includes(field.path)
                            }
                            step={
                              field.path.endsWith('.value') ? '0.01' : undefined
                            }
                            min={field.type === 'number' ? 0 : undefined}
                            onInput={(event) =>
                              updateField(
                                field,
                                changedValue(field, event.currentTarget),
                              )
                            }
                          />
                        )}
                      </>
                    )}
                    {field.type === 'checkbox' && fieldHelp[field.label] && (
                      <Tooltip
                        icon="info"
                        label={field.label}
                        text={fieldHelp[field.label].help}
                      />
                    )}
                    {fieldHelp[field.label] && (
                      <span
                        id={'editor-' + field.path + '-help'}
                        class="sr-only"
                      >
                        {t(fieldHelp[field.label].help)}
                      </span>
                    )}
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
                {tab === 'File Versioning' &&
                  draft.versioning.type &&
                  (draft.versioning.type === 'simple'
                    ? [
                        ['keep', 'Keep Versions'],
                        ['cleanoutDays', 'Clean out after'],
                      ]
                    : draft.versioning.type === 'trashcan'
                      ? [['cleanoutDays', 'Clean out after']]
                      : draft.versioning.type === 'staggered'
                        ? [['maxAge', 'Maximum Age']]
                        : [['command', 'External Versioning Command']]
                  ).map(([key, label]) => (
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
                            ? Math.floor(
                                Number(draft.versioning.params?.[key] || 0) /
                                  86400,
                              )
                            : draft.versioning.params?.[key] || ''
                        }
                        onInput={(event) =>
                          dispatchFolder({
                            type: 'set-folder-versioning-parameter',
                            key,
                            value:
                              key === 'maxAge'
                                ? String(
                                    Number(event.currentTarget.value) * 86400,
                                  )
                                : event.currentTarget.value,
                          })
                        }
                      />
                    </div>
                  ))}
                {kind === 'folder' &&
                  tab === 'Advanced' &&
                  (draft.syncXattrs || draft.sendXattrs) && (
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
                      {(draft.xattrFilter?.entries || []).map(
                        (entry, index) => (
                          <div class="xattr-rule" key={index}>
                            <input
                              type="checkbox"
                              aria-label={t('permit') + ' ' + (index + 1)}
                              checked={entry.permit}
                              onChange={(event) =>
                                dispatchFolder({
                                  type: 'set-folder-xattr-permit',
                                  index,
                                  value: event.currentTarget.checked,
                                })
                              }
                            />
                            <input
                              class="form-control"
                              aria-label={
                                t('Active filter rules') + ' ' + (index + 1)
                              }
                              value={entry.match}
                              onInput={(event) =>
                                dispatchFolder({
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
                                dispatchFolder({
                                  type: 'remove-folder-xattr-rule',
                                  index,
                                })
                              }
                            >
                              {t('Remove')}
                            </button>
                          </div>
                        ),
                      )}
                      <button
                        type="button"
                        class="btn btn-default"
                        onClick={() =>
                          dispatchFolder({ type: 'add-folder-xattr-rule' })
                        }
                      >
                        {t('Add filter entry')}
                      </button>
                      <p>
                        {t('Default')}:{' '}
                        {t(xattrDefault(draft.xattrFilter?.entries))}
                      </p>
                      <p>{t(xattrHint(draft.xattrFilter?.entries))}</p>
                    </>
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

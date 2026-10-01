import { desktopActions } from '../client/desktop.mjs';
import { useEffect, useState } from 'preact/hooks';
import { createApi } from '../client/api.mjs';
import { runReportedSessionAction } from '../client/session.mjs';
import { useSyncthingSession } from '../client/use-syncthing-session.mjs';
import { loadEnglish, translator } from '../client/locale.mjs';
import { groupAndSortItems } from '../client/grouping.mjs';
import { deviceName } from './features/devices/device-status.mjs';
import { UsageReport } from './features/reports/UsageReport.jsx';
import { needsUsageConsent } from './features/reports/reports.mjs';
import { prepareFolderEditorAction } from './features/folders/folder-editor.mjs';
import { prepareDeviceEditorAction } from './features/devices/device-editor.mjs';
import { notices } from './features/notifications/notices.mjs';
import { FolderCard } from './features/folders/FolderCard.jsx';
import { DeviceCard } from './features/devices/DeviceCard.jsx';
import { Login } from './Login.jsx';
import { Notifications } from './features/notifications/Notifications.jsx';
import { DialogHost } from './DialogHost.jsx';
import { Conflicts } from './Conflicts.jsx';
import { LocaleContext } from './locale-context.jsx';
import { Icon } from './Icon.jsx';
import { DashboardTabs } from './DashboardTabs.jsx';
import { MainNavigation } from './MainNavigation.jsx';
const desktop = desktopActions();

export function App() {
  const [api] = useState(() => createApi());
  const authenticated = Boolean(window.metadata?.authenticated);
  const [state, session] = useSyncthingSession(api, {
    active: authenticated,
    onAuthExpired: () => location.reload(),
  });
  const [locale, setLocale] = useState({ t: translator({}) });
  const [activeTab, setActiveTab] = useState('overview');
  const [action, setAction] = useState(null);
  const [usesMetricRates, setUsesMetricRates] = useState(false);
  const self = state.config.devices.find(
    (device) => device.deviceID === state.system.myID,
  );
  const others = state.config.devices.filter(
    (device) => device.deviceID !== state.system.myID,
  );
  const folderGroups = groupAndSortItems(state.config.folders, 'label', 'id');
  const deviceGroups = groupAndSortItems(others, 'name', 'deviceID');
  const cards = notices(state);
  const name = deviceName(self) || 'Syncthing';
  const { t } = locale;
  function toggleUnits() {
    setUsesMetricRates((value) => {
      try {
        localStorage.setItem('metricRates', String(!value));
      } catch {
        // Storage can be unavailable in restricted browser contexts.
      }
      return !value;
    });
  }
  async function openAction(next) {
    try {
      if (next.type === 'add-device') {
        next = await prepareDeviceEditorAction(api, next);
      }
      if (next.type === 'add-folder') {
        next = await prepareFolderEditorAction(api, state, next);
      }
      if (next.type === 'changes') await session.refreshGlobalChanges();
      setAction(next);
    } catch (error) {
      session.reportError(error);
    }
  }
  useEffect(() => {
    if (!state.ready) return;
    const launch = desktop?.takeLaunchAction?.();
    if (launch?.type !== 'edit-device') return;
    const device = state.config.devices.find(
      (candidate) => candidate.deviceID === launch.device,
    );
    if (device) openAction({ type: 'edit-device', device });
  }, [state.ready, state.config.devices]);
  useEffect(() => {
    loadEnglish()
      .then(setLocale)
      .catch((error) => session.reportError(error));
    try {
      setUsesMetricRates(localStorage.getItem('metricRates') === 'true');
    } catch {
      // Storage can be unavailable in restricted browser contexts.
    }
  }, [session]);
  useEffect(() => {
    document.title = name + ' | Syncshell';
  }, [name]);
  return (
    <LocaleContext.Provider value={locale}>
      <MainNavigation
        api={api}
        authenticated={authenticated}
        config={state.config}
        name={name}
        onAction={openAction}
        self={self}
        upgradeInfo={state.upgradeInfo}
      />
      <main class="container content">
        {!authenticated ? (
          <Login />
        ) : (
          <>
            {state.error &&
              !['restart', 'shutdown', 'upgrade'].includes(action?.type) && (
                <div class="alert alert-danger" role="alert">
                  {state.error.message}
                </div>
              )}
            {!state.configInSync && (
              <div class="alert alert-warning">
                {t('Restart Needed')}{' '}
                <button
                  class="btn btn-default btn-sm"
                  onClick={() => openAction({ type: 'restart' })}
                >
                  {t('Restart')}
                </button>
              </div>
            )}
            {!state.ready && <p role="status">{t('Loading data...')}</p>}
            <div class="dashboard">
              <DashboardTabs activeTab={activeTab} onSelect={setActiveTab} />
              <div class="tab-content">
                <div
                  id="dashboard-overview"
                  class={`tab-pane dashboard-primary ${activeTab === 'overview' ? 'active' : ''}`}
                  role="tabpanel"
                  aria-labelledby="overview-tab"
                >
                  <section
                    class="dashboard-folders"
                    aria-labelledby="folder-list"
                  >
                    <h3 id="folder-list">
                      {t('Folders')}
                      {state.config.folders.length > 1
                        ? ' (' + state.config.folders.length + ')'
                        : ''}
                    </h3>
                    {folderGroups.map(([group, folders]) => (
                      <div key={group}>
                        {group && (
                          <h4 class="folder-text" title={group}>
                            {group}
                            {folders.length > 1
                              ? ' (' + folders.length + ')'
                              : ''}
                          </h4>
                        )}
                        <div class="panel-group">
                          {folders.map((folder) => (
                            <FolderCard
                              key={folder.id}
                              api={api}
                              session={session}
                              state={state}
                              folder={folder}
                              progress={state.scanProgress[folder.id]}
                              info={state.model[folder.id]}
                              stats={state.folderStats[folder.id]}
                              rescan={() => session.rescan(folder.id)}
                              onAction={openAction}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                    <div class="folder-actions">
                      {state.config.folders.some(
                        (folder) => !folder.paused,
                      ) && (
                        <button
                          class="btn btn-sm btn-default"
                          onClick={() =>
                            runReportedSessionAction(
                              () =>
                                session.setPaused('folders', undefined, true),
                              session.reportError,
                            )
                          }
                        >
                          <Icon name="pause" /> {t('Pause All')}
                        </button>
                      )}
                      {state.config.folders.some((folder) => folder.paused) && (
                        <button
                          class="btn btn-sm btn-default"
                          onClick={() =>
                            runReportedSessionAction(
                              () =>
                                session.setPaused('folders', undefined, false),
                              session.reportError,
                            )
                          }
                        >
                          <Icon name="play" /> {t('Resume All')}
                        </button>
                      )}
                      {state.config.folders.length > 0 && (
                        <button
                          class="btn btn-sm btn-default"
                          onClick={() =>
                            runReportedSessionAction(
                              () => session.rescan(),
                              session.reportError,
                            )
                          }
                        >
                          <Icon name="refresh" /> {t('Rescan All')}
                        </button>
                      )}
                      <button
                        class="btn btn-sm btn-default"
                        onClick={() => openAction({ type: 'add-folder' })}
                      >
                        <Icon name="plus" /> {t('Add Folder')}
                      </button>
                    </div>
                  </section>
                  <section class="dashboard-devices" aria-label={t('Devices')}>
                    <div class="dashboard-heading">
                      <h3>{t('Devices')}</h3>
                      <button
                        class="btn btn-sm btn-default"
                        onClick={() => openAction({ type: 'changes' })}
                      >
                        <Icon name="clock" /> {t('Recent Changes')}
                      </button>
                    </div>
                    {self && (
                      <DeviceCard
                        device={self}
                        state={state}
                        session={session}
                        isLocalDevice
                        usesMetricRates={usesMetricRates}
                        toggleUnits={toggleUnits}
                        onAction={openAction}
                      />
                    )}
                    <div class="dashboard-remotes">
                      {deviceGroups.map(([group, devices]) => (
                        <div key={group}>
                          {group && (
                            <h4>
                              {group}
                              {devices.length > 1
                                ? ' (' + devices.length + ')'
                                : ''}
                            </h4>
                          )}
                          <div class="panel-group">
                            {devices.map((device) => (
                              <DeviceCard
                                key={device.deviceID}
                                device={device}
                                state={state}
                                session={session}
                                usesMetricRates={usesMetricRates}
                                toggleUnits={toggleUnits}
                                onAction={openAction}
                              />
                            ))}
                          </div>
                        </div>
                      ))}
                      <div class="folder-actions">
                        {others.some((device) => !device.paused) && (
                          <button
                            class="btn btn-sm btn-default"
                            onClick={() =>
                              runReportedSessionAction(
                                () =>
                                  session.setPaused('devices', undefined, true),
                                session.reportError,
                              )
                            }
                          >
                            {t('Pause All')}
                          </button>
                        )}
                        {others.some((device) => device.paused) && (
                          <button
                            class="btn btn-sm btn-default"
                            onClick={() =>
                              runReportedSessionAction(
                                () =>
                                  session.setPaused(
                                    'devices',
                                    undefined,
                                    false,
                                  ),
                                session.reportError,
                              )
                            }
                          >
                            {t('Resume All')}
                          </button>
                        )}
                        <button
                          class="btn btn-sm btn-default"
                          onClick={() => openAction({ type: 'add-device' })}
                        >
                          {t('Add Remote Device')}
                        </button>
                      </div>
                    </div>
                  </section>
                </div>
                <section
                  id="dashboard-conflicts"
                  class={`tab-pane ${activeTab === 'conflicts' ? 'active' : ''}`}
                  role="tabpanel"
                  aria-labelledby="conflicts-tab"
                >
                  <Conflicts
                    api={api}
                    hostActions={desktop || window.syncshellHostActions || null}
                    device={state.system.myID}
                    folders={state.config.folders}
                    ready={state.ready}
                    active={activeTab === 'conflicts'}
                  />
                </section>
                <section
                  id="dashboard-notifications"
                  class={`tab-pane notifications ${activeTab === 'notifications' ? 'active' : ''}`}
                  role="tabpanel"
                  aria-labelledby="notifications-tab"
                >
                  <Notifications
                    cards={cards}
                    session={session}
                    onAction={openAction}
                  />
                </section>
              </div>
            </div>
          </>
        )}
      </main>
      {action && (
        <DialogHost
          key={
            action.type + (action.device?.deviceID || action.folder?.id || '')
          }
          action={action}
          state={state}
          api={api}
          session={session}
          onClose={() => setAction(null)}
        />
      )}
      {needsUsageConsent(state) && (
        <UsageReport
          api={api}
          session={session}
          state={state}
          consent
          onClose={() => {}}
        />
      )}
    </LocaleContext.Provider>
  );
}

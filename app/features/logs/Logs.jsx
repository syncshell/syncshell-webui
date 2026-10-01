import { useContext, useEffect, useRef, useState } from 'preact/hooks';
import { Dialog } from '../../ui/Dialog.jsx';
import { LocaleContext } from '../../core/locale/LocaleContext.jsx';
import { Tabs } from '../../Tabs.jsx';
import { LoggingFacilities } from './LoggingFacilities.jsx';
import { useLogTail } from './useLogTail.mjs';

export function Logs({ api, onClose }) {
  const { t } = useContext(LocaleContext);
  const area = useRef();
  const [tab, setTab] = useState('Log');
  const { entries, error, setError, paused, setPaused } = useLogTail(api);
  const tabItems = ['Log', 'Debugging Facilities'].map((name) => ({
    id: name,
    tabId: 'logs-' + name.toLowerCase().replaceAll(' ', '-') + '-tab',
    panelId: 'logs-panel',
    label: t(name),
  }));
  const content = entries
    .map(
      (entry) =>
        entry.when.split('.')[0].replace('T', ' ') +
        ' ' +
        (entry.level || '') +
        ' ' +
        entry.message,
    )
    .join('\n');
  useEffect(() => {
    if (!paused && area.current)
      area.current.scrollTop = area.current.scrollHeight;
  }, [entries, paused, tab]);
  return (
    <Dialog title="Logs" large icon="wrench" onClose={onClose}>
      <Tabs activeId={tab} items={tabItems} onSelect={setTab} />
      <div
        id="logs-panel"
        role="tabpanel"
        aria-labelledby={
          'logs-' + tab.toLowerCase().replaceAll(' ', '-') + '-tab'
        }
      >
        {error && (
          <p class="text-danger" role="alert">
            {error}
          </p>
        )}
        {tab === 'Log' && (
          <>
            <textarea
              ref={area}
              class="form-control text-monospace"
              aria-label={t('Log')}
              rows="20"
              readOnly
              value={content}
              onScroll={() => {
                const element = area.current;
                setPaused(
                  element.scrollHeight >
                    element.scrollTop + element.clientHeight + 1,
                );
              }}
            />
            {paused && (
              <button
                class="btn btn-link"
                onClick={() => {
                  setPaused(false);
                  area.current.scrollTop = area.current.scrollHeight;
                }}
              >
                {t('Log tailing paused. Scroll to the bottom to continue.')}
              </button>
            )}
          </>
        )}
        <div hidden={tab !== 'Debugging Facilities'}>
          <LoggingFacilities api={api} onError={setError} />
        </div>
      </div>
    </Dialog>
  );
}

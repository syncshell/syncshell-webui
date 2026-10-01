import { useContext, useEffect, useRef, useState } from 'preact/hooks';
import { LocaleContext } from './locale-context.jsx';
import { Dialog } from './Dialog.jsx';
import { Tabs } from './Tabs.jsx';
export function Logs({ api, onClose }) {
  const { t } = useContext(LocaleContext);
  const area = useRef();
  const pausedRef = useRef(false);
  const [tab, setTab] = useState('Log');
  const [entries, setEntries] = useState([]);
  const [facilities, setFacilities] = useState({ levels: {}, packages: {} });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [paused, setPaused] = useState(false);
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
    const controller = new AbortController();
    let timer, since;
    api
      .get('system/loglevels', undefined, controller.signal)
      .then(setFacilities)
      .catch((error) => {
        if (!controller.signal.aborted) setError(error.message);
      });
    async function poll() {
      try {
        if (!pausedRef.current) {
          const data = await api.get(
            'system/log',
            { since },
            controller.signal,
          );
          if (!pausedRef.current && !controller.signal.aborted) {
            setEntries((previous) => [...previous, ...(data.messages || [])]);
            since = data.messages?.at(-1)?.when || since;
            setError('');
          }
        }
      } catch (error) {
        if (!controller.signal.aborted) setError(error.message);
      } finally {
        if (!controller.signal.aborted) timer = setTimeout(poll, 2000);
      }
    }
    poll();
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [api]);
  useEffect(() => {
    if (!pausedRef.current && area.current)
      area.current.scrollTop = area.current.scrollHeight;
  }, [entries, tab]);
  async function setLoggingLevel(key, value) {
    setBusy(true);
    try {
      await api.post('system/loglevels', {
        ...facilities.levels,
        [key]: value,
      });
      setFacilities(await api.get('system/loglevels'));
      setError('');
    } catch (error) {
      setError(error.message);
    } finally {
      setBusy(false);
    }
  }
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
        {tab === 'Log' ? (
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
                pausedRef.current =
                  element.scrollHeight >
                  element.scrollTop + element.clientHeight + 1;
                setPaused(pausedRef.current);
              }}
            />
            {paused && (
              <button
                class="btn btn-link"
                onClick={() => {
                  pausedRef.current = false;
                  setPaused(false);
                  area.current.scrollTop = area.current.scrollHeight;
                }}
              >
                {t('Log tailing paused. Scroll to the bottom to continue.')}
              </button>
            )}
          </>
        ) : (
          <>
            <p>{t('Available debug logging facilities:')}</p>
            <table class="table table-striped">
              <tbody>
                {Object.entries(facilities.levels).map(([key, value]) => (
                  <tr key={key}>
                    <td>
                      {facilities.packages[key]} (<code>{key}</code>)
                    </td>
                    <td>
                      <select
                        class="form-control"
                        aria-label={key}
                        disabled={busy}
                        value={value}
                        onChange={(event) =>
                          setLoggingLevel(key, event.currentTarget.value)
                        }
                      >
                        {[
                          ['DEBUG', 'Debug'],
                          ['INFO', 'Info'],
                          ['WARN', 'Warning'],
                          ['ERROR', 'Error'],
                        ].map(([level, label]) => (
                          <option key={level} value={level}>
                            {t(label)}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>
    </Dialog>
  );
}

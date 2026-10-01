import { useEffect, useState } from 'preact/hooks';
import { useLocale } from '../../core/locale/LocaleContext.jsx';

const loggingLevels = [
  { value: 'DEBUG', label: 'Debug' },
  { value: 'INFO', label: 'Info' },
  { value: 'WARN', label: 'Warning' },
  { value: 'ERROR', label: 'Error' },
];

export function LoggingFacilities({ api, onError }) {
  const { t } = useLocale();
  const [facilities, setFacilities] = useState({ levels: {}, packages: {} });
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    api
      .get('system/loglevels', { signal: controller.signal })
      .then(setFacilities)
      .catch((error) => {
        if (!controller.signal.aborted) onError(error.message);
      });
    return () => controller.abort();
  }, [api, onError]);
  async function setLoggingLevel(key, value) {
    setBusy(true);
    try {
      await api.post('system/loglevels', {
        body: { ...facilities.levels, [key]: value },
      });
      setFacilities(await api.get('system/loglevels'));
      onError('');
    } catch (error) {
      onError(error.message);
    } finally {
      setBusy(false);
    }
  }
  return (
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
                  {loggingLevels.map((level) => (
                    <option key={level.value} value={level.value}>
                      {t(level.label)}
                    </option>
                  ))}
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

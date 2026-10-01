import { useEffect, useState } from 'preact/hooks';
import { Dialog } from '../../ui/Dialog.jsx';
import { useLocale } from '../../core/locale/LocaleContext.jsx';
import { decideUsage, usageReport } from './reports.mjs';

export function UsageReport({ api, session, state, consent = false, onClose }) {
  const { t } = useLocale();
  const [maximum] = useState(state.system.urVersionMax || 2);
  const [version, setVersion] = useState(maximum);
  const [diff, setDiff] = useState(false);
  const [preview, setPreview] = useState(!consent);
  const [report, setReport] = useState(null);
  const [reportPhase, setReportPhase] = useState(consent ? 'idle' : 'loading');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!preview) return;
    const controller = new AbortController();
    setReport(null);
    setReportPhase('loading');
    setError('');
    usageReport(api, version, diff, controller.signal)
      .then((value) => {
        setReport(value);
        setReportPhase('ready');
      })
      .catch((error) => {
        if (!controller.signal.aborted) {
          setError(error.message);
          setReportPhase('error');
        }
      });
    return () => controller.abort();
  }, [api, version, diff, preview]);
  async function decide(accepted) {
    setBusy(true);
    try {
      await decideUsage(session, maximum, accepted);
      onClose();
    } catch (error) {
      setError(error.message);
    } finally {
      setBusy(false);
    }
  }
  function showPreview() {
    setReportPhase('loading');
    setPreview(true);
  }
  function reportOutput() {
    switch (reportPhase) {
      case 'ready':
        return <pre class="share-text">{JSON.stringify(report, null, 2)}</pre>;
      case 'loading':
        return <p role="status">{t('Loading data...')}</p>;
      case 'idle':
      case 'error':
        return null;
      default:
        throw new Error(`Unknown usage report phase: ${reportPhase}`);
    }
  }
  return (
    <Dialog
      title={
        consent
          ? 'Allow Anonymous Usage Reporting?'
          : 'Anonymous Usage Reporting'
      }
      large
      status="info"
      icon="chart"
      onClose={onClose}
      onCancel={() => {
        if (!consent && !busy) onClose();
      }}
      footer={
        consent ? (
          <>
            <button
              class="btn btn-success"
              disabled={busy}
              onClick={() => decide(true)}
            >
              {t('Yes')}
            </button>
            <button
              class="btn btn-danger"
              disabled={busy}
              onClick={() => decide(false)}
            >
              {t('No')}
            </button>
          </>
        ) : (
          <button class="btn btn-default" onClick={onClose}>
            {t('Close')}
          </button>
        )
      }
    >
      {consent && state.config.options.urAccepted > 0 ? (
        <p>
          {t(
            'Anonymous usage report format has changed. Would you like to move to the new format?',
          )}
        </p>
      ) : (
        <>
          <p>
            {t(
              'The encrypted usage report is sent daily. It is used to track common platforms, folder sizes, and app versions. If the reported data set is changed you will be prompted with this dialog again.',
            )}
          </p>
          <p>
            {t(
              'The aggregated statistics are publicly available at the URL below.',
            )}{' '}
            <a
              href="https://data.syncthing.net/"
              target="_blank"
              rel="noreferrer"
            >
              data.syncthing.net
            </a>
          </p>
        </>
      )}
      {!preview ? (
        <button class="btn btn-default" onClick={showPreview}>
          {t('Preview Usage Report')}
        </button>
      ) : (
        <>
          {!consent && (
            <>
              <label for="report-version">{t('Version')}</label>
              <select
                id="report-version"
                class="form-control"
                value={version}
                onChange={(event) =>
                  setVersion(Number(event.currentTarget.value))
                }
              >
                {Array.from({ length: maximum - 1 }, (_, i) => maximum - i).map(
                  (value) => (
                    <option key={value} value={value}>
                      {t('Version')} {value}
                    </option>
                  ),
                )}
              </select>
              {version > 2 && (
                <label>
                  <input
                    type="checkbox"
                    checked={diff}
                    onChange={(event) => setDiff(event.currentTarget.checked)}
                  />{' '}
                  {t('Show diff with previous version')}
                </label>
              )}
            </>
          )}
          {reportOutput()}
        </>
      )}
      {error && (
        <p class="text-danger" role="alert">
          {error}
        </p>
      )}
    </Dialog>
  );
}

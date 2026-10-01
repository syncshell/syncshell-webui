import { useContext, useEffect, useState } from 'preact/hooks';
import { Dialog } from '../../Dialog.jsx';
import { LocaleContext } from '../../core/locale/LocaleContext.jsx';
import { servicePresentation } from './servicePresentation.mjs';

export function ServiceDialog({ kind, state, session, onClose }) {
  const { t } = useContext(LocaleContext);
  const [started] = useState(state.system.startTime);
  const [phase, setPhase] = useState('confirm');
  const [error, setError] = useState('');
  const major = state.upgradeInfo?.majorNewer;
  const presentation = servicePresentation(kind, phase, error, major);
  useEffect(() => {
    if (kind !== 'upgrade') apply();
  }, []);
  useEffect(() => {
    if (
      phase !== 'confirm' &&
      started &&
      state.online &&
      state.system.startTime !== started
    )
      onClose();
  }, [phase, started, state.online, state.system.startTime]);
  async function apply() {
    setPhase('working');
    setError('');
    try {
      await session.systemAction(kind);
      setPhase('waiting');
      if (
        kind !== 'shutdown' &&
        state.config.gui.useTLS !== (location.protocol === 'https:')
      )
        location.protocol = state.config.gui.useTLS ? 'https:' : 'http:';
    } catch (error) {
      setError(error.message);
    }
  }
  function renderFooter() {
    if (error)
      return (
        <button class="btn btn-default" onClick={onClose}>
          {t('Close')}
        </button>
      );
    if (phase === 'confirm')
      return (
        <>
          <button class="btn btn-primary" onClick={apply}>
            {t('Upgrade')}
          </button>
          <button class="btn btn-default" onClick={onClose}>
            {t('Close')}
          </button>
        </>
      );
    return <></>;
  }
  function renderBody() {
    if (error) return <p role="alert">{error}</p>;
    if (phase === 'confirm')
      return (
        <>
          {major ? (
            <p>
              {t('This is a major version upgrade.')}{' '}
              {t(
                'A new major version may not be compatible with previous versions.',
              )}{' '}
              {t(
                'Please consult the release notes before performing a major upgrade.',
              )}
            </p>
          ) : (
            <p>{t('Are you sure you want to upgrade?')}</p>
          )}
          <p>
            <a
              href={
                'https://github.com/syncthing/syncthing/releases/tag/' +
                encodeURIComponent(state.upgradeInfo?.latest || '')
              }
              target="_blank"
              rel="noreferrer"
            >
              {t('Release Notes')}
            </a>
          </p>
        </>
      );
    if (kind === 'shutdown')
      return (
        <p role="status">
          {t(
            phase === 'working'
              ? 'Please wait'
              : 'Syncthing has been shut down.',
          )}
        </p>
      );
    return (
      <p role="status">
        {t('Syncthing is restarting.')} {t('Please wait')}...
      </p>
    );
  }
  return (
    <Dialog
      title={presentation.title}
      status={presentation.status}
      icon={presentation.icon}
      onClose={onClose}
      onCancel={() => {
        if (phase === 'confirm' || error) onClose();
      }}
      footer={renderFooter()}
    >
      {renderBody()}
    </Dialog>
  );
}

import { useContext, useEffect, useState } from 'preact/hooks';
import { Dialog } from '../../Dialog.jsx';
import { LocaleContext } from '../../core/locale/LocaleContext.jsx';
import { Tabs } from '../../Tabs.jsx';
import { AuthorsPanel, PathsPanel, SoftwarePanel } from './AboutPanels.jsx';

export function About({ api, version, onClose }) {
  const { t } = useContext(LocaleContext);
  const [tab, setTab] = useState('Authors');
  const [paths, setPaths] = useState({});
  const [error, setError] = useState('');
  const tabItems = ['Authors', 'Included Software', 'Paths'].map((name) => ({
    id: name,
    tabId: 'about-' + name.toLowerCase().replaceAll(' ', '-') + '-tab',
    panelId: 'about-panel',
    label: t(name),
  }));
  useEffect(() => {
    const controller = new AbortController();
    if (window.metadata?.authenticated)
      api
        .get('system/paths', { signal: controller.signal })
        .then(setPaths)
        .catch((error) => {
          if (!controller.signal.aborted) setError(error.message);
        });
    return () => controller.abort();
  }, [api]);
  const panels = {
    Authors: <AuthorsPanel />,
    'Included Software': <SoftwarePanel />,
    Paths: <PathsPanel paths={paths} />,
  };
  return (
    <Dialog title="About" large status="info" icon="heart" onClose={onClose}>
      <h2 class="text-center">
        <a
          href="https://github.com/syncshell/syncshell-webui"
          target="_blank"
          rel="noreferrer"
        >
          Syncshell
        </a>
      </h2>
      <p class="text-center">
        A focused Syncthing web interface for Syncshell.
      </p>
      <p class="text-center">
        Syncthing {version.version || ''} {version.codename || ''}
      </p>
      {version.date && (
        <p class="text-center">
          Build {version.date.slice(0, 10)}{' '}
          {Array.isArray(version.tags) ? version.tags.join(', ') : ''}
        </p>
      )}
      {!version.version && (
        <p class="text-center">{t('Log in to see version information.')}</p>
      )}
      <p class="text-center">
        {t('Syncthing is Free and Open Source Software licensed as MPL v2.0.')}{' '}
        <a href="LICENSE.syncthing">MPL 2.0</a>
      </p>
      <Tabs activeId={tab} items={tabItems} onSelect={setTab} />
      <div
        id="about-panel"
        role="tabpanel"
        aria-labelledby={
          'about-' + tab.toLowerCase().replaceAll(' ', '-') + '-tab'
        }
      >
        {error && (
          <p class="text-danger" role="alert">
            {error}
          </p>
        )}
        {panels[tab]}
      </div>
    </Dialog>
  );
}

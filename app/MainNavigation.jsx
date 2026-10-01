import syncshellMark from '../assets/status-default.svg?url';
import { useContext } from 'preact/hooks';
import { Icon } from './Icon.jsx';
import { LocaleContext } from './locale-context.jsx';

const helpLinks = [
  ['Introduction', 'https://github.com/syncshell/syncshell-webui#readme'],
  ['Home page', 'https://github.com/syncshell/syncshell-webui'],
  ['Documentation', 'https://docs.syncthing.net/'],
  ['Support', 'https://github.com/syncshell/syncshell-webui/issues'],
  ['Changelog', 'https://github.com/syncshell/syncshell-webui/releases'],
  ['Statistics', 'https://data.syncthing.net/'],
  ['Bugs', 'https://github.com/syncshell/syncshell-webui/issues'],
  ['Source Code', 'https://github.com/syncshell/syncshell-webui'],
].map(([label, url]) => ({ label, url }));

export function MainNavigation({
  api,
  authenticated,
  config,
  menu,
  name,
  onAction,
  onMenuChange,
  self,
  upgradeInfo,
}) {
  const { t } = useContext(LocaleContext);
  function open(event, action) {
    event.preventDefault();
    onAction(action);
  }

  return (
    <nav class="navbar navbar-top navbar-default" aria-label="Main">
      <div class="container">
        <span class="navbar-brand syncshell-brand">
          <span
            class="syncshell-mark"
            aria-hidden="true"
            style={{ '--syncshell-mark': `url("${syncshellMark}")` }}
          />
          <span class="text-success">Syncshell</span>
        </span>
        {authenticated && <p class="navbar-text hidden-xs">{name}</p>}
        <ul class="nav navbar-nav navbar-right">
          <li class={`dropdown action-menu ${menu === 'help' ? 'open' : ''}`}>
            <a
              href="#help"
              class="dropdown-toggle"
              aria-expanded={menu === 'help'}
              onClick={(event) => {
                event.preventDefault();
                onMenuChange(menu === 'help' ? '' : 'help');
              }}
            >
              <Icon name="help" /> {t('Help')} <span class="caret" />
            </a>
            <ul class="dropdown-menu">
              {helpLinks.map(({ label, url }) => (
                <li key={label}>
                  <a href={url} target="_blank" rel="noreferrer">
                    {t(label)}
                  </a>
                </li>
              ))}
              <li>
                <a
                  href="#about"
                  onClick={(event) => open(event, { type: 'about' })}
                >
                  {t('About')}
                </a>
              </li>
            </ul>
          </li>
          {authenticated && (
            <li
              class={`dropdown action-menu ${menu === 'actions' ? 'open' : ''}`}
            >
              <a
                href="#actions"
                class="dropdown-toggle"
                aria-expanded={menu === 'actions'}
                onClick={(event) => {
                  event.preventDefault();
                  onMenuChange(menu === 'actions' ? '' : 'actions');
                }}
              >
                <Icon name="settings" /> {t('Actions')} <span class="caret" />
              </a>
              <ul class="dropdown-menu">
                <li>
                  <a
                    href="#settings"
                    onClick={(event) => open(event, { type: 'settings' })}
                  >
                    {t('Settings')}
                  </a>
                </li>
                <li>
                  <a
                    href="#advanced"
                    onClick={(event) => open(event, { type: 'advanced' })}
                  >
                    {t('Advanced')}
                  </a>
                </li>
                <li>
                  <a
                    href="#identification"
                    onClick={(event) =>
                      open(event, { type: 'identification', device: self })
                    }
                  >
                    {t('Show ID')}
                  </a>
                </li>
                <li>
                  <a
                    href="#logs"
                    onClick={(event) => open(event, { type: 'logs' })}
                  >
                    {t('Logs')}
                  </a>
                </li>
                {(upgradeInfo?.newer || upgradeInfo?.majorNewer) && (
                  <li>
                    <a
                      href="#upgrade"
                      onClick={(event) => open(event, { type: 'upgrade' })}
                    >
                      {t('Upgrade')} {upgradeInfo.latest}
                    </a>
                  </li>
                )}
                <li>
                  <a href="rest/debug/support" target="_blank">
                    {t('Support Bundle')}
                  </a>
                </li>
                {(config.gui?.user || config.gui?.authMode === 'ldap') && (
                  <li>
                    <a
                      href="#logout"
                      onClick={async (event) => {
                        event.preventDefault();
                        await api.post('noauth/auth/logout', {});
                        location.reload();
                      }}
                    >
                      {t('Log Out')}
                    </a>
                  </li>
                )}
                <li>
                  <a
                    href="#restart"
                    onClick={(event) => open(event, { type: 'restart' })}
                  >
                    {t('Restart')}
                  </a>
                </li>
                <li>
                  <a
                    href="#shutdown"
                    onClick={(event) => open(event, { type: 'shutdown' })}
                  >
                    {t('Shut Down')}
                  </a>
                </li>
              </ul>
            </li>
          )}
        </ul>
      </div>
    </nav>
  );
}

import { useContext } from 'preact/hooks';
import { Icon } from './Icon.jsx';
import { LocaleContext } from './locale-context.jsx';

const tabs = [
  { id: 'overview', label: 'Overview' },
  { id: 'conflicts', label: 'Resolve sync conflicts' },
  { id: 'notifications', label: 'Notifications' },
];

export function DashboardTabs({ activeTab, onSelect }) {
  const { t } = useContext(LocaleContext);

  function handleKeyDown(event) {
    let index = tabs.findIndex((tab) => tab.id === activeTab);
    if (event.key === 'ArrowRight') index = (index + 1) % tabs.length;
    else if (event.key === 'ArrowLeft')
      index = (index + tabs.length - 1) % tabs.length;
    else if (event.key === 'Home') index = 0;
    else if (event.key === 'End') index = tabs.length - 1;
    else return;
    event.preventDefault();
    onSelect(tabs[index].id);
    event.currentTarget.querySelectorAll('[role="tab"]')[index].focus();
  }

  return (
    <ul
      class="nav nav-tabs dashboard-tabs"
      role="tablist"
      onKeyDown={handleKeyDown}
    >
      {tabs.map(({ id, label }) => (
        <li
          key={id}
          class={id === activeTab ? 'active' : ''}
          role="presentation"
        >
          <a
            id={id + '-tab'}
            href={'#dashboard-' + id}
            role="tab"
            aria-controls={'dashboard-' + id}
            aria-selected={id === activeTab}
            tabIndex={id === activeTab ? 0 : -1}
            onClick={(event) => {
              event.preventDefault();
              onSelect(id);
            }}
          >
            {t(label)}
            {id === 'conflicts' ? ' (beta)' : ''}
            {id === 'notifications' && (
              <span class="notification-indicator">
                <Icon
                  name="dot"
                  class="text-success"
                  role="img"
                  aria-label={t('Pending notifications')}
                />
                <Icon
                  name="dot"
                  class="text-warning"
                  role="img"
                  aria-label={t('Pending warnings')}
                />
                <Icon
                  name="dot"
                  class="text-danger"
                  role="img"
                  aria-label={t('Pending errors')}
                />
              </span>
            )}
          </a>
        </li>
      ))}
    </ul>
  );
}

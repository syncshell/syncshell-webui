import { useContext } from 'preact/hooks';
import { Icon } from './Icon.jsx';
import { LocaleContext } from './core/locale/LocaleContext.jsx';
import { Tabs } from './Tabs.jsx';

const dashboardTabs = [
  { id: 'overview', label: 'Overview' },
  { id: 'conflicts', label: 'Resolve sync conflicts' },
  { id: 'notifications', label: 'Notifications' },
];

export function DashboardTabs({ activeTab, onSelect }) {
  const { t } = useContext(LocaleContext);
  const items = dashboardTabs.map(({ id, label }) => ({
    id,
    tabId: id + '-tab',
    panelId: 'dashboard-' + id,
    label: (
      <>
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
      </>
    ),
  }));
  return (
    <Tabs
      activeId={activeTab}
      className="dashboard-tabs"
      items={items}
      onSelect={onSelect}
    />
  );
}

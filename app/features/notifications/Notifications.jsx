import { runReportedSessionAction } from '../../core/session/createSession.mjs';
import { useLocale } from '../../core/locale/LocaleContext.jsx';
import { NotificationCard } from './NotificationCard.jsx';
import { noticeAction } from './notices.mjs';
import './Notifications.css';

export function Notifications({ cards, session, onAction }) {
  const { t } = useLocale();
  const handleAction = (card, action) =>
    runReportedSessionAction(
      () => noticeAction(session, card, action, onAction),
      session.reportError,
    );
  return (
    <>
      <h3>{t('Notifications')}</h3>
      {!cards.length && (
        <p class="notifications-empty">{t('No pending notifications.')}</p>
      )}
      <div class="notification-grid">
        {cards.map((card) => (
          <NotificationCard key={card.id} card={card} onAction={handleAction} />
        ))}
      </div>
    </>
  );
}

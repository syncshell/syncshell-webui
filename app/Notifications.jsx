import { useContext } from 'preact/hooks';
import { LocaleContext } from './locale-context.jsx';
import { noticeAction } from '../client/notices.mjs';
import { runReportedSessionAction } from '../client/session.mjs';
import { NotificationCard } from './NotificationCard.jsx';

export function Notifications({ cards, session, onAction }) {
  const { t } = useContext(LocaleContext);
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

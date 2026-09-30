import { useContext } from 'preact/hooks';
import { LocaleContext } from './locale-context.jsx';
import { noticeAction } from '../client/notices.mjs';
import { timestamp } from '../client/format.mjs';
import { Identicon } from './Identicon.jsx';
import { Icon } from './Icon.jsx';

const color = (action) =>
  ['Ignore', 'Disable Crash Reporting'].includes(action)
    ? 'danger'
    : action === 'Yes'
      ? 'primary'
      : ['Add Device', 'Add', 'Share', 'Enable Crash Reporting'].includes(
            action,
          )
        ? 'success'
        : 'default';
const icon = (action) =>
  ({
    Settings: 'settings',
    Restart: 'refresh',
    'Add Device': 'plus',
    Ignore: 'x',
    Dismiss: 'clock',
    No: 'x',
    'Disable Crash Reporting': 'x',
  })[action] || 'check';

export function Notifications({ cards, session, onAction }) {
  const { t } = useContext(LocaleContext);
  return (
    <>
      <h3>{t('Notifications')}</h3>
      {!cards.length && (
        <p class="notifications-empty">{t('No pending notifications.')}</p>
      )}
      <div class="notification-grid">
        {cards.map((card) => (
          <div class={`panel panel-${card.severity}`} key={card.id}>
            <div class="panel-heading">
              <h3 class="panel-title">
                {card.kind === 'device' ? (
                  <Identicon id={card.device} />
                ) : (
                  <span class="panel-icon">
                    <Icon
                      name={
                        card.kind === 'folder'
                          ? 'folder'
                          : card.severity === 'success'
                            ? 'zap'
                            : 'circle-alert'
                      }
                    />
                  </span>
                )}
                <span class="notification-title-text">{t(card.title)}</span>
                {card.time && (
                  <time class="notification-time" dateTime={card.time}>
                    {timestamp(card.time)}
                  </time>
                )}
              </h3>
            </div>
            <div class="panel-body">
              {(card.paragraphs || []).map((paragraph, index) => (
                <p key={index}>{t(paragraph, card.params)}</p>
              ))}
              {(card.errors || []).map((error, index) => (
                <p key={index}>
                  <small>{timestamp(error.when)}:</small> {error.message}
                </p>
              ))}
              {card.watchers && (
                <table>
                  <tbody>
                    {card.watchers.map((watcher) => (
                      <tr key={watcher.name}>
                        <td>{watcher.name}: </td>
                        <td>{watcher.error}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {card.link && (
                <p>
                  <a href={card.link} target="_blank" rel="noreferrer">
                    <Icon name="info" />
                    &nbsp;
                    {t(card.id === 'watchers' ? 'Support' : 'Learn more')}
                  </a>
                </p>
              )}
            </div>
            {card.actions?.length > 0 && (
              <div class="panel-footer clearfix">
                {card.actions.map((action) => (
                  <button
                    key={action}
                    class={`btn btn-sm btn-${color(action)}`}
                    onClick={() =>
                      noticeAction(session, card, action, onAction).catch(
                        () => {},
                      )
                    }
                  >
                    <Icon name={icon(action)} />
                    &nbsp;{t(action)}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}

import { useContext } from 'preact/hooks';
import { timestamp } from '../client/format.mjs';
import { DeviceIdenticon } from './features/devices/DeviceIdenticon.jsx';
import { Icon } from './Icon.jsx';
import { LocaleContext } from './locale-context.jsx';

const defaultActionPresentation = { tone: 'default', icon: 'check' };
const actionPresentations = {
  Settings: { tone: 'default', icon: 'settings' },
  Restart: { tone: 'default', icon: 'refresh' },
  'Add Device': { tone: 'success', icon: 'plus' },
  Add: { tone: 'success', icon: 'check' },
  Share: { tone: 'success', icon: 'check' },
  'Enable Crash Reporting': { tone: 'success', icon: 'check' },
  Ignore: { tone: 'danger', icon: 'x' },
  'Disable Crash Reporting': { tone: 'danger', icon: 'x' },
  Yes: { tone: 'primary', icon: 'check' },
  Dismiss: { tone: 'default', icon: 'clock' },
  No: { tone: 'default', icon: 'x' },
};

export function NotificationCard({ card, onAction }) {
  const { t } = useContext(LocaleContext);
  return (
    <div class={`panel panel-${card.severity}`}>
      <div class="panel-heading">
        <h3 class="panel-title">
          {card.kind === 'device' ? (
            <DeviceIdenticon id={card.device} />
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
          {card.actions.map((action) => {
            const presentation =
              actionPresentations[action] || defaultActionPresentation;
            return (
              <button
                key={action}
                class={`btn btn-sm btn-${presentation.tone}`}
                onClick={() => onAction(card, action)}
              >
                <Icon name={presentation.icon} />
                &nbsp;{t(action)}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

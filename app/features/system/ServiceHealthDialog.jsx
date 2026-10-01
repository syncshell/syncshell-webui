import { useContext } from 'preact/hooks';
import { Dialog } from '../../ui/Dialog.jsx';
import { LocaleContext } from '../../core/locale/LocaleContext.jsx';
import { serviceHealth } from './serviceHealth.mjs';

export function ServiceHealthDialog({ kind, state, onClose }) {
  const { t } = useContext(LocaleContext);
  const health = serviceHealth(
    kind === 'listeners'
      ? state.system.connectionServiceStatus
      : state.system.discoveryStatus,
  );
  const isListeners = kind === 'listeners';
  return (
    <Dialog
      title={
        isListeners
          ? health.failed.length
            ? 'Listener Failures'
            : 'Listener Status'
          : health.failed.length
            ? 'Discovery Failures'
            : 'Discovery Status'
      }
      status={health.failed.length ? 'danger' : 'default'}
      icon="network"
      onClose={onClose}
    >
      {isListeners ? (
        <p>
          {t(
            health.running
              ? 'Syncthing is listening on the following network addresses for connection attempts from other devices:'
              : 'Syncthing is not listening for connection attempts from other devices on any address.  Only outgoing connections from this device may work.',
          )}
        </p>
      ) : (
        <>
          <p>
            {t(
              health.running
                ? 'The following methods are used to discover other devices on the network and announce this device to be found by others:'
                : 'This device cannot automatically discover other devices or announce its own address to be found by others.  Only devices with statically configured addresses can connect.',
            )}
          </p>
          <p>
            {t(
              'Failure to connect to IPv6 servers is expected if there is no IPv6 connectivity.',
            )}
          </p>
        </>
      )}
      {health.entries.map(([name, value]) => (
        <section key={name}>
          <h5>{name}</h5>
          <dl>
            {Object.entries(value || {}).map(([key, item]) => (
              <div key={key}>
                <dt>{key}</dt>
                <dd class={key === 'error' ? 'text-danger' : ''}>
                  {Array.isArray(item)
                    ? item.join(', ')
                    : typeof item === 'object'
                      ? JSON.stringify(item)
                      : item}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
    </Dialog>
  );
}

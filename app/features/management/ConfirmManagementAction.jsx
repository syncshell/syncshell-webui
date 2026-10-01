import { useState } from 'preact/hooks';
import { Dialog } from '../../ui/Dialog.jsx';
import { useLocale } from '../../core/locale/LocaleContext.jsx';
import { managementActions, performManagement } from './management.mjs';

export function ConfirmManagementAction({
  action,
  api,
  session,
  onClose,
  onDone,
  devices = [],
}) {
  const { t } = useLocale();
  const definition = managementActions[action.type];
  const name =
    action.folder?.label ||
    action.folder?.id ||
    action.device?.name ||
    action.device?.deviceID;
  const introducer = devices.find(
    (device) =>
      device.deviceID === action.device?.introducedBy && device.introducer,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function handleConfirm() {
    setBusy(true);
    setError('');
    try {
      await performManagement(action, session, api);
      onDone();
    } catch (error) {
      setError(error.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog
      title={definition.title}
      status="warning"
      icon="help"
      onClose={onClose}
      onCancel={() => {
        if (!busy) onClose();
      }}
      footer={
        <>
          <button
            class="btn btn-warning"
            disabled={busy}
            onClick={handleConfirm}
          >
            {t(definition.button)}
          </button>
          <button class="btn btn-default" disabled={busy} onClick={onClose}>
            {t('Cancel')}
          </button>
        </>
      }
    >
      <p>
        {t(definition.description)
          .replace('{%label%}', name)
          .replace('{%name%}', name)}
      </p>
      {definition.detail && <p>{t(definition.detail)}</p>}
      {introducer && (
        <p>
          {t('{%reintroducer%} might reintroduce this device.').replace(
            '{%reintroducer%}',
            introducer.name || introducer.deviceID,
          )}
        </p>
      )}
      {error && (
        <p class="text-danger" role="alert">
          {error}
        </p>
      )}
    </Dialog>
  );
}

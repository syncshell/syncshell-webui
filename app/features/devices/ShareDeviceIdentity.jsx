import { useContext, useState } from 'preact/hooks';
import {
  createEmailShare,
  createTextMessageShare,
} from '../../../client/identity.mjs';
import { Dialog } from '../../Dialog.jsx';
import { Icon } from '../../Icon.jsx';
import { LocaleContext } from '../../core/locale/LocaleContext.jsx';

const shareBuilders = {
  email: createEmailShare,
  sms: createTextMessageShare,
};

export function ShareDeviceIdentity({ device, api }) {
  const { t } = useContext(LocaleContext);
  const [method, setMethod] = useState('');
  const [validated, setValidated] = useState(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const message = validated
    ? shareBuilders[method]?.(validated, t) || null
    : null;
  async function runIdentityAction(action) {
    setError('');
    try {
      const result = await api.get('svc/deviceid', {
        query: { id: device.deviceID },
      });
      if (result.error) throw new Error(result.error);
      const value = { ...device, deviceID: result.id };
      setValidated(value);
      await action(value);
    } catch (error) {
      setError(error.message);
    }
  }
  function copyDeviceId() {
    return runIdentityAction(async (value) => {
      await navigator.clipboard.writeText(value.deviceID);
      setCopied(true);
    });
  }
  function shareDeviceId(method) {
    return runIdentityAction(() => setMethod(method));
  }
  async function copyMessageText(text) {
    try {
      await navigator.clipboard.writeText(text);
    } catch (error) {
      setError(error.message);
    }
  }
  return (
    <>
      <div class="folder-actions">
        <button
          type="button"
          class="btn btn-default"
          disabled={!device.deviceID}
          onClick={copyDeviceId}
        >
          <Icon name="copy" /> {t(copied ? 'Copied!' : 'Copy')}
        </button>
        <button
          type="button"
          class="btn btn-default"
          disabled={!device.deviceID}
          onClick={() => shareDeviceId('email')}
        >
          <Icon name="mail" /> {t('Share by Email')}
        </button>
        <button
          type="button"
          class="btn btn-default"
          disabled={!device.deviceID}
          onClick={() => shareDeviceId('sms')}
        >
          <Icon name="message" /> {t('Share by SMS')}
        </button>
      </div>
      {error && (
        <p class="text-danger" role="alert">
          {error}
        </p>
      )}
      {method && message && (
        <Dialog
          title={method === 'email' ? 'Share by Email' : 'Share by SMS'}
          large={method === 'email'}
          icon={method === 'email' ? 'mail' : 'message'}
          onClose={() => setMethod('')}
          footer={
            <>
              <a class="btn btn-primary" href={message.href}>
                {t('Share')}
              </a>
              <button class="btn btn-default" onClick={() => setMethod('')}>
                {t('Cancel')}
              </button>
            </>
          }
        >
          <p>
            {t(
              'The following text will automatically be inserted into a new message.',
            )}{' '}
            {t(
              method === 'email'
                ? 'Your email app should open to let you choose the recipient and send it from your own address.'
                : 'Your SMS app should open to let you choose the recipient and send it from your own number.',
            )}{' '}
            {t(
              'You can also copy and paste the text into a new message manually.',
            )}
          </p>
          {method === 'email' && (
            <>
              <h5>{t('Subject:')}</h5>
              <pre class="share-text">{message.subject}</pre>
              <button
                class="btn btn-default btn-sm"
                onClick={() => copyMessageText(message.subject)}
              >
                {t('Copy')}
              </button>
              <h5>{t('Body:')}</h5>
            </>
          )}
          <pre class="share-text">{message.body}</pre>
          <button
            class="btn btn-default btn-sm"
            onClick={() => copyMessageText(message.body)}
          >
            {t('Copy')}
          </button>
        </Dialog>
      )}
    </>
  );
}

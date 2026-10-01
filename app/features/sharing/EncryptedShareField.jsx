import { useState } from 'preact/hooks';
import { Icon } from '../../ui/Icon.jsx';
import { useLocale } from '../../core/locale/LocaleContext.jsx';
import { ShareStatus } from './ShareStatus.jsx';

function passwordPlaceholder({ isEncrypted, isSelected, isPasswordRequired }) {
  if (isEncrypted) return 'Received data is already encrypted';
  if (!isSelected) return 'Not shared';
  if (isPasswordRequired) {
    return 'Device is untrusted, enter encryption password';
  }
  return 'If untrusted, enter encryption password';
}

export function EncryptedShareField({
  label,
  id,
  isSelected,
  password = '',
  isEncrypted = false,
  isPasswordRequired = false,
  remoteState = '',
  onSelected,
  onPassword,
}) {
  const { t } = useLocale();
  const [plain, setPlain] = useState(false);
  return (
    <div class="form-group">
      <label title={id}>
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(event) => onSelected(event.currentTarget.checked)}
        />{' '}
        {label}
      </label>
      <ShareStatus remoteState={remoteState} />
      <div class="input-group">
        <span class="input-group-addon">
          <Icon name={isEncrypted || password ? 'lock' : 'unlock'} />
        </span>
        <input
          class="form-control"
          type={plain ? 'text' : 'password'}
          aria-label={t('Encryption Password') + ': ' + label}
          autoComplete="off"
          value={password}
          disabled={isEncrypted || !isSelected}
          required={isSelected && !isEncrypted && isPasswordRequired}
          placeholder={t(
            passwordPlaceholder({
              isEncrypted,
              isSelected,
              isPasswordRequired,
            }),
          )}
          onInput={(event) => onPassword(event.currentTarget.value)}
        />
        <span class="input-group-btn">
          <button
            type="button"
            class="btn btn-default"
            disabled={isEncrypted || !isSelected}
            aria-label={t(plain ? 'Hide password' : 'Show password')}
            onClick={() => setPlain(!plain)}
          >
            <Icon name={plain ? 'eye-off' : 'eye'} />
          </button>
        </span>
      </div>
    </div>
  );
}

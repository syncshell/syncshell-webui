import { useContext } from 'preact/hooks';
import { LocaleContext } from '../core/locale/LocaleContext.jsx';
import { getValue } from '../core/config/configValues.mjs';
import { Tooltip } from '../Tooltip.jsx';
import { changedValue, inputValue } from './formValues.mjs';

export function EditorField({
  field,
  draft,
  help,
  hasError,
  isNew,
  defaults,
  onChange,
}) {
  const { t } = useContext(LocaleContext);
  const descriptions = [];
  if (help) descriptions.push('editor-' + field.path + '-help');
  if (hasError) descriptions.push('editor-error');
  const describedBy = descriptions.join(' ') || undefined;

  return (
    <>
      {field.type === 'checkbox' ? (
        <label>
          <input
            type="checkbox"
            checked={field.checked ?? !!getValue(draft, field.path)}
            disabled={field.disabled}
            aria-describedby={describedBy}
            onChange={(event) =>
              onChange(changedValue(field, event.currentTarget))
            }
          />{' '}
          {t(field.label)}
        </label>
      ) : (
        <>
          <label for={'editor-' + field.path}>{t(field.label)}</label>
          {help && <Tooltip icon="info" label={field.label} text={help.help} />}
          {field.type === 'select' ? (
            <select
              id={'editor-' + field.path}
              class="form-control"
              value={inputValue(draft, field)}
              disabled={field.disabled}
              aria-describedby={describedBy}
              onChange={(event) => onChange(event.currentTarget.value)}
            >
              {field.options.map(({ value, label }) => (
                <option key={value} value={value}>
                  {t(label)}
                </option>
              ))}
            </select>
          ) : (
            <input
              id={'editor-' + field.path}
              class="form-control"
              type={field.type === 'list' ? 'text' : field.type}
              value={inputValue(draft, field)}
              disabled={field.disabled}
              aria-describedby={describedBy}
              list={
                field.path === 'path'
                  ? 'directory-list'
                  : field.path === 'group'
                    ? 'editor-groups'
                    : undefined
              }
              readOnly={
                !isNew &&
                !defaults &&
                ['id', 'path', 'deviceID'].includes(field.path)
              }
              required={
                !defaults && ['id', 'path', 'deviceID'].includes(field.path)
              }
              step={field.path.endsWith('.value') ? '0.01' : undefined}
              min={field.type === 'number' ? 0 : undefined}
              onInput={(event) =>
                onChange(changedValue(field, event.currentTarget))
              }
            />
          )}
        </>
      )}
      {field.type === 'checkbox' && help && (
        <Tooltip icon="info" label={field.label} text={help.help} />
      )}
      {help && (
        <span id={'editor-' + field.path + '-help'} class="sr-only">
          {t(help.help)}
        </span>
      )}
    </>
  );
}

import { useLocale } from '../core/locale/LocaleContext.jsx';
import { getValue } from '../core/config/configValues.mjs';
import { Tooltip } from './Tooltip.jsx';
import { changedValue, inputValue } from './formValues.mjs';
import {
  CheckboxFormControl,
  NumberFormControl,
  SelectFormControl,
  TextFormControl,
} from './FormControls.jsx';

export function EditorField({
  field,
  draft,
  help,
  hasError,
  isNew,
  defaults,
  onChange,
}) {
  const { t } = useLocale();
  const descriptions = [];
  if (help) descriptions.push('editor-' + field.path + '-help');
  if (hasError) descriptions.push('editor-error');
  const describedBy = descriptions.join(' ') || undefined;
  const id = 'editor-' + field.path;
  const labelSuffix = help && (
    <Tooltip icon="info" label={field.label} text={help.help} />
  );

  function control() {
    switch (field.type) {
      case 'checkbox':
        return (
          <>
            <CheckboxFormControl
              id={id}
              label={field.label}
              checked={field.checked ?? !!getValue(draft, field.path)}
              describedBy={describedBy}
              disabled={field.disabled}
              onChange={(event) =>
                onChange(changedValue(field, event.currentTarget))
              }
            />
            {labelSuffix}
          </>
        );
      case 'select':
        return (
          <SelectFormControl
            id={id}
            label={field.label}
            value={inputValue(draft, field)}
            options={field.options}
            describedBy={describedBy}
            disabled={field.disabled}
            labelSuffix={labelSuffix}
            onChange={(event) => onChange(event.currentTarget.value)}
          />
        );
      case 'number':
        return (
          <NumberFormControl
            id={id}
            label={field.label}
            value={inputValue(draft, field)}
            min={0}
            required={
              !defaults && ['id', 'path', 'deviceID'].includes(field.path)
            }
            describedBy={describedBy}
            disabled={field.disabled}
            labelSuffix={labelSuffix}
            step={field.path.endsWith('.value') ? '0.01' : '1'}
            onInput={(event) =>
              onChange(changedValue(field, event.currentTarget))
            }
          />
        );
      default:
        return (
          <TextFormControl
            id={id}
            label={field.label}
            type={field.type === 'list' ? 'text' : field.type}
            value={inputValue(draft, field)}
            required={
              !defaults && ['id', 'path', 'deviceID'].includes(field.path)
            }
            describedBy={describedBy}
            disabled={field.disabled}
            labelSuffix={labelSuffix}
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
            onInput={(event) =>
              onChange(changedValue(field, event.currentTarget))
            }
          />
        );
    }
  }

  return (
    <>
      {control()}
      {help && (
        <span id={'editor-' + field.path + '-help'} class="sr-only">
          {t(help.help)}
        </span>
      )}
    </>
  );
}

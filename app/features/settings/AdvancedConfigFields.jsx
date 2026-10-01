import { getValue } from '../../core/config/configValues.mjs';
import { changedValue, inputValue } from '../../ui/formValues.mjs';
import {
  CheckboxFormControl,
  MultilineFormControl,
  NumberFormControl,
  SelectFormControl,
  TextFormControl,
} from '../../ui/FormControls.jsx';

function FormControl({ describedBy, draft, field, onChange }) {
  const id = 'config-' + field.path;
  switch (field.type) {
    case 'checkbox':
      return (
        <CheckboxFormControl
          id={id}
          label={field.label}
          checked={!!getValue(draft, field.path)}
          describedBy={describedBy}
          onChange={(event) =>
            onChange(field.path, event.currentTarget.checked)
          }
        />
      );
    case 'select':
      return (
        <SelectFormControl
          id={id}
          label={field.label}
          value={inputValue(draft, field)}
          options={field.options}
          describedBy={describedBy}
          onChange={(event) => onChange(field.path, event.currentTarget.value)}
        />
      );
    case 'lines':
      return (
        <MultilineFormControl
          id={id}
          label={field.label}
          value={(getValue(draft, field.path) || []).join('\n')}
          describedBy={describedBy}
          onInput={(event) =>
            onChange(field.path, event.currentTarget.value.split('\n'))
          }
        />
      );
    case 'number':
      return (
        <NumberFormControl
          id={id}
          label={field.label}
          min={field.min}
          required={field.required}
          describedBy={describedBy}
          value={inputValue(draft, field)}
          onInput={(event) =>
            onChange(field.path, changedValue(field, event.currentTarget))
          }
        />
      );
    default:
      return (
        <TextFormControl
          id={id}
          label={field.label}
          type={field.type === 'list' ? 'text' : field.type}
          required={field.required}
          describedBy={describedBy}
          value={inputValue(draft, field)}
          onInput={(event) =>
            onChange(field.path, changedValue(field, event.currentTarget))
          }
        />
      );
  }
}

export function AdvancedConfigFields({ describedBy, draft, fields, onChange }) {
  return fields.map((field) => (
    <div class="form-group" key={field.path}>
      <FormControl
        describedBy={describedBy}
        draft={draft}
        field={field}
        onChange={onChange}
      />
    </div>
  ));
}

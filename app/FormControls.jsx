import { useContext } from 'preact/hooks';
import { LocaleContext } from './locale-context.jsx';

export function CheckboxFormControl({ label, checked, onChange }) {
  const { t } = useContext(LocaleContext);
  return (
    <label>
      <input type="checkbox" checked={checked} onChange={onChange} /> {t(label)}
    </label>
  );
}

export function SelectFormControl({ id, label, value, options, onChange }) {
  const { t } = useContext(LocaleContext);
  return (
    <>
      <label for={id}>{t(label)}</label>
      <select id={id} class="form-control" value={value} onChange={onChange}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {t(option.label)}
          </option>
        ))}
      </select>
    </>
  );
}

export function MultilineFormControl({ id, label, value, onInput }) {
  const { t } = useContext(LocaleContext);
  return (
    <>
      <label for={id}>{t(label)}</label>
      <textarea
        id={id}
        class="form-control"
        rows="6"
        value={value}
        onInput={onInput}
      />
    </>
  );
}

export function NumberFormControl({
  id,
  label,
  value,
  min,
  required,
  onInput,
}) {
  const { t } = useContext(LocaleContext);
  return (
    <>
      <label for={id}>{t(label)}</label>
      <input
        id={id}
        class="form-control"
        type="number"
        step="any"
        min={min}
        required={required}
        value={value}
        onInput={onInput}
      />
    </>
  );
}

export function TextFormControl({
  id,
  label,
  type = 'text',
  value,
  required,
  onInput,
}) {
  const { t } = useContext(LocaleContext);
  return (
    <>
      <label for={id}>{t(label)}</label>
      <input
        id={id}
        class="form-control"
        type={type}
        required={required}
        value={value}
        onInput={onInput}
      />
    </>
  );
}

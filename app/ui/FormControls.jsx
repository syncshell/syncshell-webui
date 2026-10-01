import { useLocale } from '../core/locale/LocaleContext.jsx';

export function CheckboxFormControl({
  id,
  label,
  checked,
  describedBy,
  disabled,
  onChange,
}) {
  const { t } = useLocale();
  return (
    <label for={id}>
      <input
        id={id}
        type="checkbox"
        checked={checked}
        aria-describedby={describedBy}
        disabled={disabled}
        onChange={onChange}
      />{' '}
      {t(label)}
    </label>
  );
}

export function SelectFormControl({
  id,
  label,
  value,
  options,
  describedBy,
  disabled,
  labelSuffix,
  onChange,
}) {
  const { t } = useLocale();
  return (
    <>
      <label for={id}>{t(label)}</label>
      {labelSuffix}
      <select
        id={id}
        class="form-control"
        value={value}
        aria-describedby={describedBy}
        disabled={disabled}
        onChange={onChange}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {t(option.label)}
          </option>
        ))}
      </select>
    </>
  );
}

export function MultilineFormControl({
  id,
  label,
  value,
  describedBy,
  onInput,
}) {
  const { t } = useLocale();
  return (
    <>
      <label for={id}>{t(label)}</label>
      <textarea
        id={id}
        class="form-control"
        rows="6"
        value={value}
        aria-describedby={describedBy}
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
  describedBy,
  disabled,
  labelSuffix,
  step = 'any',
  onInput,
}) {
  const { t } = useLocale();
  return (
    <>
      <label for={id}>{t(label)}</label>
      {labelSuffix}
      <input
        id={id}
        class="form-control"
        type="number"
        step={step}
        min={min}
        required={required}
        value={value}
        aria-describedby={describedBy}
        disabled={disabled}
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
  describedBy,
  disabled,
  labelSuffix,
  list,
  readOnly,
  onInput,
}) {
  const { t } = useLocale();
  return (
    <>
      <label for={id}>{t(label)}</label>
      {labelSuffix}
      <input
        id={id}
        class="form-control"
        type={type}
        required={required}
        value={value}
        aria-describedby={describedBy}
        disabled={disabled}
        list={list}
        readOnly={readOnly}
        onInput={onInput}
      />
    </>
  );
}

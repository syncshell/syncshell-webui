import { getValue } from '../app/core/config/configValues.mjs';

export function inputValue(draft, field) {
  const value = getValue(draft, field.path);
  return field.type === 'list' ? (value || []).join(', ') : (value ?? '');
}
export function changedValue(field, input) {
  if (field.type === 'checkbox') return input.checked;
  if (field.type === 'number')
    return input.value === '' ? 0 : Number(input.value);
  if (field.type === 'list')
    return input.value
      .split(/[,\s]+/)
      .map((value) => value.trim())
      .filter(Boolean);
  return input.value;
}
export function ignoreLines(text) {
  return text === '' ? [] : text.split('\n');
}

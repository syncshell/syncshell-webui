export const cloneConfig = (value) => JSON.parse(JSON.stringify(value));
export const getValue = (object, path) =>
  path.split('.').reduce((value, key) => value?.[key], object);
export function setValue(object, path, value) {
  const result = cloneConfig(object);
  const keys = path.split('.');
  let target = result;
  for (const key of keys.slice(0, -1)) target = target[key] ||= {};
  target[keys.at(-1)] = value;
  return result;
}
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

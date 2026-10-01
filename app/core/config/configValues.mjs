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

export function buildAdvancedConfigSections(config) {
  const sections = [
    { label: 'GUI', path: 'gui' },
    { label: 'LDAP', path: 'ldap' },
    { label: 'Options', path: 'options' },
    ...config.folders.map((folder, index) => ({
      label: 'Folder: ' + (folder.label || folder.id),
      path: 'folders.' + index,
    })),
    ...config.devices.map((device, index) => ({
      label: 'Device: ' + (device.name || device.deviceID),
      path: 'devices.' + index,
    })),
    { label: 'Default Folder', path: 'defaults.folder' },
    { label: 'Default Device', path: 'defaults.device' },
    { label: 'Default Ignore Patterns', path: 'defaults.ignores' },
  ];
  return sections.map(({ label, path }) => {
    const object = path.split('.').reduce((value, key) => value?.[key], config);
    const fields = Object.entries(object || {}).flatMap(([key, value]) => {
      if (
        key.startsWith('_') ||
        (value && !Array.isArray(value) && typeof value === 'object') ||
        (Array.isArray(value) &&
          value.some((item) => !['number', 'string'].includes(typeof item)))
      ) {
        return [];
      }
      return [
        {
          path: path + '.' + key,
          label: key.replace(/([a-z])([A-Z])/g, '$1 $2'),
          type:
            key === 'lines'
              ? 'lines'
              : Array.isArray(value)
                ? 'list'
                : typeof value === 'boolean'
                  ? 'checkbox'
                  : typeof value === 'number'
                    ? 'number'
                    : 'text',
        },
      ];
    });
    return { label, path, fields };
  });
}

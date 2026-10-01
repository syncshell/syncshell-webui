export function serviceHealth(services = {}) {
  const entries = Object.entries(services);
  const failed = entries.filter(([, value]) => value?.error);
  return {
    entries,
    failed,
    total: entries.length,
    running: entries.length - failed.length,
    color:
      entries.length && !failed.length
        ? 'success'
        : entries.length === failed.length
          ? 'danger'
          : '',
  };
}

export function groupAndSortItems(items, name, id) {
  const groups = {};
  for (const item of items) (groups[item.group || ''] ||= []).push(item);
  return Object.keys(groups)
    .sort()
    .map((group) => [
      group,
      groups[group].sort((a, b) =>
        (a[name] || a[id]).localeCompare(b[name] || b[id]),
      ),
    ]);
}

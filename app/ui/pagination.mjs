// Copyright 2014 Michael Bromley
// SPDX-License-Identifier: MIT
// see licenses/angular-utils-pagination.txt

export function paginationPages(current, itemCount, perPage) {
  const total = Math.ceil(itemCount / perPage);
  const range = 9;
  const half = 5;
  const start =
    total > range && current > half
      ? current > total - half
        ? total - range + 1
        : current - half + 1
      : 1;
  return Array.from({ length: Math.min(range, total) }, (_, index) => {
    if (index === 0) return 1;
    if (index === range - 1) return total;
    if (
      total > range &&
      ((index === 1 && current > half) ||
        (index === range - 2 && current <= total - half))
    )
      return '...';
    return start + index;
  });
}

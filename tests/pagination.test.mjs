import assert from 'node:assert/strict';
import { test } from 'node:test';
import { paginationPages } from '../app/ui/pagination.mjs';

const page = (number) => ({ type: 'page', number });
const gap = (position) => ({ type: 'gap', position });

test('pagination keeps the ends and a nine-item window around the active page', () => {
  for (const [currentPage, total, expected] of [
    [1, 0, []],
    [1, 1, [page(1)]],
    [1, 25, [page(1), page(2), page(3)]],
    [
      5,
      90,
      [
        page(1),
        page(2),
        page(3),
        page(4),
        page(5),
        page(6),
        page(7),
        page(8),
        page(9),
      ],
    ],
    [
      1,
      1000,
      [
        page(1),
        page(2),
        page(3),
        page(4),
        page(5),
        page(6),
        page(7),
        gap('trailing'),
        page(100),
      ],
    ],
    [
      50,
      1000,
      [
        page(1),
        gap('leading'),
        page(48),
        page(49),
        page(50),
        page(51),
        page(52),
        gap('trailing'),
        page(100),
      ],
    ],
    [
      100,
      1000,
      [
        page(1),
        gap('leading'),
        page(94),
        page(95),
        page(96),
        page(97),
        page(98),
        page(99),
        page(100),
      ],
    ],
  ])
    assert.deepEqual(paginationPages(currentPage, total, 10), expected);
});

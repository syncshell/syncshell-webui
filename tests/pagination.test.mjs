import assert from 'node:assert/strict';
import {test} from 'node:test';
import {paginationPages} from '../client/pagination.mjs';

test('pagination keeps the ends and a nine-item window around the active page', () => {
    for (const [page, total, expected] of [
        [1, 0, []], [1, 1, [1]], [1, 25, [1, 2, 3]],
        [5, 90, [1, 2, 3, 4, 5, 6, 7, 8, 9]],
        [1, 1000, [1, 2, 3, 4, 5, 6, 7, '...', 100]],
        [50, 1000, [1, '...', 48, 49, 50, 51, 52, '...', 100]],
        [100, 1000, [1, '...', 94, 95, 96, 97, 98, 99, 100]]
    ]) assert.deepEqual(paginationPages(page, total, 10), expected);
});

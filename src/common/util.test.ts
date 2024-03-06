import { describe, expect, test } from 'vitest';
import { reorderList } from './util';

describe('reorderList', () => {
  test('noop if param invalid', () => {
    expect(reorderList([], [0], 1, false)).toBeUndefined();
    expect(reorderList([1, 2, 3, 4], [1], -1, false)).toBeUndefined();
    expect(reorderList([1, 2, 3, 4], [1], 4, false)).toBeUndefined();
  });

  test('move single item', () => {
    expect(reorderList([1, 2, 3, 4], [1], 0, false)).toEqual([2, 1, 3, 4]);
    expect(reorderList([1, 2, 3, 4], [2], 1, false)).toEqual([1, 3, 2, 4]);
    expect(reorderList([1, 2, 3, 4], [1], 3, true)).toEqual([1, 3, 4, 2]);
  });

  test('move multiple items', () => {
    expect(reorderList([1, 2, 3, 4], [1, 2], 0, false)).toEqual([2, 3, 1, 4]);
    expect(reorderList([1, 2, 3, 4], [1, 2], 3, true)).toEqual([1, 4, 2, 3]);
    expect(reorderList([1, 2, 3, 4], [1, 3], 0, false)).toEqual([2, 4, 1, 3]);
  });
});

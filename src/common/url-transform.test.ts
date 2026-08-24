import { describe, expect, test } from 'vitest';
import type { KeyValueItem } from '@/types';
import { buildUrlTransform } from './url-transform';

const q = (name: string, value = ''): KeyValueItem => ({ name, value });

describe('buildUrlTransform', () => {
  test('returns undefined if transform is missing', () => {
    expect(buildUrlTransform(undefined)).toBeUndefined();
  });

  test('returns empty object if nothing to transform', () => {
    expect(buildUrlTransform({})).toEqual({});
    expect(buildUrlTransform({ query: [] })).toEqual({});
  });

  test('add or replace params only', () => {
    expect(buildUrlTransform({ query: [q('a', '1'), q('b')] })).toEqual({
      queryTransform: {
        addOrReplaceParams: [
          { key: 'a', value: '1' },
          { key: 'b', value: '' },
        ],
      },
    });
  });

  test('remove params only', () => {
    expect(buildUrlTransform({ query: [q('!a'), q('!b')] })).toEqual({
      queryTransform: { removeParams: ['a', 'b'] },
    });
  });

  test('combines add and remove params in a single queryTransform', () => {
    expect(
      buildUrlTransform({
        query: [q('raflank', '15664'), q('!galik')],
      }),
    ).toEqual({
      queryTransform: {
        addOrReplaceParams: [{ key: 'raflank', value: '15664' }],
        removeParams: ['galik'],
      },
    });
  });

  test('replaces whole query with "?" prefix', () => {
    expect(buildUrlTransform({ query: [q('?new_query_string')] })).toEqual({
      query: '?new_query_string',
    });
  });

  test('removes whole query with "!"', () => {
    expect(buildUrlTransform({ query: [q('!')] })).toEqual({ query: '' });
  });

  test('skips commented lines', () => {
    expect(buildUrlTransform({ query: [q('#a', '1'), q('!#b')] })).toEqual({
      queryTransform: { removeParams: ['#b'] },
    });
  });

  test('merges URL transform keys', () => {
    expect(
      buildUrlTransform({
        host: 'www.example.com',
        path: '/new/path',
        query: [q('!a')],
      }),
    ).toEqual({
      host: 'www.example.com',
      path: '/new/path',
      queryTransform: { removeParams: ['a'] },
    });
  });
});

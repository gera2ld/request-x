import { normalizeCookieRule, normalizeRequestRule } from '@/common/list';
import type { ListData, ListGroups } from '@/types';
import { flatMap, groupBy } from 'es-toolkit';
import browser from 'webextension-polyfill';
import { dumpExactData, getExactData } from './util';

const LIST_PREFIX = 'list:';
const KEY_LISTS = 'lists';

let lastId = -1;

export const dataLoaded = loadData();

export async function loadData() {
  let ids = await getExactData<number[]>(KEY_LISTS);
  const lists: ListGroups = { request: [], cookie: [] };
  if (Array.isArray(ids)) {
    const allData = await browser.storage.local.get(
      ids.map((id) => `${LIST_PREFIX}${id}`),
    );
    const allLists = ids
      .map((id) => allData[`${LIST_PREFIX}${id}`])
      .filter(Boolean) as ListData[];
    const groups = groupBy(allLists, (item) => item.type);
    Object.assign(lists, groups);
  } else {
    const allData = await browser.storage.local.get();
    const allLists = Object.keys(allData)
      .filter((key) => key.startsWith(LIST_PREFIX))
      .map((key) => allData[key]) as ListData[];
    const groups = groupBy(allLists, (item) => item.type);
    Object.assign(lists, groups);
  }
  if (import.meta.env.DEV) console.log('loadData:raw', lists);
  ids = Object.values(lists).flatMap((group: ListData[]) =>
    group.map((item) => item.id),
  );
  lastId = Math.max(0, ...ids);
  lists.request.forEach((list) => {
    list.enabled ??= true;
    list.rules = flatMap(list.rules, normalizeRequestRule);
  });
  lists.cookie.forEach((list) => {
    list.enabled ??= true;
    list.rules = flatMap(list.rules, normalizeCookieRule);
  });
  if (import.meta.env.DEV) console.log('loadData', lists);
  return lists;
}

export function getKey(id: number) {
  return `${LIST_PREFIX}${id}`;
}

export async function dumpLists(lists: ListGroups) {
  await dumpExactData(
    KEY_LISTS,
    Object.values(lists).flatMap((group: ListData[]) =>
      group.map((group) => group.id),
    ),
  );
}

export async function saveList(data: Partial<ListData>) {
  const list: ListData = {
    id: 0,
    name: 'No name',
    subscribeUrl: '',
    lastUpdated: 0,
    enabled: true,
    type: 'request',
    rules: [],
    ...data,
  };
  if (!list.rules) throw new Error('Invalid list data');
  list.name ||= 'No name';
  if (!list.id) {
    if (lastId < 0) throw new Error('Data is not loaded yet');
    list.id = ++lastId;
  }
  if (import.meta.env.DEV) console.log('saveList', list);
  await dumpExactData(getKey(list.id), list);
  return list;
}

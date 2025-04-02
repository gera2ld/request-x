import { sendMessage } from '@/common';
import {
  fetchListData,
  normalizeCookieRule,
  normalizeRequestRule,
} from '@/common/list';
import type { ListData, RuleData } from '@/types';
import { cookieActions } from './cookie';
import { dataLoaded, dumpLists, saveList } from './data';
import { requestActions } from './request';

export function reloadRules(data: {
  updated?: ListData[];
  removed?: ListData[];
}) {
  const updatedLists = [...(data.updated || []), ...(data.removed || [])];
  if (updatedLists.some((list) => list.type === 'request'))
    requestActions.reload();
  if (updatedLists.some((list) => list.type === 'cookie'))
    cookieActions.reload();
}

export async function updateList(data: Partial<ListData>) {
  const list = await saveList(data);
  reloadRules({
    updated: [list],
  });
  return list;
}

export async function updateLists(payload: Partial<ListData>[]) {
  const lists = await dataLoaded;
  const updatedLists = await Promise.all(
    payload.map(async (data) => {
      if (data.id) {
        data = {
          ...Object.values(lists)
            .flat()
            .find((list) => list.id === data.id),
          ...data,
        };
      }
      const list = await saveList(data);
      const group = lists[list.type] as ListData[];
      const i = group.findIndex((item) => item.id === list.id);
      if (i < 0) {
        group.push(list);
      } else {
        group[i] = list;
      }
      return list;
    }),
  );
  if (updatedLists.length) {
    dumpLists(lists);
    reloadRules({ updated: updatedLists });
  }
  return updatedLists;
}

const cache: Record<number, Promise<void>> = {};

async function doFetchList(list: ListData) {
  const url = list.subscribeUrl;
  if (!url) return;
  const data = await fetchListData(url);
  if (data.type !== list.type) throw new Error('Type mismatch');
  if (!data.rules) throw new Error('Invalid data');
  list.lastUpdated = Date.now();
  list.rules = data.rules.flatMap(
    (list.type === 'cookie' ? normalizeCookieRule : normalizeRequestRule) as (
      data: any,
    ) => RuleData[],
  );
  await updateList(list);
}

export function fetchList(list: ListData | undefined) {
  if (!list?.subscribeUrl) return;
  let promise = cache[list.id];
  if (!promise) {
    promise = doFetchList(list);
    cache[list.id] = promise;
    promise.finally(() => {
      delete cache[list.id];
    });
  }
  return promise;
}

export function broadcastUpdates() {
  sendMessage('UpdateLists');
}

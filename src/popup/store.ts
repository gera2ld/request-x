import { reactive } from 'vue';
import type { ListData, FeatureToggles } from '@/types';

const RECENTLY_DISABLED_KEY = 'recentlyDisabled';
const RECENTLY_DISABLED_MAX_RECORD = 3;

export const store = reactive({
  lists: {},
  recentlyDisabledListIds: loadRecentlyDisabledListIds(),
  features: {},
} as {
  lists: { [key: string]: ListData[] };
  recentlyDisabledListIds: number[];
  features: FeatureToggles;
});

export function filterLists(predicate: (list: ListData) => boolean) {
  return Object.keys(store.lists).reduce((res, key) => {
    const lists = store.lists[key].filter(predicate);
    if (lists.length) res[key] = lists;
    return res;
  }, {} as Record<string, ListData[]>);
}

function loadRecentlyDisabledListIds(): number[] {
  let ids;
  try {
    ids = JSON.parse(localStorage.getItem(RECENTLY_DISABLED_KEY) || '');
  } catch {
    // ignore
  }
  if (!Array.isArray(ids)) ids = [];
  return ids;
}

function dumpRecentlyDisabledListIds() {
  localStorage.setItem(
    RECENTLY_DISABLED_KEY,
    JSON.stringify(store.recentlyDisabledListIds)
  );
}

export function trackListToggle(id: number, enabled: boolean) {
  const { recentlyDisabledListIds } = store;
  const index = recentlyDisabledListIds.indexOf(id);
  if (enabled) {
    if (index >= 0) recentlyDisabledListIds.splice(index, 1);
  } else if (index < 0) {
    recentlyDisabledListIds.push(id);
    if (recentlyDisabledListIds.length > RECENTLY_DISABLED_MAX_RECORD) {
      recentlyDisabledListIds.splice(
        0,
        recentlyDisabledListIds.length - RECENTLY_DISABLED_MAX_RECORD
      );
    }
  }
  dumpRecentlyDisabledListIds();
}

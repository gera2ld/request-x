import type { FeatureToggles, ListGroups } from '@/types';
import { reactive } from 'vue';

const RECENTLY_DISABLED_KEY = 'recentlyDisabled';
const RECENTLY_DISABLED_MAX_RECORD = 5;

export const store = reactive<{
  lists: ListGroups;
  ruleErrors: Record<number, Record<number, string>>;
  recentlyDisabledListIds: number[];
  features: FeatureToggles;
}>({
  lists: {
    request: [],
    cookie: [],
  },
  ruleErrors: {},
  recentlyDisabledListIds: loadRecentlyDisabledListIds(),
  features: {},
});

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
    JSON.stringify(
      store.recentlyDisabledListIds.slice(-RECENTLY_DISABLED_MAX_RECORD),
    ),
  );
}

export function trackListToggle(id: number, enabled: boolean) {
  const { recentlyDisabledListIds } = store;
  const index = recentlyDisabledListIds.indexOf(id);
  if (enabled) {
    if (index >= 0) recentlyDisabledListIds.splice(index, 1);
  } else if (index < 0) {
    recentlyDisabledListIds.push(id);
  }
  dumpRecentlyDisabledListIds();
}

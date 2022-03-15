import { computed, reactive } from 'vue';
import type { ListData, FeatureToggles } from '#/types';

export const store = reactive({
  lists: {},
  enabledLists: {},
  features: {},
} as {
  lists: { [key: string]: ListData[] };
  enabledLists: { [key: string]: ListData[] };
  features: FeatureToggles;
});

export function getEnabledLists() {
  return Object.keys(store.lists).reduce((res, key) => {
    if (key !== 'cookie' || store.features.cookies) {
      const lists = store.lists[key].filter((list) => list.enabled);
      if (lists.length) res[key] = lists;
    }
    return res;
  }, {} as { [key: string]: ListData[] });
}

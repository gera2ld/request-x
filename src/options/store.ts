import type {
  ConfigStorage,
  FeatureToggles,
  ListData,
  ListGroups,
  RuleData,
} from '@/types';
import { computed, reactive } from 'vue';

export const listTypes = ['request', 'cookie'] as const;

export const store = reactive<{
  lists: ListGroups;
  ruleErrors: Record<number, Record<number, string>>;
  editList:
    | ({
        isSubscribed?: boolean;
      } & Partial<ListData>)
    | undefined;
  route: string[];
  config: ConfigStorage | undefined;
  features: FeatureToggles;
  activeArea: 'lists' | 'rules';
}>({
  lists: {
    request: [],
    cookie: [],
  },
  ruleErrors: {},
  editList: undefined,
  route: [],
  config: undefined,
  features: {},
  activeArea: 'rules',
});

export const ruleSelection = reactive<{
  active: number;
  count: number;
  selected: boolean[];
}>({
  active: -1,
  count: 0,
  selected: [],
});

export const listSelection = reactive<{
  groupIndex: number;
  itemIndex: number;
  selection: Array<{
    count: number;
    selected: boolean[];
  }>;
}>({
  groupIndex: -1,
  itemIndex: -1,
  selection: [],
});

export const ruleState = reactive<{
  newRule: Partial<RuleData> | undefined;
  editing: number;
  filter: string;
  visible: boolean[];
}>({
  newRule: undefined,
  editing: -1,
  filter: '',
  visible: [],
});

export const currentList = computed<ListData | undefined>(() => {
  const [page, sid] = store.route;
  if (page !== 'lists') return;
  const id = +sid;
  const list = [...store.lists.request, ...store.lists.cookie].find(
    (item) => item.id === id,
  );
  return list as ListData | undefined;
});

export const listEditable = computed(
  () => currentList.value && !currentList.value.subscribeUrl,
);

export function ensureGroupSelection(index: number) {
  let selection = listSelection.selection[index];
  if (!selection) {
    selection = {
      count: 0,
      selected: [],
    };
    listSelection.selection[index] = selection;
  }
  return selection;
}

export const selectedLists = computed(() => {
  const lists = listSelection.selection.flatMap((selection, i) =>
    selection.count
      ? store.lists[listTypes[i]].filter(
          (_, index) => selection.selected[index],
        )
      : [],
  );
  return lists;
});

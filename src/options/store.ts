import { computed, reactive } from 'vue';
import { ListData, ConfigStorage, FeatureToggles, RuleData } from '#/types';

export const listTypes = ['request', 'cookie'];

export const store = reactive({
  lists: {},
  editList: null,
  route: [],
  config: null,
  features: {},
  activeArea: 'rules',
  listErrors: {},
} as {
  lists: { [key: string]: ListData[] };
  editList: {
    isSubscribed?: boolean;
  } & Partial<ListData>;
  route: string[];
  config: ConfigStorage;
  features: FeatureToggles;
  activeArea: 'lists' | 'rules';
  listErrors: { [id: number]: string };
});

export const currentType = computed<ListData['type']>(
  () => store.route[1] as ListData['type']
);

export const currentList = computed<ListData>(() => {
  const [page, , sid] = store.route;
  if (page !== 'lists') return null;
  const id = +sid;
  const list = store.lists[currentType.value]?.find((item) => item.id === id);
  return list;
});

export const listEditable = computed(
  () => currentList.value && !currentList.value.subscribeUrl
);

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
  newRule: Partial<RuleData>;
  editing: number;
  filter: string;
  visible: boolean[];
}>({
  newRule: null,
  editing: -1,
  filter: '',
  visible: [],
});

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

export function getSelectedLists() {
  const lists = listSelection.selection.flatMap((selection, i) =>
    selection.count
      ? store.lists[listTypes[i]]?.filter(
          (_, index) => selection.selected[index]
        )
      : []
  );
  return lists;
}

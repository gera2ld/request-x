import { computed, reactive, ref } from 'vue';
import { ListData, ConfigStorage, FeatureToggles, RuleData } from '#/types';

export const store = reactive({
  lists: {},
  editList: null,
  route: [],
  config: null,
  features: {},
} as {
  lists: { [key: string]: ListData[] };
  editList: {
    isSubscribed?: boolean;
  } & Partial<ListData>;
  route: string[];
  config: ConfigStorage;
  features: FeatureToggles;
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
  activeType: ListData['type'];
  activeIndex: number;
  count: number;
  selected: boolean[];
}>({
  activeType: 'request',
  activeIndex: -1,
  count: 0,
  selected: [],
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

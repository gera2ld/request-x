import { keyboardService } from '@/common/keyboard';
import { getName, normalizeRequestRule } from '@/common/list';
import { reorderList, sendMessage } from '@/common/util';
import type { ListData, ListsDumpData, RuleData, RulesDumpData } from '@/types';
import { debounce, pick } from 'lodash-es';
import { toRaw, watch } from 'vue';
import { shortcutMap } from './shortcut';
import {
  currentList,
  ensureGroupSelection,
  listEditable,
  listSelection,
  listTypes,
  ruleSelection,
  ruleState,
  selectedLists,
  store,
} from './store';
import {
  blob2Text,
  compareNumberArray,
  downloadBlob,
  dumpList,
  editList,
  isRoute,
  loadFile,
  setRoute,
} from './util';

const PROVIDER = 'Request X';

export const listActions = {
  new() {
    store.editList = {
      name: '',
      type: 'request',
    };
  },
  async import() {
    const blob = await loadFile();
    const text = await blob2Text(blob);
    let data = JSON.parse(text);
    let importData: ListsDumpData;
    if (data.provider === PROVIDER) {
      if (data.category !== 'lists') {
        throw new Error(`Invalid category: ${data.category}`);
      }
      importData = data;
    } else {
      if (!Array.isArray(data)) {
        data = [data];
      }
      data.forEach((list: Partial<ListData>) => {
        list.type ??= 'request';
      });
      importData = {
        provider: PROVIDER,
        category: 'lists',
        data,
      };
    }
    listActions.selPaste(importData);
  },
  subscribe() {
    editList({
      subscribeUrl: '',
      isSubscribed: true,
    });
  },
  fetchAll() {
    sendMessage('FetchLists');
  },
  toggle(item?: ListData) {
    item ||= currentList.value;
    if (item) {
      item.enabled = !item.enabled;
      listActions.save([pick(item, ['id', 'enabled'])]);
    }
  },
  edit(item?: ListData) {
    item ||= currentList.value;
    editList(item);
  },
  cancel() {
    store.editList = undefined;
  },
  fetch(item?: ListData) {
    item ||= currentList.value;
    if (item) sendMessage('FetchList', pick(item, ['id']));
  },
  remove(item?: ListData) {
    item ||= currentList.value;
    if (item) sendMessage('RemoveList', pick(item, ['id']));
  },
  async move(
    type: 'request' | 'cookie',
    selection: number[],
    target: number,
    downward: boolean,
  ) {
    await sendMessage('MoveLists', {
      type,
      selection,
      target,
      downward,
    });
    const reordered = reorderList(
      store.lists[type] as ListData[],
      selection,
      target,
      downward,
    );
    if (reordered) {
      store.lists[type] = reordered as any;
    }
  },
  async save(payload: Partial<ListData>[]) {
    return sendMessage<ListData[]>('SaveLists', payload);
  },
  async fork(item?: ListData) {
    item ||= currentList.value;
    if (!item) return;
    const data = {
      type: item.type,
      name: `${item.name || 'No name'} (forked)`,
      rules: item.rules,
    };
    const [{ id }] = await listActions.save([data]);
    setRoute(`lists/${id}`);
  },
  selClear() {
    listSelection.groupIndex = -1;
    listSelection.itemIndex = -1;
    listSelection.selection = [];
  },
  selAll() {
    listSelection.selection = [];
    listTypes.forEach((type, i) => {
      const selection = ensureGroupSelection(i);
      const lists = store.lists[type] || [];
      lists.forEach((_, j) => {
        selection.selected[j] = true;
      });
      selection.count = lists.length;
    });
  },
  selToggle(
    groupIndex: number,
    itemIndex: number,
    event: { cmdCtrl: boolean; shift: boolean },
  ) {
    const lastGroupIndex = listSelection.groupIndex;
    const lastItemIndex = listSelection.itemIndex;
    listSelection.groupIndex = groupIndex;

    if (event.shift && lastGroupIndex >= 0 && lastItemIndex >= 0) {
      listSelection.selection = [];
      let start = [lastGroupIndex, lastItemIndex];
      let end = [groupIndex, itemIndex];
      if (compareNumberArray(start, end) > 0) {
        [start, end] = [end, start];
      }
      for (let i = start[0]; i <= end[0]; i += 1) {
        const jStart = i === start[0] ? start[1] : 0;
        const jEnd =
          i === end[0] ? end[1] : store.lists[listTypes[i]]?.length ?? -1;
        const selection = {
          count: jEnd - jStart + 1,
          selected: [] as boolean[],
        };
        for (let j = jStart; j <= jEnd; j += 1) {
          selection.selected[j] = true;
        }
        listSelection.selection[i] = selection;
      }
      return;
    }

    if (event.cmdCtrl) {
      const selection = ensureGroupSelection(groupIndex);
      if ((selection.selected[itemIndex] = !selection.selected[itemIndex])) {
        selection.count += 1;
      } else {
        selection.count -= 1;
      }
    } else {
      listSelection.selection = [];
      const selection = ensureGroupSelection(groupIndex);
      selection.selected[itemIndex] = true;
      selection.count = 1;
    }
    listSelection.itemIndex = itemIndex;
  },
  selRemove() {
    let count = 0;
    listSelection.selection.forEach((selection, i) => {
      if (!selection.count) return;
      store.lists[listTypes[i]]?.forEach((item, j) => {
        if (selection.selected[j]) {
          listActions.remove(item);
          count += 1;
        }
      });
    });
    listActions.selClear();
    return count;
  },
  selCopy() {
    const lists = selectedLists.value.map(dumpList);
    if (!lists?.length) return 0;
    const data: ListsDumpData = {
      provider: PROVIDER,
      category: 'lists',
      data: lists,
    };
    navigator.clipboard.writeText(JSON.stringify(data));
    return lists.length;
  },
  selCut() {
    const count = listActions.selCopy();
    if (count) listActions.selRemove();
    return count;
  },
  async selPaste({ data }: ListsDumpData) {
    await listActions.save(
      data.map((list) => {
        const data = pick(list, [
          'name',
          'type',
          'enabled',
          'rules',
          'subscribeUrl',
        ]);
        if (data.type === 'request' && data.rules)
          data.rules = data.rules.flatMap(fixRequestRule);
        return data;
      }),
    );
  },
  selExport() {
    const lists = selectedLists.value.map(dumpList);
    if (!lists.length) return;
    const basename =
      lists.length === 1
        ? getName(lists[0]).replace(/\s+/g, '-').toLowerCase()
        : `request-x-export-${Date.now()}`;
    const blob = new Blob(
      [JSON.stringify(lists.length === 1 ? lists[0] : lists)],
      {
        type: 'application/json',
      },
    );
    downloadBlob(blob, `${basename}.json`);
  },
  selToggleStatus() {
    const lists = selectedLists.value;
    if (!lists.length) return;
    const enabled = lists.some((list) => !list.enabled);
    const updatedLists = lists.filter((list) => list.enabled !== enabled);
    updatedLists.forEach((list) => {
      list.enabled = enabled;
    });
    listActions.save(updatedLists.map((list) => pick(list, ['id', 'enabled'])));
  },
};

export const ruleActions = {
  selToggle(index: number, event: { cmdCtrl: boolean; shift: boolean }) {
    if (event.shift && ruleSelection.active >= 0) {
      ruleSelection.selected = [];
      const start = Math.min(ruleSelection.active, index);
      const end = Math.max(ruleSelection.active, index);
      for (let i = start; i <= end; i += 1) {
        ruleSelection.selected[i] = true;
      }
      ruleSelection.count = end - start + 1;
      return;
    }
    if (event.cmdCtrl) {
      if ((ruleSelection.selected[index] = !ruleSelection.selected[index])) {
        ruleSelection.count += 1;
      } else {
        ruleSelection.count -= 1;
      }
    } else {
      ruleSelection.selected = [];
      ruleSelection.selected[index] = true;
      ruleSelection.count = 1;
    }
    ruleSelection.active = index;
  },
  selClear() {
    ruleSelection.active = -1;
    ruleSelection.count = 0;
    ruleSelection.selected.length = 0;
  },
  selAll() {
    const current = currentList.value;
    if (!current) return;
    ruleSelection.selected.length = 0;
    (current.rules as RuleData[]).forEach((_, i) => {
      ruleSelection.selected[i] = true;
    });
    ruleSelection.count = current.rules.length;
  },
  save() {
    const current = currentList.value;
    if (!current) return;
    listActions.save([current]);
  },
  selRemove() {
    const current = currentList.value;
    if (!current || !listEditable.value) return;
    current.rules = (current.rules as RuleData[]).filter(
      (_, index) => !ruleSelection.selected[index],
    ) as ListData['rules'];
    ruleActions.selClear();
    ruleActions.save();
  },
  selDuplicate() {
    const current = currentList.value;
    if (!current || !listEditable.value) return;
    const rules: RuleData[] = [];
    const selected: boolean[] = [];
    let offset = 0;
    current.rules.forEach((rule: RuleData, index: number) => {
      rules.push(rule);
      if (ruleSelection.selected[index]) {
        rules.push(rule);
        offset += 1;
        selected[index + offset] = true;
      }
    });
    current.rules = rules as ListData['rules'];
    ruleActions.save();
    ruleSelection.count = offset * 2;
    ruleSelection.selected = selected;
    ruleActions.update();
  },
  selCopy() {
    const current = currentList.value;
    if (!current || !ruleSelection.count) return;
    const rules = (current.rules as RuleData[])?.filter(
      (_, index) => ruleSelection.selected[index],
    );
    if (!rules?.length) return;
    const data: RulesDumpData = {
      provider: PROVIDER,
      category: 'rules',
      data: {
        type: current.type,
        rules,
      },
    };
    navigator.clipboard.writeText(JSON.stringify(data));
  },
  selCut() {
    if (!listEditable.value) return;
    ruleActions.selCopy();
    ruleActions.selRemove();
  },
  async selPaste({ data }: RulesDumpData) {
    const current = currentList.value;
    if (!current || !listEditable.value) return;
    if (!data.type || !data.rules?.length)
      throw new Error('Invalid clipboard data');
    if (data.type !== current.type) throw new Error('Incompatible rule type');
    const rules = current.rules as RuleData[];
    let newRules = data.rules as RuleData[];
    if (data.type === 'request') newRules = newRules.flatMap(fixRequestRule);
    rules.splice(
      ruleSelection.active < 0 ? rules.length : ruleSelection.active,
      0,
      ...newRules,
    );
    ruleActions.save();
  },
  selEdit() {
    ruleActions.edit(ruleSelection.active);
  },
  new() {
    const current = currentList.value;
    if (!current || !listEditable.value) return;
    ruleState.newRule = {
      enabled: true,
    };
    ruleState.editing = current.rules.length;
    ruleActions.selClear();
  },
  edit(index = -1) {
    ruleState.newRule = undefined;
    ruleState.editing = index;
    ruleActions.selClear();
  },
  cancel() {
    const active = ruleState.editing;
    ruleActions.edit();
    ruleSelection.active = active;
  },
  submit(index: number, { rule }: { rule: RuleData }) {
    const rules = currentList.value?.rules as RuleData[];
    if (!rules) return;
    rule = toRaw(rule);
    if (index < 0) {
      rules.push(rule);
    } else {
      rules[index] = rule;
    }
    ruleActions.save();
    ruleActions.cancel();
  },
  update() {
    const rules = currentList.value?.rules as RuleData[];
    if (!rules) return;
    ruleSelection.active = -1;
    ruleSelection.count = 0;
    ruleSelection.selected.length = rules.length;
    ruleState.visible = rules.map((rule, index) => {
      const filtered =
        !ruleState.filter || rule.url?.includes(ruleState.filter);
      if (!filtered) ruleSelection.selected[index] = false;
      if (ruleSelection.selected[index]) ruleSelection.count += 1;
      return filtered;
    });
  },
  toggle(item: RuleData) {
    item.enabled = !item.enabled;
    ruleActions.save();
  },
  selToggleStatus() {
    const current = currentList.value;
    if (!current || !ruleSelection.count) return;
    const selectedRules = (current.rules as RuleData[]).filter(
      (_, index) => ruleSelection.selected[index],
    );
    const enabled = selectedRules.every((rule) => rule.enabled) ? false : true;
    selectedRules.forEach((rule) => {
      rule.enabled = enabled;
    });
    ruleActions.save();
  },
};

export const ruleKeys = {
  up() {
    ruleSelection.active = Math.max(0, ruleSelection.active - 1);
  },
  down() {
    const current = currentList.value;
    if (!current) return;
    ruleSelection.active = Math.min(
      current.rules.length - 1,
      ruleSelection.active + 1,
    );
  },
  space() {
    ruleActions.selToggle(ruleSelection.active, {
      cmdCtrl: true,
      shift: false,
    });
  },
};

export async function selPaste() {
  let data: ListsDumpData | RulesDumpData;
  try {
    const raw = await navigator.clipboard.readText();
    data = raw && JSON.parse(raw);
    if (data.provider !== PROVIDER) throw new Error('Invalid clipboard data');
  } catch {
    return;
  }
  if (data.category === 'lists') {
    listActions.selPaste(data as ListsDumpData);
  } else if (data.category === 'rules' && listEditable.value) {
    ruleActions.selPaste(data as RulesDumpData);
  }
}

export async function selEdit() {
  if (store.activeArea === 'lists') {
    listActions.edit();
  } else {
    ruleActions.selEdit();
  }
}

export function selectAll() {
  if (store.activeArea === 'lists') {
    listActions.selAll();
  } else {
    ruleActions.selAll();
  }
}

function fixRequestRule(rule: any) {
  if (!rule.type) {
    console.warn(
      'The support for the old data structure is deprecated and will be removed soon.',
    );
  }
  return normalizeRequestRule(rule);
}

const updateListLater = debounce(ruleActions.update, 200);

watch(currentList, (list) => {
  listSelection.groupIndex = list
    ? ['request', 'cookie'].indexOf(list.type)
    : -1;
  listSelection.itemIndex = list
    ? (store.lists[list.type] as ListData[]).findIndex(
        (item) => item.id === list.id,
      )
    : -1;
});
watch(() => ruleState.filter, updateListLater);
watch(currentList, (cur, prev) => {
  ruleActions.update();
  if (cur?.id !== prev?.id) ruleActions.cancel();
});
watch(
  () => ruleState.editing,
  (editing) => {
    keyboardService.setContext('editRule', editing >= 0);
  },
);
watch(
  () => store.route,
  () => {
    if (isRoute('lists')) {
      const current = currentList.value;
      if (!current) return;
      const index =
        (store.lists[current.type] as ListData[] | undefined)?.indexOf(
          current,
        ) ?? -1;
      if (index >= 0) {
        listActions.selToggle(listTypes.indexOf(current.type), index, {
          cmdCtrl: false,
          shift: false,
        });
      }
    } else {
      listActions.selClear();
    }
  },
);
watch(
  () => store.activeArea,
  (activeArea) => {
    keyboardService.setContext('listsRealm', activeArea === 'lists');
  },
);
watch(
  () => store.editList,
  (editList) => {
    keyboardService.setContext('listModal', !!editList);
  },
);

const listsRealm = {
  condition: '!inputFocus && listsRealm && !editRule',
};
const rulesRealm = {
  condition: '!inputFocus && !listsRealm && !editRule',
};
const noEdit = {
  condition: '!inputFocus && !editRule',
};
keyboardService.register(shortcutMap.new, listActions.new, noEdit);
keyboardService.register(shortcutMap.copy, listActions.selCopy, listsRealm);
keyboardService.register(shortcutMap.copy, ruleActions.selCopy, rulesRealm);
keyboardService.register(shortcutMap.cut, listActions.selCut, listsRealm);
keyboardService.register(shortcutMap.cut, ruleActions.selCut, rulesRealm);
keyboardService.register(shortcutMap.paste, selPaste, noEdit);
keyboardService.register(
  shortcutMap.duplicate,
  ruleActions.selDuplicate,
  rulesRealm,
);
keyboardService.register(shortcutMap.remove, listActions.selRemove, listsRealm);
keyboardService.register(shortcutMap.remove, ruleActions.selRemove, rulesRealm);
keyboardService.register(shortcutMap.add, ruleActions.new, noEdit);
keyboardService.register(shortcutMap.selectAll, selectAll, noEdit);
keyboardService.register('up', ruleKeys.up, rulesRealm);
keyboardService.register('down', ruleKeys.down, rulesRealm);
keyboardService.register('space', ruleKeys.space, rulesRealm);
keyboardService.register(shortcutMap.edit, selEdit, noEdit);
keyboardService.register('esc', ruleActions.selClear, rulesRealm);
keyboardService.register('esc', ruleActions.cancel, { condition: 'editRule' });
keyboardService.register('esc', listActions.cancel, {
  condition: 'listModal',
});

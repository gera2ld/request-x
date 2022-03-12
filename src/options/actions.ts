import { watch } from 'vue';
import { debounce, pick } from 'lodash-es';
import browser from '#/common/browser';
import { keyboardService } from '#/common/keyboard';
import { ListData, ListsDumpData, RuleData, RulesDumpData } from '#/types';
import {
  store,
  ruleSelection,
  currentList,
  listEditable,
  ruleState,
  listSelection,
  listTypes,
  getSelectedLists,
  ensureGroupSelection,
} from './store';
import {
  dump,
  loadFile,
  blob2Text,
  editList,
  setRoute,
  setStatus,
  remove,
  isRoute,
  downloadBlob,
  dumpList,
  compareNumberArray,
} from './util';
import { shortcutMap } from './shortcut';

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
    if (!Array.isArray(data)) data = [data];
    data.forEach((list: Partial<ListData>) => {
      list.type ??= 'request';
      dump(
        pick(list, [
          'name',
          'type',
          'rules',
          'subscribeUrl',
        ]) as Partial<ListData>
      );
    });
  },
  subscribe() {
    editList({
      subscribeUrl: '',
      isSubscribed: true,
    });
  },
  fetchAll() {
    browser.runtime.sendMessage({ cmd: 'FetchLists' });
  },
  toggle(item?: ListData) {
    item ||= currentList.value;
    setStatus(item, !item.enabled);
  },
  edit(item?: ListData) {
    item ||= currentList.value;
    editList(item);
  },
  cancel() {
    store.editList = null;
  },
  fetch(item?: ListData) {
    item ||= currentList.value;
    browser.runtime.sendMessage({
      cmd: 'FetchList',
      data: { type: item.type, id: item.id },
    });
  },
  remove(item?: ListData) {
    item ||= currentList.value;
    remove(item.type, item.id);
  },
  async fork(item?: ListData) {
    item ||= currentList.value;
    const data = {
      type: item.type,
      name: `${item.name || 'No name'} (forked)`,
      rules: item.rules,
    };
    const id = await dump(data as Partial<ListData>);
    setRoute(`lists/${id}`);
  },
  selClear() {
    listSelection.groupIndex = -1;
    listSelection.itemIndex = -1;
    listSelection.selection = [];
  },
  selToggle(
    groupIndex: number,
    itemIndex: number,
    event: { cmdCtrl: boolean; shift: boolean }
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
          selected: [],
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
    const lists = getSelectedLists().map(dumpList);
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
    data.forEach((list) => {
      dump(
        pick(list, [
          'name',
          'type',
          'rules',
          'subscribeUrl',
        ]) as Partial<ListData>
      );
    });
  },
  selExport() {
    const lists = getSelectedLists().map(dumpList);
    if (!lists.length) return;
    const basename =
      lists.length === 1
        ? lists[0].name.replace(/\s+/g, '-').toLowerCase()
        : `request-x-export-${Date.now()}`;
    const blob = new Blob(
      [JSON.stringify(lists.length === 1 ? lists[0] : lists)],
      {
        type: 'application/json',
      }
    );
    downloadBlob(blob, `${basename}.json`);
  },
  selToggleStatus() {
    const lists = getSelectedLists();
    if (!lists.length) return;
    const enabled = lists.some((list) => !list.enabled);
    lists.forEach((list) => {
      if (list.enabled !== enabled) {
        setStatus(list, enabled);
      }
    });
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
  selRemove() {
    if (!listEditable.value) return;
    currentList.value.rules = (currentList.value.rules as RuleData[]).filter(
      (_, index) => !ruleSelection.selected[index]
    ) as ListData['rules'];
    ruleActions.selClear();
    ruleActions.save();
  },
  selDuplicate() {
    if (!listEditable.value) return;
    const rules: RuleData[] = [];
    const selected: boolean[] = [];
    let offset = 0;
    currentList.value.rules.forEach((rule: RuleData, index: number) => {
      rules.push(rule);
      if (ruleSelection.selected[index]) {
        rules.push(rule);
        offset += 1;
        selected[index + offset] = true;
      }
    });
    currentList.value.rules = rules as ListData['rules'];
    ruleActions.save();
    ruleSelection.count = offset * 2;
    ruleSelection.selected = selected;
    ruleActions.update();
  },
  selCopy() {
    if (!ruleSelection.count) return;
    const rules = (currentList.value?.rules as RuleData[])?.filter(
      (_, index) => ruleSelection.selected[index]
    );
    if (!rules?.length) return;
    const data: RulesDumpData = {
      provider: PROVIDER,
      category: 'rules',
      data: {
        type: currentList.value.type,
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
    if (!listEditable.value) return;
    if (!data.type || !data.rules?.length)
      throw new Error('Invalid clipboard data');
    if (data.type !== currentList.value.type)
      throw new Error('Incompatible rule type');
    const rules = currentList.value.rules as RuleData[];
    rules.splice(
      ruleSelection.active < 0 ? rules.length : ruleSelection.active,
      0,
      ...(data.rules as RuleData[])
    );
    ruleActions.save();
  },
  selEdit() {
    ruleActions.edit(ruleSelection.active);
  },
  new() {
    if (!listEditable.value) return;
    ruleState.newRule = {};
    ruleState.editing = currentList.value.rules.length;
    ruleActions.selClear();
  },
  edit(index = -1) {
    ruleState.newRule = null;
    ruleState.editing = index;
    ruleActions.selClear();
  },
  cancel() {
    const active = ruleState.editing;
    ruleActions.edit();
    ruleSelection.active = active;
  },
  save() {
    dump(pick(currentList.value, ['id', 'type', 'rules']) as Partial<ListData>);
  },
  submit(index: number, { rule }: { rule: RuleData }) {
    const rules = currentList.value.rules as RuleData[];
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
};

export const ruleKeys = {
  up() {
    ruleSelection.active = Math.max(0, ruleSelection.active - 1);
  },
  down() {
    ruleSelection.active = Math.min(
      currentList.value.rules.length - 1,
      ruleSelection.active + 1
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

const updateListLater = debounce(ruleActions.update, 200);
watch(() => ruleState.filter, updateListLater);
watch(currentList, (cur, prev) => {
  ruleActions.update();
  if (cur?.id !== prev?.id) ruleActions.cancel();
});
watch(
  () => ruleState.editing,
  (editing) => {
    keyboardService.setContext('editRule', editing >= 0);
  }
);
watch(
  () => store.route,
  () => {
    if (isRoute('lists')) {
      const index = currentList.value
        ? store.lists[currentList.value.type].indexOf(currentList.value)
        : -1;
      if (index >= 0) {
        listActions.selToggle(
          listTypes.indexOf(currentList.value.type),
          index,
          {
            cmdCtrl: false,
            shift: false,
          }
        );
      }
    } else {
      listActions.selClear();
    }
  }
);
watch(
  () => store.activeArea,
  (activeArea) => {
    keyboardService.setContext('listsRealm', activeArea === 'lists');
  }
);
watch(
  () => store.editList,
  (editList) => {
    keyboardService.setContext('listModal', !!editList);
  }
);

const listsRealm = {
  condition: '!inputFocus && listsRealm && !editRule',
};
const rulesRealm = {
  condition: '!inputFocus && !listsRealm && !editRule',
};
keyboardService.register(shortcutMap.copy, listActions.selCopy, listsRealm);
keyboardService.register(shortcutMap.copy, ruleActions.selCopy, rulesRealm);
keyboardService.register(shortcutMap.cut, listActions.selCut, listsRealm);
keyboardService.register(shortcutMap.cut, ruleActions.selCut, rulesRealm);
keyboardService.register(shortcutMap.paste, selPaste, {
  condition: '!inputFocus && !editRule',
});
keyboardService.register(
  shortcutMap.duplicate,
  ruleActions.selDuplicate,
  rulesRealm
);
keyboardService.register(shortcutMap.remove, listActions.selRemove, listsRealm);
keyboardService.register(shortcutMap.remove, ruleActions.selRemove, rulesRealm);
keyboardService.register(shortcutMap.add, ruleActions.new, rulesRealm);
keyboardService.register('up', ruleKeys.up, rulesRealm);
keyboardService.register('down', ruleKeys.down, rulesRealm);
keyboardService.register('space', ruleKeys.space, rulesRealm);
keyboardService.register(shortcutMap.edit, ruleActions.selEdit, rulesRealm);
keyboardService.register('esc', ruleActions.selClear, rulesRealm);
keyboardService.register('esc', ruleActions.cancel, { condition: 'editRule' });
keyboardService.register('esc', listActions.cancel, {
  condition: 'listModal',
});

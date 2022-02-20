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
} from './store';
import {
  dump,
  loadFile,
  blob2Text,
  editList,
  setRoute,
  setStatus,
  remove,
  getName,
  isRoute,
  downloadBlob,
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
      dump(pick(list, ['name', 'type', 'rules']) as Partial<ListData>);
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
  /*
  export(item?: ListData) {
    item ||= currentList.value;
    const data = {
      type: item.type,
      name: getName(item),
      rules: item.rules,
    };
    const basename = data.name.replace(/\s+/g, '-').toLowerCase();
    const blob = new Blob([JSON.stringify(data)], {
      type: 'application/json',
    });
    downloadBlob(blob, `${basename}.json`);
  },
  */
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
    listSelection.activeIndex = -1;
    listSelection.count = 0;
    listSelection.selected.length = 0;
  },
  selToggle(
    type: ListData['type'],
    index: number,
    event: { cmdCtrl: boolean; shift: boolean }
  ) {
    if (listSelection.activeType !== type) {
      listSelection.activeType = type;
      listActions.selClear();
    }
    if (event.shift && listSelection.activeIndex >= 0) {
      listSelection.selected = [];
      const start = Math.min(listSelection.activeIndex, index);
      const end = Math.max(listSelection.activeIndex, index);
      for (let i = start; i <= end; i += 1) {
        listSelection.selected[i] = true;
      }
      listSelection.count = end - start + 1;
      return;
    }
    if (event.cmdCtrl) {
      if ((listSelection.selected[index] = !listSelection.selected[index])) {
        listSelection.count += 1;
      } else {
        listSelection.count -= 1;
      }
    } else {
      listSelection.selected = [];
      listSelection.selected[index] = true;
      listSelection.count = 1;
    }
    listSelection.activeIndex = index;
  },
  selRemove() {
    if (!listSelection.count) return;
    store.lists[listSelection.activeType]?.forEach((item, i) => {
      if (listSelection.selected[i]) listActions.remove(item);
    });
    listActions.selClear();
  },
  selCopy() {
    if (!listSelection.count) return;
    const lists = store.lists[listSelection.activeType]?.filter(
      (_, index) => listSelection.selected[index]
    );
    if (!lists?.length) return;
    const data: ListsDumpData = {
      provider: PROVIDER,
      category: 'lists',
      data: lists,
    };
    navigator.clipboard.writeText(JSON.stringify(data));
  },
  selCut() {
    if (!listSelection.count) return;
    listActions.selCopy();
    listActions.selRemove();
  },
  async selPaste() {
    let data: ListsDumpData;
    try {
      const raw = await navigator.clipboard.readText();
      data = raw && JSON.parse(raw);
      if (data.provider !== PROVIDER || data.category !== 'lists')
        throw new Error('Invalid clipboard data');
    } catch {
      return;
    }
    data.data.forEach((list) => {
      dump(pick(list, ['name', 'type', 'rules']) as Partial<ListData>);
    });
  },
  selExport() {
    if (!listSelection.count) return;
    const result = [];
    store.lists[listSelection.activeType]?.forEach((item, i) => {
      if (listSelection.selected[i]) {
        result.push({
          type: item.type,
          name: getName(item),
          rules: item.rules,
        });
      }
    });
    if (!result.length) return;
    const basename =
      result.length === 1
        ? result[0].name.replace(/\s+/g, '-').toLowerCase()
        : `request-x-export-${Date.now()}`;
    const blob = new Blob(
      [JSON.stringify(result.length === 1 ? result[0] : result)],
      {
        type: 'application/json',
      }
    );
    downloadBlob(blob, `${basename}.json`);
  },
  selToggleStatus() {
    if (!listSelection.count) return;
    const lists = store.lists[listSelection.activeType];
    const selected = lists.filter((_, i) => listSelection.selected[i]);
    const enabled = selected.some((list) => !list.enabled);
    selected.forEach((list) => {
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
  async selPaste() {
    if (!listEditable.value) return;
    let data: RulesDumpData;
    try {
      const raw = await navigator.clipboard.readText();
      data = raw && JSON.parse(raw);
      if (
        data.provider !== PROVIDER ||
        data.category !== 'rules' ||
        !data.data.type ||
        !data.data.rules?.length
      )
        throw new Error('Invalid clipboard data');
    } catch {
      return;
    }
    if (data.data.type !== currentList.value.type)
      throw new Error('Incompatible rule type');
    const rules = currentList.value.rules as RuleData[];
    rules.splice(
      ruleSelection.active < 0 ? rules.length : ruleSelection.active,
      0,
      ...(data.data.rules as RuleData[])
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
        listActions.selToggle(currentList.value.type, index, {
          cmdCtrl: false,
          shift: false,
        });
      }
    } else {
      listActions.selClear();
    }
  }
);

const noInput = {
  condition: '!inputFocus',
};
const noEdit = {
  condition: '!editRule',
};
keyboardService.register(shortcutMap.copy, ruleActions.selCopy, noInput);
keyboardService.register(shortcutMap.cut, ruleActions.selCut, noInput);
keyboardService.register(shortcutMap.paste, ruleActions.selPaste, noInput);
keyboardService.register(
  shortcutMap.duplicate,
  ruleActions.selDuplicate,
  noInput
);
keyboardService.register(shortcutMap.remove, ruleActions.selRemove, noInput);
keyboardService.register(shortcutMap.add, ruleActions.new, noInput);
keyboardService.register('up', ruleKeys.up, noEdit);
keyboardService.register('down', ruleKeys.down, noEdit);
keyboardService.register('space', ruleKeys.space, noEdit);
keyboardService.register(shortcutMap.edit, ruleActions.selEdit, noEdit);
keyboardService.register('esc', ruleActions.selClear, noEdit);
keyboardService.register('esc', ruleActions.cancel, { condition: 'editRule' });

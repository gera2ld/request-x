import { watch } from 'vue';
import { debounce, pick } from 'lodash-es';
import browser from '#/common/browser';
import { keyboardService } from '#/common/keyboard';
import { ClipboardRuleData, ListData, RuleData } from '#/types';
import {
  store,
  ruleSelection,
  currentList,
  listEditable,
  ruleState,
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
    const data = JSON.parse(text);
    data.type ??= 'request';
    dump(pick(data, ['name', 'type', 'rules']));
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
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.download = `${basename}.json`;
    a.href = url;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url));
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
    const data: ClipboardRuleData = {
      provider: PROVIDER,
      type: currentList.value.type,
      rules,
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
    let data: ClipboardRuleData;
    try {
      const raw = await navigator.clipboard.readText();
      data = raw && JSON.parse(raw);
    } catch {
      return;
    }
    if (data.provider !== PROVIDER || !data.type || !data.rules?.length)
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

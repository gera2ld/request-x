<template>
  <div class="flex flex-col" v-if="current">
    <div class="rule-list-header">
      <template v-if="editable">
        <button class="mr-2" @click.prevent="onNew">+ Add new rule</button>
      </template>
      <div v-else class="text-zinc-600 mr-2">
        You must fork this list before making changes to it
      </div>
      <VlDropdown align="right" :closeAfterClick="true">
        <template v-slot:toggle>
          <button>Rule Actions &#8227;</button>
        </template>
        <div class="dropdown-menu">
          <div
            class="flex"
            :class="{
              disabled:
                selection.active < 0 ||
                selection.active >= current.rules.length,
            }"
            @click.prevent="onSelEdit"
          >
            <div class="flex-1">Edit / View detail</div>
            <div class="shortcut" v-text="shortcutTextMap.edit"></div>
          </div>
          <div class="sep"></div>
          <div
            class="flex"
            :class="{ disabled: !selection.count }"
            @click.prevent="onSelCopy"
          >
            <div class="flex-1">Copy</div>
            <div class="shortcut" v-text="shortcutTextMap.copy"></div>
          </div>
          <div
            class="flex"
            :class="{ disabled: !editable || !selection.count }"
            @click.prevent="onSelCut"
          >
            <div class="flex-1">Cut</div>
            <div class="shortcut" v-text="shortcutTextMap.cut"></div>
          </div>
          <div
            class="flex"
            :class="{ disabled: !editable }"
            @click.prevent="onSelPaste"
          >
            <div class="flex-1">Paste</div>
            <div class="shortcut" v-text="shortcutTextMap.paste"></div>
          </div>
          <div
            class="flex"
            :class="{ disabled: !editable || !selection.count }"
            @click.prevent="onSelDuplicate"
          >
            <div class="flex-1">Duplicate</div>
            <div class="shortcut" v-text="shortcutTextMap.duplicate"></div>
          </div>
          <div class="sep"></div>
          <div
            class="flex"
            :class="{ disabled: !editable || !selection.count }"
            @click.prevent="onSelRemove"
          >
            <div class="flex-1">Remove</div>
            <div class="shortcut" v-text="shortcutTextMap.remove"></div>
          </div>
        </div>
      </VlDropdown>
      <div class="flex-1"></div>
      <div class="input ml-2 mr-2">
        <input type="search" v-model="filter" />
        <svg class="input-icon" viewBox="0 0 24 24">
          <path
            d="M10 4c8 0 8 12 0 12c-8 0 -8 -12 0 -12m0 1c-6 0 -6 10 0 10c6 0 6 -10 0 -10zm4 8l6 6l-1 1l-6 -6z"
          />
        </svg>
      </div>
      <VlDropdown align="right" :closeAfterClick="true">
        <template v-slot:toggle>
          <button>List Actions &#8227;</button>
        </template>
        <div class="dropdown-menu">
          <div
            @click.prevent="onToggle"
            v-text="current.enabled ? 'Disable' : 'Enable'"
          ></div>
          <div @click.prevent="onListEdit">Edit</div>
          <div @click.prevent="onListFetch" v-if="current.subscribeUrl">
            Fetch
          </div>
          <div @click.prevent="onListFork">Fork</div>
          <div @click.prevent="onListExport">Export</div>
          <div class="sep"></div>
          <div @click.prevent="onListRemove">Remove</div>
        </div>
      </VlDropdown>
    </div>
    <div class="flex-1 pt-1 overflow-y-auto">
      <component
        v-for="(rule, index) in current.rules"
        :is="RuleItem"
        :key="index"
        :rule="rule"
        :showDetail="editing === index"
        :editable="editable"
        v-show="filtered[index]"
        :selected="selection.selected[index]"
        @submit="onSubmit(index, $event)"
        @cancel="onCancel"
        @select="onSelToggle(index, $event)"
        @dblclick="onEdit(index)"
        class="rule-item"
        :class="{ 'rule-item-active': index === selection.active }"
      />
      <component
        :is="RuleItem"
        v-if="newRule"
        :rule="newRule"
        :showDetail="true"
        :editable="true"
        @submit="onSubmit(-1, $event)"
        @cancel="onCancel"
      />
    </div>
    <footer>
      <div class="mb-1 truncate text-zinc-500" v-if="current.subscribeUrl">
        Subscribed from:
        <span v-text="current.subscribeUrl"></span>
      </div>
      <div
        class="mb-1 text-zinc-500"
        v-if="current.subscribeUrl && current.lastUpdated"
      >
        Last updated at:
        <span v-text="new Date(current.lastUpdated).toLocaleString()"></span>
      </div>
      <div>
        <div class="rule-label" v-if="current.subscribeUrl">Subscribed</div>
        <div class="rule-label disabled" v-if="!current.enabled">Disabled</div>
      </div>
    </footer>
  </div>
</template>

<script lang="ts">
import {
  computed,
  defineComponent,
  ref,
  watch,
  onMounted,
  reactive,
} from 'vue';
import { debounce, pick } from 'lodash-es';
import VlDropdown from 'vueleton/lib/dropdown';
import browser from '#/common/browser';
import { keyboardService, isMacintosh, reprShortcut } from '#/common/keyboard';
import { RuleData, ListData } from '#/types';
import { store, dump, remove, getName, setRoute, setStatus } from '../util';
import RequestItem from './request-item.vue';
import CookieItem from './cookie-item.vue';

const ruleItemMap = {
  request: RequestItem,
  cookie: CookieItem,
};

const PROVIDER = 'Request X';

const shortcutMap = {
  copy: 'ctrlcmd-c',
  cut: 'ctrlcmd-x',
  paste: 'ctrlcmd-v',
  duplicate: 'ctrlcmd-d',
  remove: isMacintosh ? 'm-backspace' : 's-delete',
  edit: 'e',
};
const shortcutTextMap = Object.entries(shortcutMap).reduce(
  (map, [key, value]) => {
    map[key] = reprShortcut(value);
    return map;
  },
  {}
);

interface ClipboardRuleData {
  provider: string;
  type: ListData['type'];
  rules: RuleData[];
}

export default defineComponent({
  components: {
    VlDropdown,
  },
  setup() {
    const filter = ref('');
    const filtered = reactive<boolean[]>([]);
    const selection = reactive<{
      active: number;
      count: number;
      selected: boolean[];
    }>({
      active: -1,
      count: 0,
      selected: [],
    });

    const type = computed<ListData['type']>(
      () => store.route[1] as ListData['type']
    );

    const RuleItem = computed(() => ruleItemMap[type.value]);

    const current = computed<ListData>(() => {
      const [page, , sid] = store.route;
      if (page !== 'lists') return null;
      const id = +sid;
      const list = store.lists[type.value]?.find((item) => item.id === id);
      return list;
    });

    const editable = computed(
      () => current.value && !current.value.subscribeUrl
    );

    const labelToggle = computed(() =>
      current.value?.enabled ? 'Disable' : 'Enable'
    );

    const newRule = ref<Partial<RuleData>>(null);

    const editing = ref<number>(-1);

    const onNew = () => {
      newRule.value = {};
      editing.value = current.value.rules.length;
    };

    const onEdit = (index = -1) => {
      newRule.value = null;
      editing.value = index;
      onSelClear();
    };

    const onCancel = () => {
      const active = editing.value;
      onEdit();
      selection.active = active;
    };

    const onSubmit = (index: number, { rule }: { rule: RuleData }) => {
      const rules = current.value.rules as RuleData[];
      if (index < 0) {
        rules.push(rule);
      } else {
        rules[index] = rule;
      }
      save();
      onCancel();
    };

    const save = () => {
      dump(pick(current.value, ['id', 'type', 'rules']) as Partial<ListData>);
    };

    const onListEdit = () => {
      store.editList = {
        type: type.value,
        ...current.value,
        editing: true,
      };
    };

    const onListSubmit = ({ title, subscribeUrl }) => {
      Object.assign(current.value, {
        title,
        subscribeUrl,
      });
      dump({
        id: current.value.id,
        title,
        subscribeUrl,
      });
    };

    const onListFetch = () => {
      const { id } = current.value;
      browser.runtime.sendMessage({
        cmd: 'FetchList',
        data: { type: type.value, id },
      });
    };

    const onListRemove = () => {
      remove(type.value, current.value.id);
    };

    const onListExport = () => {
      const data = {
        type: type.value,
        name: getName(current.value),
        rules: current.value.rules,
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
    };

    const onListFork = async () => {
      const data = {
        type: type.value,
        name: `${current.value.name || 'No name'} (forked)`,
        rules: current.value.rules,
      };
      const id = await dump(data as Partial<ListData>);
      setRoute(`lists/${id}`);
    };

    const onToggle = () => {
      setStatus(current.value, !current.value.enabled);
    };

    const onSelToggle = (
      index: number,
      event: { cmdCtrl: boolean; shift: boolean }
    ) => {
      if (event.shift && selection.active >= 0) {
        selection.selected = [];
        const start = Math.min(selection.active, index);
        const end = Math.max(selection.active, index);
        for (let i = start; i <= end; i += 1) {
          selection.selected[i] = true;
        }
        selection.count = end - start + 1;
        return;
      }
      if (event.cmdCtrl) {
        if ((selection.selected[index] = !selection.selected[index])) {
          selection.count += 1;
        } else {
          selection.count -= 1;
        }
      } else {
        selection.selected = [];
        selection.selected[index] = true;
        selection.count = 1;
      }
      selection.active = index;
    };

    const onSelClear = () => {
      selection.active = -1;
      selection.count = 0;
      selection.selected.length = 0;
    };

    const onSelRemove = () => {
      if (!editable.value) return;
      current.value.rules = (current.value.rules as RuleData[]).filter(
        (_, index) => !selection.selected[index]
      ) as ListData['rules'];
      onSelClear();
      save();
    };

    const onSelDuplicate = () => {
      if (!editable.value) return;
      const rules: RuleData[] = [];
      const selected: boolean[] = [];
      let offset = 0;
      current.value.rules.forEach((rule: RuleData, index: number) => {
        rules.push(rule);
        if (selection.selected[index]) {
          rules.push(rule);
          offset += 1;
          selected[index + offset] = true;
        }
      });
      current.value.rules = rules as ListData['rules'];
      save();
      selection.count = offset * 2;
      selection.selected = selected;
      updateList();
    };

    const onSelCopy = () => {
      if (!selection.count) return;
      const rules = (current.value?.rules as RuleData[])?.filter(
        (_, index) => selection.selected[index]
      );
      if (!rules?.length) return;
      const data: ClipboardRuleData = {
        provider: PROVIDER,
        type: type.value,
        rules,
      };
      navigator.clipboard.writeText(JSON.stringify(data));
    };

    const onSelCut = () => {
      if (!editable.value) return;
      onSelCopy();
      onSelRemove();
    };

    const onSelPaste = async () => {
      if (!editable.value) return;
      let data: ClipboardRuleData;
      try {
        const raw = await navigator.clipboard.readText();
        data = raw && JSON.parse(raw);
      } catch {
        return;
      }
      if (data.provider !== PROVIDER || !data.type || !data.rules?.length)
        throw new Error('Invalid clipboard data');
      if (data.type !== type.value) throw new Error('Incompatible rule type');
      const rules = current.value.rules as RuleData[];
      rules.splice(
        selection.active < 0 ? rules.length : selection.active,
        0,
        ...(data.rules as RuleData[])
      );
      save();
    };

    const onKeyUp = () => {
      selection.active = Math.max(0, selection.active - 1);
    };

    const onKeyDown = () => {
      selection.active = Math.min(
        current.value.rules.length - 1,
        selection.active + 1
      );
    };

    const onKeySpace = () => {
      onSelToggle(selection.active, { cmdCtrl: true, shift: false });
    };

    const onSelEdit = () => {
      onEdit(selection.active);
    };

    const updateList = () => {
      const rules = current.value?.rules as RuleData[];
      if (!rules) return;
      filtered.length = rules.length;
      selection.active = -1;
      selection.count = 0;
      selection.selected.length = rules.length;
      rules.forEach((rule, index) => {
        filtered[index] = !filter.value || rule.url?.includes(filter.value);
        if (!filtered[index]) selection.selected[index] = false;
        if (selection.selected[index]) selection.count += 1;
      });
    };
    const updateListLater = debounce(updateList, 200);

    watch(current, (cur, prev) => {
      updateList();
      if (cur?.id !== prev?.id) onCancel();
    });
    watch(filter, updateListLater);
    watch(editing, () => {
      keyboardService.setContext('editRule', editing.value >= 0);
    });

    onMounted(() => {
      updateList();
      const noInput = {
        condition: '!inputFocus',
      };
      const noEdit = {
        condition: '!editRule',
      };
      const disposeList = [
        keyboardService.register(shortcutMap.copy, onSelCopy, noInput),
        keyboardService.register(shortcutMap.cut, onSelCut, noInput),
        keyboardService.register(shortcutMap.paste, onSelPaste, noInput),
        keyboardService.register(
          shortcutMap.duplicate,
          onSelDuplicate,
          noInput
        ),
        keyboardService.register(shortcutMap.remove, onSelRemove, noInput),
        keyboardService.register('up', onKeyUp, noEdit),
        keyboardService.register('down', onKeyDown, noEdit),
        keyboardService.register('space', onKeySpace, noEdit),
        keyboardService.register(shortcutMap.edit, onSelEdit, noEdit),
        keyboardService.register('esc', onSelClear, noEdit),
        keyboardService.register('esc', onCancel, { condition: 'editRule' }),
      ];
      keyboardService.enable();
      return () => {
        disposeList.forEach((dispose) => dispose());
        keyboardService.disable();
      };
    });

    return {
      RuleItem,
      shortcutTextMap,
      filter,
      filtered,
      selection,
      store,
      type,
      current,
      editable,
      labelToggle,
      editing,
      newRule,
      onNew,
      onEdit,
      onCancel,
      onListEdit,
      onListSubmit,
      onListFetch,
      onListRemove,
      onListExport,
      onListFork,
      onSubmit,
      onToggle,
      onSelToggle,
      onSelClear,
      onSelRemove,
      onSelCopy,
      onSelCut,
      onSelPaste,
      onSelDuplicate,
      onSelEdit,
    };
  },
});
</script>

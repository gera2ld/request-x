<template>
  <div class="flex flex-col" v-if="current">
    <div class="rule-list-header">
      <template v-if="!current.subscribeUrl">
        <button class="mr-2" @click.prevent="onNew">+ Add new rule</button>
        <VlDropdown align="right" :closeAfterClick="true">
          <template v-slot:toggle>
            <button :disabled="!selection.count">Rule Actions &#8227;</button>
          </template>
          <div class="dropdown-menu">
            <div class="flex" @click.prevent="onSelCopy">
              <div class="flex-1">Copy</div>
              <div class="shortcut" v-text="shortcutTextMap.copy"></div>
            </div>
            <div class="flex" @click.prevent="onSelCut">
              <div class="flex-1">Cut</div>
              <div class="shortcut" v-text="shortcutTextMap.cut"></div>
            </div>
            <div class="flex" @click.prevent="onSelPaste">
              <div class="flex-1">Paste</div>
              <div class="shortcut" v-text="shortcutTextMap.paste"></div>
            </div>
            <div class="flex" @click.prevent="onSelDuplicate">
              <div class="flex-1">Duplicate</div>
              <div class="shortcut" v-text="shortcutTextMap.duplicate"></div>
            </div>
            <div class="sep"></div>
            <div class="flex" @click.prevent="onSelRemove">
              <div class="flex-1">Remove</div>
              <div class="shortcut" v-text="shortcutTextMap.remove"></div>
            </div>
          </div>
        </VlDropdown>
      </template>
      <div v-else class="text-gray-600">
        You must fork this list before making changes to it
      </div>
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
    <div class="flex-1 pt-1 overflow-y-auto" @mousedown="onSelClear">
      <component
        v-for="(rule, index) in current.rules"
        :is="RuleItem"
        :key="index"
        :rule="rule"
        :editing="editing === rule"
        v-show="filtered[index]"
        :selected="selection.selected[index]"
        @submit="onSubmit(index, $event)"
        @cancel="onCancel"
        @toggleSelect="onSelToggle(index, $event)"
      >
        <template #buttons>
          <div class="ml-1" v-if="editable">
            <button class="py-0 mr-1" @click="onEdit(rule)">Edit</button>
          </div>
        </template>
      </component>
      <component
        :is="RuleItem"
        v-if="newRule"
        :rule="newRule"
        :editing="true"
        @submit="onSubmit(-1, $event)"
        @cancel="onCancel"
      />
    </div>
    <footer>
      <div class="mb-1 truncate text-gray-500" v-if="current.subscribeUrl">
        Subscribed from:
        <span v-text="current.subscribeUrl"></span>
      </div>
      <div
        class="mb-1 text-gray-500"
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
  watchEffect,
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
      last: number;
      count: number;
      selected: boolean[];
    }>({
      last: -1,
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

    const editing = ref<RuleData>(null);

    const onNew = () => {
      newRule.value = {};
      editing.value = newRule.value as RuleData;
    };

    const onEdit = (rule?: RuleData) => {
      newRule.value = null;
      editing.value = rule;
    };

    const onCancel = () => {
      onEdit();
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
      if (event.shift && selection.last >= 0) {
        selection.selected = [];
        const start = Math.min(selection.last, index);
        const end = Math.max(selection.last, index);
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
      selection.last = index;
    };

    const onSelClear = () => {
      selection.last = -1;
      selection.count = 0;
      selection.selected.length = 0;
    };

    const onSelRemove = () => {
      current.value.rules = (current.value.rules as RuleData[]).filter(
        (_, index) => !selection.selected[index]
      ) as ListData['rules'];
      onSelClear();
      save();
    };

    const onSelDuplicate = () => {
      const rules: RuleData[] = [];
      const selected: boolean[] = [];
      let offset = 0;
      current.value.rules.forEach((rule: RuleData, index: number) => {
        rules.push(rule);
        if (selection.selected[index]) {
          rules.push(rule);
          selected[index + offset] = true;
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
      onSelCopy();
      onSelRemove();
    };

    const onSelPaste = async () => {
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
        selection.last < 0 ? rules.length : selection.last,
        0,
        ...(data.rules as RuleData[])
      );
      save();
    };

    const updateList = () => {
      const rules = current.value?.rules as RuleData[];
      if (!rules) return;
      filtered.length = rules.length;
      selection.last = -1;
      selection.count = 0;
      selection.selected.length = rules.length;
      rules.forEach((rule, index) => {
        filtered[index] = !filter.value || rule.url?.includes(filter.value);
        if (!filtered[index]) selection.selected[index] = false;
        if (selection.selected[index]) selection.count += 1;
      });
    };
    const updateListLater = debounce(updateList, 200);

    watchEffect(onCancel);

    watch(current, () => {
      onCancel();
      updateList();
    });
    watch(filter, updateListLater);

    onMounted(() => {
      updateList();
      const noInput = {
        condition: '!inputFocus',
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
      onSelDuplicate,
    };
  },
});
</script>

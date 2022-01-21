<template>
  <div class="flex flex-col" v-if="current">
    <div class="rule-list-header">
      <button v-if="!current.subscribeUrl" @click.prevent="onNew">
        + Add new rule
      </button>
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
          <button>Actions &#8227;</button>
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
        v-for="(rule, index) in filteredRules"
        :is="RuleItem"
        :key="index"
        :rule="rule"
        :extra="index"
        :editable="editable"
        :editing="editing === rule"
        @submit="onSubmit"
        @cancel="onCancel"
      >
        <template #buttons>
          <div class="ml-1" v-if="editable">
            <button class="py-0 mr-1" @click="onEdit(rule)">Edit</button>
            <VlDropdown align="right" :closeAfterClick="true">
              <template v-slot:toggle>
                <button class="py-0">&mldr;</button>
              </template>
              <div class="dropdown-menu w-24">
                <div @click.prevent="onDuplicate(index)">Duplicate</div>
                <div @click.prevent="onRemove(index)">Remove</div>
              </div>
            </VlDropdown>
          </div>
        </template>
      </component>
      <component
        :is="RuleItem"
        v-if="newRule"
        :rule="newRule"
        :editing="true"
        :extra="-1"
        @submit="onSubmit"
        @cancel="onCancel"
      />
    </div>
    <footer>
      <div class="mb-1 truncate text-gray-500" v-if="current.subscribeUrl">
        Subscribed from:
        <span class="text-gray-900" v-text="current.subscribeUrl"></span>
      </div>
      <div
        class="mb-1 text-gray-500"
        v-if="current.subscribeUrl && current.lastUpdated"
      >
        Last updated at:
        <span
          class="text-gray-900"
          v-text="new Date(current.lastUpdated).toLocaleString()"
        ></span>
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
} from 'vue';
import { debounce, pick } from 'lodash-es';
import VlDropdown from 'vueleton/lib/dropdown';
import browser from '#/common/browser';
import { RuleData, ListData } from '#/types';
import { store, dump, remove, getName, setRoute, setStatus } from '../util';
import RequestItem from './request-item.vue';
import CookieItem from './cookie-item.vue';

const ruleItemMap = {
  request: RequestItem,
  cookie: CookieItem,
};

export default defineComponent({
  components: {
    VlDropdown,
  },
  setup() {
    const filter = ref('');
    const filteredRules = ref<RuleData[]>([]);

    const type = computed<ListData['type']>(
      () => store.route[1] as ListData['type']
    );

    const RuleItem = computed(() => ruleItemMap[type.value]);

    const current = computed(() => {
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

    const onDuplicate = (index: number) => {
      const rules = current.value.rules as RuleData[];
      const rule = { ...rules[index] } as RuleData;
      rules.splice(index, 0, rule);
      save();
    };

    const onRemove = (index: number) => {
      const { rules } = current.value;
      rules.splice(index, 1);
      save();
    };

    const onSubmit = ({ extra, rule }: { extra: number; rule: RuleData }) => {
      const rules = current.value.rules as RuleData[];
      if (extra < 0) {
        rules.push(rule);
      } else {
        rules[extra] = rule;
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

    const updateList = () => {
      let rules = current.value?.rules as RuleData[];
      if (rules && filter.value) {
        rules = rules.filter((rule) => rule.url?.includes(filter.value));
      }
      filteredRules.value = rules;
    };
    const updateListLater = debounce(updateList, 200);

    watchEffect(onCancel);

    watch(current, () => {
      onCancel();
      updateList();
    });
    watch(filter, updateListLater);

    onMounted(updateList);

    return {
      RuleItem,
      filter,
      filteredRules,
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
      onDuplicate,
      onRemove,
      onListEdit,
      onListSubmit,
      onListFetch,
      onListRemove,
      onListExport,
      onListFork,
      onSubmit,
      onToggle,
    };
  },
});
</script>

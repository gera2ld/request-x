<template>
  <div class="rule flex flex-col" v-if="current">
    <div class="flex items-center p-1 border-b border-gray-200">
      <button v-if="!current.subscribeUrl" @click.prevent="onNew">
        Add new rule
      </button>
      <div v-else class="text-gray-600">
        You may fork this list before making changes to it
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
          <div @click.prevent="onListFork" v-if="current.subscribeUrl">
            Fork
          </div>
          <div @click.prevent="onListExport">Export</div>
          <div class="sep"></div>
          <div @click.prevent="onListRemove">Remove</div>
        </div>
      </VlDropdown>
    </div>
    <div class="flex-1 pt-1 overflow-y-auto">
      <rule-item
        v-for="(rule, index) in filteredRules"
        :key="index"
        :rule="rule"
        :extra="index"
        :editable="editable"
        :editing="editing === rule"
        @edit="onEdit(rule)"
        @remove="onRemove(index)"
        @submit="onSubmit"
        @cancel="onCancel"
      />
      <rule-item
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
import { RuleData } from '#/types';
import { store, dump, remove, getName, setRoute, setStatus } from '../util';
import RuleItem from './rule-item.vue';

export default defineComponent({
  components: {
    VlDropdown,
    RuleItem,
  },
  setup() {
    const filter = ref('');
    const filteredRules = ref<RuleData[]>([]);

    const current = computed(() => {
      const { group, id } = store.route;
      if (group === 'lists') {
        return store.lists.find((item) => `${item.id}` === `${id}`);
      }
      return null;
    });

    const editable = computed(
      () => current.value && !current.value.subscribeUrl
    );

    const labelToggle = computed(() =>
      current.value?.enabled ? 'Disable' : 'Enable'
    );

    const newRule = ref<{ editable: boolean } & Partial<RuleData>>(null);

    const editing = ref<RuleData>(null);

    const onNew = () => {
      newRule.value = {
        editable: false,
      };
      editing.value = newRule.value as RuleData;
    };

    const onEdit = (rule?: RuleData) => {
      newRule.value = null;
      editing.value = rule;
    };

    const onCancel = () => {
      onEdit();
    };

    const onRemove = (index: number) => {
      const { rules } = current.value;
      rules.splice(index, 1);
      save();
    };

    const onSubmit = ({
      extra,
      input: { method, url, target, headers },
    }: {
      extra: number;
      input: {
        method: string;
        url: string;
        target: string;
        headers: string;
      };
    }) => {
      const headerPairs = headers
        .split('\n')
        .filter(Boolean)
        .map((line: string) => {
          let i = line.indexOf(':');
          if (i < 0) i = line.length;
          const key = line.slice(0, i).trim();
          const value = line.slice(i + 1).trim();
          return [key, value] as [string, string];
        });
      const rule: RuleData = {
        method,
        url,
        target,
        headers: headerPairs,
      };
      const { rules } = current.value;
      if (extra < 0) {
        rules.push(rule);
      } else {
        rules[extra] = rule;
      }
      save();
      onCancel();
    };

    const save = () => {
      dump(pick(current.value, ['id', 'rules']));
    };

    const onListEdit = () => {
      store.editList = {
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
      browser.runtime.sendMessage({
        cmd: 'FetchList',
        data: current.value.id,
      });
    };

    const onListRemove = () => {
      remove(current.value.id);
    };

    const onListExport = () => {
      const data = {
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
        name: `${current.value.name || 'No name'} (forked)`,
        rules: current.value.rules,
      };
      const id = await dump(data);
      setRoute(`lists/${id}`);
    };

    const onToggle = () => {
      setStatus(current.value, !current.value.enabled);
    };

    const updateList = () => {
      let rules = current.value?.rules;
      if (rules && filter.value) {
        rules = rules.filter((rule) => rule.url?.includes(filter.value));
      }
      filteredRules.value = rules;
    };
    const updateListLater = debounce(updateList, 200);

    watchEffect(onCancel);

    watch([current, filter], updateListLater);

    onMounted(updateList);

    return {
      filter,
      filteredRules,
      store,
      current,
      editable,
      labelToggle,
      editing,
      newRule,
      onNew,
      onEdit,
      onCancel,
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

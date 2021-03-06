<template>
  <div class="rule flex flex-col" v-if="current">
    <div class="flex items-center p-1 border-b border-gray-200">
      <button v-if="!current.subscribeUrl" @click.prevent="onNew">Add new rule</button>
      <div v-else class="text-gray-600">You may fork this list before making changes to it</div>
      <div class="flex-1"></div>
      <div class="input ml-2 mr-2">
        <input type="search" v-model="filter">
        <svg class="input-icon" viewBox="0 0 24 24">
          <path d="M10 4c8 0 8 12 0 12c-8 0 -8 -12 0 -12m0 1c-6 0 -6 10 0 10c6 0 6 -10 0 -10zm4 8l6 6l-1 1l-6 -6z" />
        </svg>
      </div>
      <vl-dropdown align="right" :closeAfterClick="true">
        <button slot="toggle">Actions &#8227;</button>
        <div class="dropdown-menu">
          <div @click.prevent="onToggle" v-text="current.enabled ? 'Disable' : 'Enable'"></div>
          <div @click.prevent="onListEdit">Edit</div>
          <div @click.prevent="onListFetch" v-if="current.subscribeUrl">Fetch</div>
          <div @click.prevent="onListFork" v-if="current.subscribeUrl">Fork</div>
          <div @click.prevent="onListExport">Export</div>
          <div class="sep"></div>
          <div @click.prevent="onListRemove">Remove</div>
        </div>
      </vl-dropdown>
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
      <div class="mb-1 text-gray-500" v-if="current.subscribeUrl && current.lastUpdated">
        Last updated at:
        <span class="text-gray-900" v-text="new Date(current.lastUpdated).toLocaleString()"></span>
      </div>
      <div>
        <div class="rule-label" v-if="current.subscribeUrl">Subscribed</div>
        <div class="rule-label disabled" v-if="!current.enabled">Disabled</div>
      </div>
    </footer>
  </div>
</template>

<script>
import Vue from 'vue';
import {
  store, dump, remove, getName, setRoute, debounce, setStatus,
} from '../util';
import RuleItem from './rule-item.vue';

export default {
  components: {
    RuleItem,
  },
  data() {
    return {
      store,
      editing: null,
      newRule: null,
      filter: '',
      filteredRules: null,
    };
  },
  watch: {
    current() {
      this.onCancel();
      this.updateList();
    },
    filter() {
      this.debouncedUpdateList();
    },
  },
  computed: {
    current() {
      const { group, id } = this.store.route;
      if (group === 'lists') {
        const current = this.store.lists.find(item => `${item.id}` === `${id}`);
        return current;
      }
      return null;
    },
    editable() {
      return this.current && !this.current.subscribeUrl;
    },
    labelToggle() {
      return this.current?.enabled ? 'Disable' : 'Enable';
    },
  },
  methods: {
    onNew() {
      this.newRule = {
        editable: false,
      };
      this.editing = this.newRule;
    },
    onEdit(rule) {
      this.newRule = null;
      this.editing = rule;
    },
    onCancel() {
      this.onEdit();
    },
    onRemove(index) {
      const { current: { rules } } = this;
      rules.splice(index, 1);
      this.save();
    },
    onSubmit({ extra, input: { method, url, target } }) {
      const rule = {
        method,
        url,
        target,
      };
      const { current: { rules } } = this;
      if (extra < 0) {
        rules.push(rule);
      } else {
        Vue.set(rules, extra, rule);
      }
      this.save();
      this.onCancel();
    },
    save() {
      const { current } = this;
      dump({
        id: current.id,
        rules: current.rules,
      });
    },
    onListEdit() {
      const { current } = this;
      this.store.editList = {
        ...current,
        editing: true,
      };
    },
    onListSubmit({ title, subscribeUrl }) {
      const { current } = this;
      Object.assign(current, {
        title,
        subscribeUrl,
      });
      dump({
        id: current.id,
        title,
        subscribeUrl,
      });
      this.onListCancel();
    },
    onListFetch() {
      const { current } = this;
      browser.runtime.sendMessage({
        cmd: 'FetchList',
        data: current.id,
      });
    },
    onListRemove() {
      const { current } = this;
      remove(current.id);
    },
    onListExport() {
      const { current } = this;
      const data = {
        name: getName(current) || 'No name',
        rules: current.rules,
      };
      const basename = data.name.replace(/\s+/g, '-').toLowerCase();
      const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.download = `${basename}.json`;
      a.href = url;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url));
    },
    async onListFork() {
      const { current } = this;
      const data = {
        name: `${current.name || 'No name'} (forked)`,
        rules: current.rules,
      };
      const id = await dump(data);
      setRoute(`lists/${id}`);
    },
    onToggle() {
      setStatus(this.current, !this.current.enabled);
    },
    updateList() {
      let rules = this.current?.rules;
      const { filter } = this;
      if (rules && filter) {
        rules = rules.filter(rule => rule.url?.includes(filter));
      }
      this.filteredRules = rules;
    },
  },
  created() {
    this.debouncedUpdateList = debounce(this.updateList, 200);
    this.updateList();
  },
};
</script>

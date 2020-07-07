<template>
  <div class="rule flex flex-col">
    <div class="flex items-center p-1 border-b border-gray-200">
      <button v-if="!store.current.subscribeUrl" @click.prevent="onNew">Add new rule</button>
      <div v-else class="text-gray-600">You may fork this list before making changes to it</div>
      <div class="flex-1"></div>
      <vl-dropdown align="right">
        <button slot="toggle">Manage list &#8227;</button>
        <div class="dropdown-menu">
          <div @click.prevent="onListEdit">Edit</div>
          <div @click.prevent="onListFetch" v-if="store.current.subscribeUrl">Fetch</div>
          <div @click.prevent="onListFork" v-if="store.current.subscribeUrl">Fork</div>
          <div @click.prevent="onListExport">Export</div>
          <div class="sep"></div>
          <div @click.prevent="onListRemove">Remove</div>
        </div>
      </vl-dropdown>
    </div>
    <div class="flex-1 pt-1 overflow-y-auto">
      <rule-item
        v-for="(rule, index) in store.current.rules"
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
      <div class="mb-1 truncate text-gray-500" v-if="store.current.subscribeUrl">
        Subscribed from:
        <span class="text-gray-900" v-text="store.current.subscribeUrl"></span>
      </div>
      <div class="mb-1 text-gray-500" v-if="store.current.subscribeUrl && store.current.lastUpdated">
        Last updated at:
        <span class="text-gray-900" v-text="new Date(store.current.lastUpdated).toLocaleString()"></span>
      </div>
      <div>
        <div class="rule-label" v-if="store.current.subscribeUrl">Subscribed</div>
        <div class="rule-label disabled" v-if="!store.current.enabled">Disabled</div>
      </div>
    </footer>
  </div>
</template>

<script>
import Vue from 'vue';
import {
  store, dump, remove, getName,
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
    };
  },
  watch: {
    'store.current': 'onCancel',
  },
  computed: {
    editable() {
      return !this.store.current.subscribeUrl;
    },
    labelToggle() {
      return this.store.current.enabled ? 'Disable' : 'Enable';
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
      const { current: { rules } } = this.store;
      rules.splice(index, 1);
      this.save();
    },
    onSubmit({ extra, input: { method, url, target } }) {
      const rule = {
        method,
        url,
        target,
      };
      const { current: { rules } } = this.store;
      if (extra < 0) {
        rules.push(rule);
      } else {
        Vue.set(rules, extra, rule);
      }
      this.save();
      this.onCancel();
    },
    save() {
      const { current } = this.store;
      dump({
        id: current.id,
        rules: current.rules,
      });
    },
    onListEdit() {
      const { current } = this.store;
      this.store.editList = {
        ...current,
        editing: true,
      };
    },
    onListSubmit({ title, subscribeUrl }) {
      const { current } = this.store;
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
      const { current } = this.store;
      browser.runtime.sendMessage({
        cmd: 'FetchList',
        data: current.id,
      });
    },
    onListRemove() {
      const { current } = this.store;
      remove(current.id);
    },
    onListExport() {
      const { current } = this.store;
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
  },
};
</script>

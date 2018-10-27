<template>
  <div class="rule flex flex-col">
    <div class="flex-auto">
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
      <div>
        <div class="rule-label" v-if="store.current.subscribeUrl">Subscribed</div>
        <div class="rule-label rule-label-disabled" v-if="!store.current.enabled">Disabled</div>
      </div>
      <div>
        <button v-if="!store.current.subscribeUrl" @click.prevent="onNew">Add new rule</button>
      </div>
      <div class="mt-1 nowrap" v-if="store.current.subscribeUrl">
        Subscribed from:
        <em v-text="store.current.subscribeUrl"></em>
      </div>
      <div class="mt-1" v-if="store.current.subscribeUrl && store.current.lastUpdated">
        Last updated at:
        <em v-text="new Date(store.current.lastUpdated).toLocaleString()"></em>
      </div>
    </footer>
  </div>
</template>

<script>
import Vue from 'vue';
import { store, dump } from '../utils';
import RuleItem from './rule-item';

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
    onSubmit({ extra, input: { method, url } }) {
      const rule = {
        method,
        url,
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
      this.listEditing = {
        title: current.title,
        subscribeUrl: current.subscribeUrl,
      };
    },
    onListCancel() {
      this.listEditing = null;
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
  },
};
</script>

<style>
.rule {
  padding: 8px;
  border: 1px solid #888;
  border-radius: .3rem;
  > .flex-auto {
    overflow-y: auto;
  }
  > footer {
    color: #888;
    padding: .5rem;
  }
  em {
    color: #333;
    font-style: normal;
  }
  &-label {
    display: inline-block;
    margin-right: .5rem;
    margin-bottom: .5rem;
    padding: .3rem;
    border-radius: .3rem;
    font-size: .8rem;
    text-transform: uppercase;
    background-color: #f29b34;
    color: white;
    &-disabled {
      background-color: #ee543a;
    }
  }
  .nowrap {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  button {
    margin-right: .5rem;
  }
}
</style>

<template>
  <div class="list-body">
    <div class="item" v-for="(rule, index) in currentRules">
      <div class="flex-row">
        <span class="item-method" v-text="rule.method"></span>
        <span class="item-url flex-auto" v-text="rule.url"></span>
      </div>
      <div v-if="!current.subscribeUrl">
        <button class="item-btn" @click="onEdit(index)">Edit</button>
        <button class="item-btn" @click="onRemove(index)">Remove</button>
      </div>
    </div>
  </div>
</template>

<script>
import { store, edit, dump } from '../utils';

export default {
  data() {
    return store;
  },
  methods: {
    onEdit(index) {
      const rule = this.currentRules[index];
      edit('rule', Object.assign({}, rule), { index });
    },
    onRemove(index) {
      const rules = this.currentRules.slice();
      rules.splice(index, 1);
      const list = Object.assign({ rules }, this.current);
      dump(list);
    },
  },
};
</script>

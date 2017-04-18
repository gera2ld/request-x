<template>
  <form @submit.prevent="onSave">
    <div class="flex-row">
      <input class="item-method" :class="{ error: !editing.status.method }" v-model="editing.data.method" placeholder="Method">
      <input class="item-url flex-auto" :class="{ error: !editing.status.url }" v-model="editing.data.url" placeholder="URL">
      <a href="https://developer.chrome.com/extensions/match_patterns" target=_blank>(?)</a>
    </div>
    <div>
      <button type="submit" class="item-btn">Save</button>
      <button type="button" class="item-btn" @click="onCancel">Cancel</button>
    </div>
  </form>
</template>

<script>
import { store, edit, dump } from '../utils';

export default {
  data() {
    return store;
  },
  methods: {
    onSave() {
      const data = {
        id: this.current.id,
        rules: this.currentRules.slice(),
      };
      const { method, url } = this.editing.data;
      const { index } = this.editing.extra;
      const rule = {
        url,
        method: (method || '*').toUpperCase(),
      };
      if (data.rules[index]) data.rules[index] = rule;
      else data.rules.push(rule);
      dump(data).then(() => edit());
    },
    onCancel() {
      edit();
    },
  },
};
</script>

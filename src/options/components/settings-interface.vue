<template>
  <div class="p-2" v-if="store.config">
    <label>
      Show number of handled requests on badge:
      <select :value="store.config.badge" @change="onChange('badge', $event.target.value)">
        <option value="">none</option>
        <option value="page">on current page</option>
        <option value="tab">in current tab</option>
        <option value="total">in total</option>
      </select>
    </label>
  </div>
</template>

<script>
import { store } from '../util';

export default {
  data() {
    return {
      store,
    };
  },
  methods: {
    onChange(key, value) {
      browser.runtime.sendMessage({
        cmd: 'SetConfig',
        data: { key, value },
      });
    },
  },
};
</script>

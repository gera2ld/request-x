<template>
  <div class="p-2" v-if="store.config">
    <div class="font-bold mt-4 mb-2">Options</div>
    <ul class="list-disc pl-6">
      <li>
        <label>
          Show number of handled requests on badge:
          <select :value="store.config.badge" @change="onChange('badge', $event.target.value)">
            <option value="">none</option>
            <option value="page">on current page</option>
            <option value="tab">in current tab</option>
            <option value="total">in total</option>
          </select>
        </label>
      </li>
    </ul>
    <div class="font-bold mt-4 mb-2">Actions</div>
    <div class="flex items-center">
      <button class="mr-1" @click="onResetCount">Reset total count</button>
      <div class="text-gray-600" v-text="messageResetCount"></div>
    </div>
  </div>
</template>

<script>
import { store } from '../util';

export default {
  data() {
    return {
      store,
      messageResetCount: '',
    };
  },
  methods: {
    onChange(key, value) {
      browser.runtime.sendMessage({
        cmd: 'SetConfig',
        data: { key, value },
      });
    },
    async onResetCount() {
      await browser.runtime.sendMessage({
        cmd: 'ResetCount',
      });
      this.messageResetCount = 'Total count has been reset.';
    },
  },
};
</script>

<template>
  <div class="p-2" v-if="store.config">
    <div class="font-bold mt-4 mb-2">Options</div>
    <ul class="list-disc pl-6">
      <li>
        <label>
          Show number of handled requests on badge:
          <select
            :value="store.config.badge"
            @change="onChange('badge', $event)"
          >
            <option value="">none</option>
            <option value="page">on current page</option>
            <option value="tab">in current tab</option>
            <option value="total">in total</option>
          </select>
        </label>
      </li>
    </ul>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { sendCommand } from '@/common/browser';
import { store } from '../store';

export default defineComponent({
  setup() {
    const onChange = (key: string, evt: Event) => {
      const value = (evt.target as HTMLSelectElement).value;
      sendCommand('SetConfig', { key, value });
    };

    return {
      store,
      onChange,
    };
  },
});
</script>

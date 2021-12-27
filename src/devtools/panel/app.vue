<template>
  <div class="table">
    <div class="row header">
      <div
        v-for="(field, i) in store.fields"
        :key="i"
        :style="{ flex: field.width }"
        v-text="field.title"
      ></div>
    </div>
    <div class="flex-1 overflow-y-auto">
      <div v-for="(row, i) in store.rows" :key="i" class="row">
        <div
          v-for="(field, i) in store.fields"
          :key="i"
          :style="{ flex: field.width }"
        >
          <div v-if="i === 0" v-text="row.url" />
          <div v-if="i === 1">
            <span
              v-for="label in getLabels(row)"
              v-text="label"
              :key="label"
            ></span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, reactive } from 'vue';
import browser from '#/common/browser';
import { PortMessage, InterceptionData } from '#/types';

const store = reactive({
  fields: [
    {
      title: 'URL',
      width: 0.7,
    },
    {
      title: 'Actions',
      width: 0.3,
    },
  ],
  rows: [] as InterceptionData[],
});

const port = browser.runtime.connect({
  name: `inspect-${browser.devtools.inspectedWindow.tabId}`,
});
port.onMessage.addListener((message: PortMessage<any>) => {
  if (message.type === 'interception') {
    const data = message.data as InterceptionData;
    store.rows.push(data);
  }
});

export default defineComponent({
  setup() {
    const getLabels = (row: InterceptionData) => {
      const { result } = row;
      const labels = [
        result.cancel && 'blocked',
        result.redirectUrl && 'redirected',
        result.requestHeaders && 'headers',
      ].filter(Boolean);
      return labels;
    };

    return {
      store,
      getLabels,
    };
  },
});
</script>

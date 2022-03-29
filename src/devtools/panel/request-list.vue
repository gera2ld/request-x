<template>
  <div class="request-list">
    <div class="solid toolbar">
      <svg
        class="icon"
        title="Clear"
        @click="onClear"
        viewBox="0 0 1024 1024"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M899.1 869.6l-53-305.6H864c14.4 0 26-11.6 26-26V346c0-14.4-11.6-26-26-26H618V138c0-14.4-11.6-26-26-26H432c-14.4 0-26 11.6-26 26v182H160c-14.4 0-26 11.6-26 26v192c0 14.4 11.6 26 26 26h17.9l-53 305.6c-0.3 1.5-0.4 3-0.4 4.4 0 14.4 11.6 26 26 26h723c1.5 0 3-0.1 4.4-0.4 14.2-2.4 23.7-15.9 21.2-30zM204 390h272V182h72v208h272v104H204V390z m468 440V674c0-4.4-3.6-8-8-8h-48c-4.4 0-8 3.6-8 8v156H416V674c0-4.4-3.6-8-8-8h-48c-4.4 0-8 3.6-8 8v156H202.8l45.1-260H776l45.1 260H672z"
        ></path>
      </svg>
    </div>
    <div class="row header">
      <div
        class="solid"
        v-for="(field, i) in store.fields"
        :key="i"
        :style="{ flex: field.width }"
        v-text="field.title"
      ></div>
    </div>
    <div class="flex-1 overflow-y-auto">
      <div
        v-for="(row, i) in store.requests"
        :key="i"
        class="row"
        :class="{ active: store.active === row }"
        @click="onSelect(row)"
      >
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
import { defineComponent } from 'vue';
import type { InterceptionData } from '@/types';
import { store, clearRequests } from './util';

export default defineComponent({
  setup() {
    const getLabels = (row: InterceptionData) => {
      const { result } = row;
      const labels = result
        ? ([
            result.cancel && 'blocked',
            result.redirectUrl && 'redirected',
            result.requestHeaders && 'req_headers',
            result.responseHeaders && 'res_headers',
          ].filter(Boolean) as string[])
        : [];
      return labels;
    };

    const onSelect = (row: InterceptionData) => {
      store.active = store.active === row ? undefined : row;
    };

    const onClear = () => {
      clearRequests();
      store.active = undefined;
    };

    return {
      store,
      getLabels,
      onSelect,
      onClear,
    };
  },
});
</script>

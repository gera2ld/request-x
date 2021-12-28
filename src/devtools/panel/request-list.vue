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
      <div
        v-for="(row, i) in store.rows"
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
import { InterceptionData } from '#/types';
import { store } from './util';

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

    const onSelect = (row: InterceptionData) => {
      store.active = store.active === row ? null : row;
    };

    return {
      store,
      getLabels,
      onSelect,
    };
  },
});
</script>

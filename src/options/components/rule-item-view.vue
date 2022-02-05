<template>
  <div
    class="rule-item flex items-center"
    :class="{ 'rule-item-selected': selected }"
    @mousedown="onSelect"
  >
    <slot></slot>
    <div
      class="p-1 text-xs text-zinc-600 uppercase"
      v-for="badge in badges"
      v-text="badge"
      :key="badge"
    ></div>
    <div ref="refButtons">
      <slot name="buttons"></slot>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType, ref } from 'vue';
import { isMacintosh } from '#/common/keyboard';

export default defineComponent({
  props: {
    selected: Boolean,
    badges: Array as PropType<string[]>,
  },
  emits: ['select'],
  setup(_, context) {
    const refButtons = ref(null);

    const onSelect = (e: MouseEvent) => {
      if (e.altKey) return;
      if (refButtons.value?.contains(e.target)) return;
      e.preventDefault();
      e.stopPropagation();
      context.emit('select', {
        cmdCtrl: isMacintosh ? e.metaKey : e.ctrlKey,
        shift: e.shiftKey,
      });
    };

    return {
      refButtons,
      onSelect,
    };
  },
});
</script>

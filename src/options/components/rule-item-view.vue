<template>
  <div
    class="flex items-center select-none"
    :class="{ selected }"
    @click="onSelect"
  >
    <slot></slot>
    <div
      class="rule-item-badge"
      v-for="badge in badges"
      v-text="badge"
      :key="badge"
    ></div>
    <div ref="refButtons">
      <slot name="buttons"></slot>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref } from 'vue';
import { getModifiers } from '../util';

defineProps<{
  selected?: boolean;
  badges?: string[];
}>();
const emit = defineEmits<{
  (event: 'select', data: { cmdCtrl: boolean; shift: boolean }): void;
}>();

const refButtons = ref<Node | undefined>(undefined);

const onSelect = (e: MouseEvent) => {
  if (e.altKey) return;
  if (refButtons.value?.contains(e.target as Node)) return;
  e.preventDefault();
  e.stopPropagation();
  emit('select', getModifiers(e));
};
</script>

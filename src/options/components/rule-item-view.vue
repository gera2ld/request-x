<template>
  <div
    class="flex items-start select-none"
    :class="{ selected }"
    @click="onSelect"
  >
    <slot></slot>
  </div>
</template>

<script lang="ts" setup>
import { getModifiers } from '../util';

defineProps<{
  selected?: boolean;
}>();
const emit = defineEmits<{
  (event: 'select', data: { cmdCtrl: boolean; shift: boolean }): void;
}>();

const onSelect = (e: MouseEvent) => {
  if (e.altKey) return;
  e.preventDefault();
  e.stopPropagation();
  emit('select', getModifiers(e));
};
</script>

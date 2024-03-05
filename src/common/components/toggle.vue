<template>
  <div
    class="toggle inline-block cursor-pointer children:text-2xl children:leading-0"
    :class="{ active }"
    @click="emit('toggle', $event)"
  >
    <IconToggleOn v-if="active" />
    <IconToggleOff v-else />
  </div>
</template>

<script lang="ts" setup>
import IconToggleOn from '~icons/mdi/toggle-switch';
import IconToggleOff from '~icons/mdi/toggle-switch-off';

defineProps<{
  active: boolean;
}>();
const emit = defineEmits<{
  (type: 'toggle', event: MouseEvent): void;
}>();
</script>

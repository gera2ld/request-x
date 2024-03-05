<template>
  <li class="list-item" :title="name">
    <Toggle :active="item.enabled" @toggle="emit('toggle', $event)" />
    <span
      class="mx-1 flex-1 truncate"
      v-text="name"
      @click="emit('nameClick', $event)"
    ></span>
    <span
      class="list-section-badge"
      v-if="item.subscribeUrl"
      title="Subscribed"
    >
      s
    </span>
    <slot name="suffix">
      <div
        class="ml-1 text-error"
        v-if="errorCount"
        :title="`${errorCount} errors`"
        @click="emit('errorClick', $event)"
      >
        <IconError />
      </div>
    </slot>
  </li>
</template>

<script lang="ts" setup>
import IconError from '~icons/mdi/error';
import type { ListData } from '@/types';
import { getName } from '@/common/list';
import { computed } from 'vue';
import Toggle from './toggle.vue';

const props = defineProps<{
  item: ListData;
  errors: Record<number, string> | undefined;
}>();
const emit = defineEmits<{
  (type: 'toggle', event: MouseEvent): void;
  (type: 'nameClick', event: MouseEvent): void;
  (type: 'errorClick', event: MouseEvent): void;
}>();

const name = computed(() => getName(props.item));
const errorCount = computed(() =>
  props.errors ? Object.keys(props.errors).length : 0,
);
</script>

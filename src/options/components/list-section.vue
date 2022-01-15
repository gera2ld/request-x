<template>
  <section class="list-section">
    <div class="list-section-title flex-1">
      <slot name="title"></slot>
    </div>
    <div v-if="!lists?.length" class="list-section-empty">Empty</div>
    <a
      class="nav-item"
      v-for="(item, index) in lists"
      :key="index"
      :class="{
        active: isRoute('lists', type, item.id),
        enabled: item.enabled,
      }"
      :href="`#lists/${type}/${item.id}`"
      :title="getName(item)"
    >
      <span
        class="list-section-status"
        @click.prevent.stop="switchStatus(item)"
      ></span>
      <span class="mx-1 flex-1 truncate" v-text="getName(item)"></span>
      <span
        class="text-xs rounded border border-blue-400 text-blue-400 px-1 uppercase"
        v-if="item.subscribeUrl"
        title="Subscribed"
        >s</span
      >
    </a>
  </section>
</template>

<script lang="ts">
import { defineComponent, PropType } from 'vue';
import { ListData } from '#/types';
import { getName, isRoute, setStatus } from '../util';

export default defineComponent({
  props: {
    lists: {
      type: Object as PropType<ListData[]>,
    },
    type: {
      type: String,
    },
  },
  setup() {
    const switchStatus = (item: ListData) => {
      setStatus(item, !item.enabled);
    };

    return {
      getName,
      isRoute,
      switchStatus,
    };
  },
});
</script>

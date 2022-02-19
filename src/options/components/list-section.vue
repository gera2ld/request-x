<template>
  <section class="list-section">
    <div class="list-section-title flex-1">
      <slot name="title"></slot>
    </div>
    <div class="list-section-unsupported" v-if="unsupported">
      <slot name="unsupported"></slot>
    </div>
    <template v-else>
      <div v-if="!lists?.length" class="list-section-empty">Empty</div>
      <a
        class="nav-item"
        v-for="(item, index) in lists"
        :key="index"
        :class="{
          active: isRoute('lists', type, item.id),
          enabled: item.enabled,
          dragging: dragging.start === index,
          'dragging-over': dragging.over === index,
          'dragging-below':
            dragging.over === index && dragging.over > dragging.start,
        }"
        :href="`#lists/${type}/${item.id}`"
        :title="getName(item)"
        @dragstart="onDragStart($event, index)"
        @dragover="onDragOver($event, index)"
        @dragleave="onDragLeave($event, index)"
        @dragend="onDragEnd"
        @dblclick="onEdit(item)"
      >
        <span
          class="list-section-status"
          @click.prevent.stop="onToggle(item)"
        ></span>
        <span class="mx-1 flex-1 truncate" v-text="getName(item)"></span>
        <span
          class="list-section-badge"
          v-if="item.subscribeUrl"
          title="Subscribed"
          >s</span
        >
      </a>
    </template>
  </section>
</template>

<script lang="ts">
import { defineComponent, PropType, reactive } from 'vue';
import { ListData } from '#/types';
import { getName, isRoute, moveList } from '../util';
import { listActions } from '../actions';

export default defineComponent({
  props: {
    lists: {
      type: Object as PropType<ListData[]>,
    },
    type: {
      type: String as PropType<ListData['type']>,
    },
    unsupported: {
      type: Boolean,
    },
  },
  setup(props) {
    const dragging = reactive<{
      start: number;
      over: number;
    }>({
      start: -1,
      over: -1,
    });

    const onDragStart = (_event: DragEvent, index: number) => {
      dragging.start = index;
      dragging.over = -1;
    };

    const onDragOver = (event: DragEvent, index: number) => {
      if (dragging.start >= 0) event.preventDefault();
      dragging.over =
        dragging.start < 0 || dragging.start === index ? -1 : index;
    };

    const onDragLeave = (event: DragEvent, index: number) => {
      if (dragging.start >= 0) event.preventDefault();
      if (dragging.over === index) dragging.over = -1;
    };

    const onDragEnd = () => {
      moveList(props.type, dragging.start, dragging.over);
      dragging.start = -1;
      dragging.over = -1;
    };

    return {
      dragging,
      getName,
      isRoute,
      onDragStart,
      onDragOver,
      onDragLeave,
      onDragEnd,
      onEdit: listActions.edit,
      onToggle: listActions.toggle,
    };
  },
});
</script>

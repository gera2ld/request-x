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
        v-for="(item, index) in lists"
        :key="index"
        class="list-item"
        :class="{
          active:
            listSelection.activeType === type &&
            listSelection.activeIndex === index,
          'list-item-selected':
            listSelection.activeType === type && listSelection.selected[index],
          enabled: item.enabled,
          dragging:
            dragging.start >= 0 &&
            listSelection.activeType === type &&
            listSelection.selected[index],
          'dragging-over': dragging.over === index,
          'dragging-below':
            dragging.over === index && dragging.over > dragging.start,
        }"
        :href="getHash(item)"
        :title="getName(item)"
        @click.prevent="onSelToggle(index, $event)"
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
import { getName, isRoute, moveList, getModifiers } from '../util';
import { listActions } from '../actions';
import { listSelection } from '../store';

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
      if (
        listSelection.activeType !== props.type ||
        !listSelection.selected[index]
      ) {
        onSelToggle(index, {} as any);
      }
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
      const selection = listSelection.selected.map((value, i) => value ? i : -1).filter(i => i >= 0);
      moveList(props.type, selection, dragging.over, dragging.over > dragging.start);
      dragging.start = -1;
      dragging.over = -1;
    };

    const getHash = (item: ListData) => {
      return `#lists/${item.type}/${item.id}`;
    };

    const onSelToggle = (index: number, event: MouseEvent) => {
      listActions.selToggle(props.type, index, getModifiers(event));
      if (
        listSelection.count === 1 &&
        listSelection.selected[listSelection.activeIndex]
      ) {
        window.location.hash = getHash(props.lists[index]);
      }
    };

    return {
      dragging,
      getName,
      getHash,
      isRoute,
      listSelection,
      onDragStart,
      onDragOver,
      onDragLeave,
      onDragEnd,
      onSelToggle,
      onEdit: listActions.edit,
      onToggle: listActions.toggle,
    };
  },
});
</script>

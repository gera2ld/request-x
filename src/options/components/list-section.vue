<template>
  <section class="list-section">
    <div class="list-section-title flex-1">
      <slot name="title"></slot>
    </div>
    <div class="list-section-unsupported" v-if="unsupported">
      <slot name="unsupported"></slot>
    </div>
    <div v-else-if="!lists?.length" class="list-section-empty">Empty</div>
    <div v-else-if="!visible.count" class="list-section-empty">Not found</div>
    <ul v-else>
      <li
        v-for="(item, itemIndex) in lists"
        :key="itemIndex"
        class="list-item"
        :class="{
          active: isActive(itemIndex),
          'list-item-selected': isSelected(itemIndex),
          enabled: item.enabled,
          dragging: dragging.start >= 0 && isSelected(itemIndex),
          'dragging-over': dragging.over === itemIndex,
          'dragging-below':
            dragging.over === itemIndex && dragging.over > dragging.start,
        }"
        :title="getName(item)"
        v-show="visible.data[itemIndex]"
        @click.prevent.stop="onSelToggle(itemIndex, $event)"
        @dragstart="onDragStart($event, itemIndex)"
        @dragover="onDragOver($event, itemIndex)"
        @dragleave="onDragLeave($event, itemIndex)"
        @dragend="onDragEnd"
        @dblclick="onEdit(item)"
      >
        <span
          class="list-section-status"
          @click.prevent.stop="onToggle(item)"
        ></span>
        <a
          class="mx-1 flex-1 truncate"
          :href="getHash(item)"
          v-text="getName(item)"
        ></a>
        <span
          class="list-section-badge"
          v-if="item.subscribeUrl"
          title="Subscribed"
          >s</span
        >
        <span
          class="list-section-badge text-error"
          v-if="store.listErrors[item.id]"
          :title="store.listErrors[item.id]"
          >!</span
        >
      </li>
    </ul>
  </section>
</template>

<script lang="ts">
import { defineComponent, PropType, computed, reactive } from 'vue';
import { ListData } from '#/types';
import { getName, isRoute, moveList, getModifiers } from '../util';
import { listActions } from '../actions';
import { store, listTypes, listSelection } from '../store';

export default defineComponent({
  props: {
    lists: {
      type: Object as PropType<ListData[]>,
    },
    type: {
      type: String as PropType<ListData['type']>,
    },
    index: {
      type: Number,
    },
    filter: {
      type: String,
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

    const isActive = (index: number) =>
      listSelection.groupIndex === props.index &&
      listSelection.itemIndex === index;
    const isSelected = (index: number) =>
      listSelection.selection[props.index]?.selected[index];

    const visible = computed(() => {
      let count = 0;
      const data = props.lists.map((list) => {
        const visible =
          !props.filter ||
          list.name.toLowerCase().includes(props.filter.toLowerCase());
        count += +visible;
        return visible;
      });
      return { data, count };
    });

    const onDragStart = (event: DragEvent, index: number) => {
      if (props.filter) {
        event.preventDefault();
        return;
      }
      if (!listSelection.selection[props.index]?.selected[index]) {
        onSelToggle(index, {} as any);
      }
      dragging.start = index;
      dragging.over = -1;
      listSelection.groupIndex = props.index;
      listSelection.itemIndex = index;
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

    const onDragEnd = async () => {
      const selection = listSelection.selection[props.index];
      const selected = selection.selected
        .map((value, i) => (value ? i : -1))
        .filter((i) => i >= 0);
      await moveList(
        props.type,
        selected,
        dragging.over,
        dragging.over > dragging.start
      );
      const offset =
        selected.filter((i) => i < dragging.over).length -
        +(dragging.over > dragging.start);
      const newSelected = [];
      selected.forEach((_, i) => {
        newSelected[dragging.over - offset + i] = true;
      });
      selection.selected = newSelected;
      listSelection.itemIndex = dragging.over;
      dragging.start = -1;
      dragging.over = -1;
    };

    const getHash = (item: ListData) => {
      return `#lists/${item.type}/${item.id}`;
    };

    const onSelToggle = (index: number, event: MouseEvent) => {
      listActions.selToggle(
        listTypes.indexOf(props.type),
        index,
        getModifiers(event)
      );
      const selectedCount = listSelection.selection.reduce(
        (res, item) => res + item.count,
        0
      );
      if (
        selectedCount === 1 &&
        listSelection.selection[props.index].selected[index]
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
      store,
      isActive,
      isSelected,
      visible,
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

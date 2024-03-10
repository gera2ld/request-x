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
    <div v-else>
      <ListItem
        v-for="(item, itemIndex) in lists"
        :key="itemIndex"
        :class="{
          active: isActive(itemIndex),
          selected: isSelected(itemIndex),
          enabled: item.enabled,
          dragging: dragging.start >= 0 && isSelected(itemIndex),
          'dragging-over': dragging.over === itemIndex,
          'dragging-below':
            dragging.over === itemIndex && dragging.over > dragging.start,
        }"
        :item="item"
        :errors="store.ruleErrors[item.id]"
        v-show="visible.data[itemIndex]"
        draggable="true"
        @click.stop="onSelToggle(itemIndex, $event)"
        @dragstart="onDragStart($event, itemIndex)"
        @dragover="onDragOver($event, itemIndex)"
        @dragleave="onDragLeave($event, itemIndex)"
        @dragend="onDragEnd"
        @dblclick="onEdit(item)"
        @toggle.stop="onToggle(item)"
      />
    </div>
  </section>
</template>

<script lang="ts" setup>
import { computed, reactive } from 'vue';
import type { ListData } from '@/types';
import { getModifiers } from '../util';
import { listActions } from '../actions';
import { store, listTypes, listSelection } from '../store';
import ListItem from '@/common/components/list-item.vue';

const props = defineProps<{
  lists: ListData[];
  type: ListData['type'];
  index: number;
  filter?: string;
  unsupported?: boolean;
}>();

const dragging = reactive<{
  start: number;
  over: number;
}>({
  start: -1,
  over: -1,
});

const isActive = (index: number) =>
  listSelection.groupIndex === props.index && listSelection.itemIndex === index;
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
  dragging.over = dragging.start < 0 || dragging.start === index ? -1 : index;
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
  listActions.move(
    props.type,
    selected,
    dragging.over,
    dragging.over > dragging.start,
  );
  const offset =
    selected.filter((i) => i < dragging.over).length -
    +(dragging.over > dragging.start);
  const newSelected: boolean[] = [];
  selected.forEach((_, i) => {
    newSelected[dragging.over - offset + i] = true;
  });
  selection.selected = newSelected;
  listSelection.itemIndex = dragging.over;
  dragging.start = -1;
  dragging.over = -1;
};

const onSelToggle = (index: number, event: MouseEvent) => {
  listActions.selToggle(
    listTypes.indexOf(props.type),
    index,
    getModifiers(event),
  );
  const selectedCount = listSelection.selection.reduce(
    (res, item) => res + item.count,
    0,
  );
  if (
    selectedCount === 1 &&
    listSelection.selection[props.index].selected[index]
  ) {
    const list = props.lists[index];
    window.location.hash = `#lists/${list.id}`;
  }
};

const onEdit = listActions.edit;
const onToggle = listActions.toggle;
</script>

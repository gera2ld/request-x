<template>
  <div class="list-header">
    <div class="list-header-prev" :class="{ disabled: offset <= minOffset }" @mousedown="offsetDec"></div>
    <div class="list-header-next" :class="{ disabled: offset >= maxOffset }" @mousedown="offsetInc"></div>
    <div class="list-header-items" ref="items">
      <div class="list-header-item" :class="{ active: list.id === store.current.id, 'list-enabled': list.enabled }"
        v-for="(list, index) in store.lists"
        @click="onSelect(list)" @dblclick="onEdit(list, index)"
        :title="getTitle(list)">
        {{getTitle(list)}}
        <span class="item-status" @click.prevent.stop="switchStatus(list, index)"></span>
      </div>
    </div>
  </div>
</template>

<script>
import { store, edit, pickData, dump } from '../utils';

const STEP = 60;

export default {
  data() {
    return {
      offset: 0,
      minOffset: 0,
      maxOffset: 0,
      store,
    };
  },
  watch: {
    'store.lists': 'recalcTabs',
    offset(offset) {
      this.$refs.items.scrollLeft = offset;
    },
  },
  methods: {
    offsetDec() {
      if (this.offset > this.minOffset) this.offset -= STEP;
    },
    offsetInc() {
      if (this.offset < this.maxOffset) this.offset += STEP;
    },
    recalcTabs() {
      this.$nextTick(() => {
        const elItems = this.$refs.items;
        this.maxOffset = Math.max(0, elItems.scrollWidth - elItems.offsetWidth);
        this.offset = Math.min(this.offset, this.maxOffset);
      });
    },
    getTitle(list) {
      return list.title || list.name || 'No name';
    },
    onEdit(list, index) {
      edit('list', pickData(list, [
        'id',
        'enabled',
        'name',
        'title',
        'subscribeUrl',
      ]), {
        index,
        subscribe: !!list.subscribeUrl,
      });
    },
    onSelect(list) {
      store.current = list;
    },
    switchStatus(list) {
      const data = {
        id: list.id,
        enabled: !list.enabled,
      };
      dump(data);
    },
  },
};
</script>

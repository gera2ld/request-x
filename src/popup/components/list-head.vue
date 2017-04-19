<template>
  <div class="list-header">
    <div class="list-header-prev" :class="{ disabled: offset <= minOffset }" @mousedown="offsetDec"></div>
    <div class="list-header-next" :class="{ disabled: offset >= maxOffset }" @mousedown="offsetInc"></div>
    <div class="list-header-items" ref="items">
      <div class="list-header-item" :class="{ active: list.id === store.current.id, 'list-enabled': list.enabled }"
        v-for="(list, index) in store.lists"
        @click="onSelect(list)" @dblclick="onEdit(list, index)"
        :title="getTitle(list)">
        <span class="list-header-title" v-text="getTitle(list)"></span>
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
    'store.current': 'ensureVisible',
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
    ensureVisible() {
      this.$nextTick(() => {
        const i = this.store.lists.findIndex(item => item === this.store.current);
        const { items } = this.$refs;
        const el = items.children[i];
        if (!el) return;
        if (el.offsetLeft + el.offsetWidth > items.scrollLeft + items.clientWidth) {
          items.scrollLeft = el.offsetLeft + el.offsetWidth - items.clientWidth;
        } else if (el.offsetLeft < items.scrollLeft) {
          items.scrollLeft = el.offsetLeft;
        } else return;
        this.recalcTabs();
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

<style>
.list-header {
  position: relative;
  padding: 0 1em;

  > .disabled {
    color: lightgray;
    cursor: not-allowed;
  }

  &-prev,
  &-next {
    position: absolute;
    top: 50%;
    margin-top: -.5em;
    border: 0;
    border-top: .5em solid transparent;
    border-bottom: .5em solid transparent;
    color: gray;
    cursor: pointer;
  }
  &-prev {
    left: 0;
    border-right: .5em solid currentColor;
  }
  &-next {
    right: 0;
    border-left: .5em solid currentColor;
  }

  &-items {
    position: relative;
    overflow: hidden;
    white-space: nowrap;
  }

  &-title {
    display: inline-block;
    max-width: 8em;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  &-item {
    display: inline-block;
    padding: .5em 1em;
    margin-right: -1px;
    vertical-align: bottom;
    background: white;
    border-radius: .3em .3em 0 0;
    border: 1px solid #ccc;
    border-bottom: 0;
    cursor: pointer;
    > * {
      vertical-align: middle;
    }
    &:not(.active) {
      background: #ddd;
      color: gray;
      &:hover {
        background: #eee;
      }
    }
  }
}

.item-status {
  display: inline-block;
  width: .7em;
  height: .7em;
  border-radius: 50%;
  background: red;
  .list-enabled > & {
    background: green;
  }
}
</style>

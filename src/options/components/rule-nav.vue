<template>
  <div
    class="nav"
    :class="{ 'active-area': store.activeArea === 'lists' }"
    @mousedown="store.activeArea = 'lists'"
  >
    <div class="nav-filter">
      <input type="search" v-model="filter" placeholder="Filter by name" />
    </div>
    <div class="flex-1 overflow-y-auto" @click="onSelCancel">
      <ListSection
        type="request"
        :lists="store.lists.request"
        :index="0"
        :filter="filter"
      >
        <template #title>Request Interception</template>
      </ListSection>
      <ListSection
        type="cookie"
        :lists="store.lists.cookie"
        :index="1"
        :filter="filter"
        :unsupported="!store.features.cookies"
      >
        <template #title>Cookie Interception</template>
        <template #unsupported>
          <div class="subtle">Not supported in this browser.</div>
        </template>
      </ListSection>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue';
import { listActions } from '../actions';
import { listSelection, store } from '../store';
import ListSection from './list-section.vue';

export default defineComponent({
  components: {
    ListSection,
  },
  setup() {
    const filter = ref('');

    const onSelCancel = () => {
      listActions.selToggle(listSelection.groupIndex, listSelection.itemIndex, {
        cmdCtrl: false,
        shift: false,
      });
    };

    return {
      filter,
      store,
      onSelCancel,
    };
  },
});
</script>

<template>
  <div
    class="nav"
    :class="{ 'active-area': store.activeArea === 'lists' }"
    @mousedown="store.activeArea = 'lists'"
  >
    <div class="nav-filter">
      <input type="search" v-model="filter" placeholder="Filter by name" />
    </div>
    <div class="flex-1 overflow-y-auto">
      <section class="nav-section">
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
      </section>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue';
import { store } from '../store';
import ListSection from './list-section.vue';

export default defineComponent({
  components: {
    ListSection,
  },
  setup() {
    const filter = ref('');

    return {
      filter,
      store,
    };
  },
});
</script>

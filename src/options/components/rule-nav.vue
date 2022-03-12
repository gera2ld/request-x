<template>
  <div
    class="nav"
    :class="{ 'active-area': store.activeArea === 'lists' }"
    @mousedown="store.activeArea = 'lists'"
  >
    <div class="flex-1 overflow-y-auto">
      <section class="nav-section">
        <ListSection type="request" :lists="store.lists.request" :index="0">
          <template #title>Request Interception</template>
        </ListSection>
        <ListSection
          type="cookie"
          :lists="store.lists.cookie"
          :index="1"
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
import { defineComponent } from 'vue';
import { store } from '../store';
import ListSection from './list-section.vue';

export default defineComponent({
  components: {
    ListSection,
  },
  setup() {
    return {
      store,
    };
  },
});
</script>

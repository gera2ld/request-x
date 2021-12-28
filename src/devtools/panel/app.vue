<template>
  <RequestList />
  <InterceptionPanel v-if="store.active" />
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import RequestList from './request-list.vue';
import InterceptionPanel from './interception-panel.vue';
import { store } from './util';

export default defineComponent({
  components: {
    RequestList,
    InterceptionPanel,
  },
  setup() {
    return {
      store,
    };
  },
});
</script>

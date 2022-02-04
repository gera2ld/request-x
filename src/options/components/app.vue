<template>
  <div class="flex flex-col h-screen px-4">
    <div class="flex flex-1 min-h-0">
      <rule-nav></rule-nav>
      <rule-body v-if="isRoute('lists')" class="flex-1 min-w-0"></rule-body>
      <div
        v-else
        class="subtle flex flex-1 flex-col items-center justify-center"
      >
        <ul class="list-disc leading-8 text-lg">
          <li>Create or choose a list from side menu to get started</li>
          <li>
            Select rules for batch operations, also try <kbd>Cmd</kbd> /
            <kbd>Shift</kbd> + click
          </li>
        </ul>
      </div>
    </div>
    <footer class="footer">
      <div class="flex-1">&copy; Gerald</div>
      <div>
        Links:
        <a href="https://github.com/gera2ld/request-x" target="_blank"
          >GitHub</a
        >
        |
        <a href="https://github.com/gera2ld/request-x/issues" target="_blank"
          >Feedback</a
        >
      </div>
    </footer>
    <modal-list />
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { store, isRoute } from '../util';
import RuleNav from './rule-nav.vue';
import RuleBody from './rule-body.vue';
import ModalList from './modal-list.vue';

export default defineComponent({
  components: {
    RuleNav,
    RuleBody,
    ModalList,
  },
  setup() {
    return {
      store,
      isRoute,
    };
  },
});
</script>

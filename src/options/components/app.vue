<template>
  <div class="flex flex-col h-screen px-4">
    <div class="flex flex-1 min-h-0">
      <rule-nav></rule-nav>
      <rule-body v-if="store.route.group === 'lists'" class="flex-1 min-w-0"></rule-body>
      <settings-interface
        v-if="isRoute('settings', 'general')"
        class="flex-1">
      </settings-interface>
    </div>
    <footer class="flex py-2">
      <div class="flex-1">&copy; Gerald</div>
      <div>
        Links:
        <a href="https://github.com/gera2ld/request-x" target="_blank">GitHub</a>
        |
        <a href="https://github.com/gera2ld/request-x/issues" target="_blank">Feedback</a>
      </div>
    </footer>
    <modal-list />
  </div>
</template>

<script>
import { store, isRoute } from '../util';
import RuleNav from './rule-nav.vue';
import RuleBody from './rule-body.vue';
import ModalList from './modal-list.vue';
import SettingsInterface from './settings-interface.vue';

export default {
  components: {
    RuleNav,
    RuleBody,
    ModalList,
    SettingsInterface,
  },
  data() {
    return {
      store,
    };
  },
  methods: {
    isRoute,
  },
};
</script>

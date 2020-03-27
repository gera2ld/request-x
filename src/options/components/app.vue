<template>
  <div id="app" class="flex flex-col">
    <div class="flex flex-auto">
      <rule-nav></rule-nav>
      <rule-body v-if="store.route.group === 'rules'" class="flex-auto"></rule-body>
      <settings-interface v-if="store.route.value === 'settings/interface'" class="flex-auto"></settings-interface>
    </div>
    <footer class="flex mt-2">
      <div class="flex-auto">&copy; Gerald</div>
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
import { store } from '../utils';
import RuleNav from './rule-nav';
import RuleBody from './rule-body';
import ModalList from './modal-list';
import SettingsInterface from './settings-interface';

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
};
</script>

<style>
#app {
  height: 100vh;
  padding: 16px;
  > header {
    > img {
      margin-right: 1rem;
    }
  }
}
</style>

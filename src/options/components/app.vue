<template>
  <div class="flex flex-col h-screen px-4">
    <header class="header">
      <a href="#" class="text-xl">Request X</a>
      <div class="ml-4 mr-8 subtle" v-text="`v${version}`"></div>
      <menu-bar />
      <div v-if="currentList && !listEditable" class="text-zinc-600 mx-2">
        You must fork this list before making changes to it
      </div>
      <div class="input-icon">
        <input type="search" v-model="ruleState.filter" />
        <svg class="icon" viewBox="0 0 24 24">
          <path
            d="M10 4c8 0 8 12 0 12c-8 0 -8 -12 0 -12m0 1c-6 0 -6 10 0 10c6 0 6 -10 0 -10zm4 8l6 6l-1 1l-6 -6z"
          />
        </svg>
      </div>
    </header>
    <div class="flex flex-1 min-h-0">
      <rule-nav></rule-nav>
      <rule-body
        v-if="isRoute('lists')"
        class="flex-1 min-w-0 px-2"
      ></rule-body>
      <div v-else class="subtle flex flex-1 items-center justify-center">
        <ul class="list-disc leading-8 text-lg">
          <li>Create or choose a list from side menu to get started</li>
          <li>
            Select rules for batch operations, also try
            <kbd v-text="isMacintosh ? 'Cmd' : 'Ctrl'"></kbd> /
            <kbd>Shift</kbd> + click
          </li>
          <li>Double click or press <kbd>E</kbd> to edit a rule</li>
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
import { browser } from '#/common/browser';
import { isMacintosh } from '#/common/keyboard';
import { currentList, listEditable, store, ruleState } from '../store';
import { isRoute } from '../util';
import MenuBar from './menu-bar.vue';
import RuleNav from './rule-nav.vue';
import RuleBody from './rule-body.vue';
import ModalList from './modal-list.vue';

const manifest = browser.runtime.getManifest();

export default defineComponent({
  components: {
    MenuBar,
    RuleNav,
    RuleBody,
    ModalList,
  },
  setup() {
    return {
      currentList,
      listEditable,
      store,
      ruleState,
      isRoute,
      isMacintosh,
      version: manifest.version,
    };
  },
});
</script>

<template>
  <div
    class="max-w-screen-xl mx-auto min-w-[768px] flex flex-col h-screen px-4"
  >
    <header class="header">
      <a href="#" class="text-xl">Request X</a>
      <div class="ml-4 mr-8 subtle" v-text="`v${version}`"></div>
      <MenuBar />
      <div v-if="currentList && !listEditable" class="subtle mx-2">
        You must fork this list before making changes to it
      </div>
      <div class="input">
        <IconSearch />
        <input type="search" v-model="ruleState.filter" />
      </div>
    </header>
    <div class="flex flex-1 min-h-0">
      <RuleNav />
      <RuleBody v-if="isRoute('lists')" class="flex-1 min-w-0 px-2" />
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
      <div>
        Links:
        <a href="https://github.com/gera2ld/request-x" target="_blank">
          GitHub
        </a>
        |
        <a href="https://github.com/gera2ld/request-x/issues" target="_blank">
          Feedback
        </a>
      </div>
      <div>
        Designed by <a href="https://gera2ld.space" target="_blank">gera2ld</a>
      </div>
    </footer>
    <modal-list />
  </div>
</template>

<script lang="ts" setup>
import { isMacintosh } from '@/common/keyboard';
import IconSearch from '~icons/mdi/search';
import { currentList, listEditable, ruleState } from '../store';
import { isRoute } from '../util';
import MenuBar from './menu-bar.vue';
import RuleNav from './rule-nav.vue';
import RuleBody from './rule-body.vue';
import ModalList from './modal-list.vue';

const { version } = chrome.runtime.getManifest();
</script>

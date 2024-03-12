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
      <RuleBody class="flex-1 min-w-0 px-2" />
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
import browser from 'webextension-polyfill';
import IconSearch from '~icons/mdi/search';
import { currentList, listEditable, ruleState } from '../store';
import MenuBar from './menu-bar.vue';
import RuleNav from './rule-nav.vue';
import RuleBody from './rule-body.vue';
import ModalList from './modal-list.vue';

const { version } = browser.runtime.getManifest();
</script>

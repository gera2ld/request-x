<template>
  <div id="app">
    <div class="flex p-4 items-center text-lg">
      <img class="w-8 mr-4" src="/public/images/icon_48.png" />
      <div class="flex-1">Request X</div>
      <a class="text-xs" @click.prevent="openDashboard">Dashboard</a>
    </div>
    <div class="card" v-if="store.count">
      <div class="card-title">Number of requests handled</div>
      <div class="flex">
        <div class="cell">
          <div class="cell-title" v-text="store.count.page || 0"></div>
          <div class="cell-desc">on this page</div>
        </div>
        <div class="cell">
          <div class="cell-title" v-text="store.count.tab || 0"></div>
          <div class="cell-desc">in this tab</div>
        </div>
        <div class="cell">
          <div class="cell-title" v-text="store.count.global || 0"></div>
          <div class="cell-desc">in total</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import browser from '#/common/browser';
import { store } from './util';

export default {
  setup() {
    const openDashboard = () => {
      browser.runtime.openOptionsPage();
    };

    return {
      store,
      openDashboard,
    };
  },
};
</script>

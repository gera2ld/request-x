<template>
  <div id="app">
    <div class="flex p-4 items-center text-lg">
      <img class="w-8 mr-4" src="/public/images/icon_48.png" />
      <div class="flex-1">
        Request X
        <span class="version" v-text="version"></span>
      </div>
      <a class="text-sm" @click.prevent="openDashboard">Dashboard</a>
    </div>
  </div>
</template>

<script>
import browser from '#/common/browser';

const manifest = browser.runtime.getManifest();
const openDashboard = () => {
  browser.runtime.openOptionsPage();
};

export default {
  setup() {
    return {
      openDashboard,
      version: manifest.version,
    };
  },
};
</script>

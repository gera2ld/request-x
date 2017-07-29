<template>
  <div id="app">
    <img src="/public/images/icon48.png">
    <div class="button" @click="openDashboard">Open Dashboard</div>
  </div>
</template>

<script>
export default {
  methods: {
    openDashboard() {
      chrome.runtime.openOptionsPage();
    },
  },
};
</script>

<style>
html {
  font-size: 14px;
}
#app {
  text-align: center;
  .button {
    width: 15rem;
    height: 2rem;
    line-height: 2rem;
    cursor: pointer;
    &:hover {
      background: #f0f0f0;
    }
  }
}
</style>

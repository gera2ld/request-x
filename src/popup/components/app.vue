<template>
  <div id="app">
    <ListHead />
    <ListBody />
    <ListFoot />
  </div>
</template>

<script>
import { store, isValidMethod, isValidURLPattern, isValidURL } from '../utils';
import ListHead from './list-head';
import ListBody from './list-body';
import ListFoot from './list-foot';

export default {
  data() {
    return store;
  },
  watch: {
    'editing.data': {
      deep: true,
      handler() {
        const { editing } = this;
        if (!editing || !editing.type) return;
        const status = {
          title: true,
          method: editing.type !== 'rule' || isValidMethod(editing.data.method),
          url: editing.type !== 'rule' || isValidURLPattern(editing.data.url),
          subscribeUrl: !editing.extra.subscribe || isValidURL(editing.data.subscribeUrl),
        };
        status.ok = Object.keys(status).every(key => status[key]);
        editing.status = status;
      },
    },
    current(current) {
      chrome.runtime.sendMessage({ cmd: 'GetList', data: current.id }, ({ data: { rules } }) => {
        this.currentRules = rules || [];
      });
    },
  },
  components: {
    ListHead,
    ListBody,
    ListFoot,
  },
};
</script>

<style src="../style.css"></style>

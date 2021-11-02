<template>
  <div class="nav flex flex-col w-64 mr-2 pr-2 border-r border-gray-200">
    <div class="flex-1 overflow-y-auto">
      <div class="nav-sep nav-sep-title">Settings</div>
      <a
        class="nav-item"
        :class="{ active: isRoute('settings', 'general') }"
        href="#settings/general">
        General
      </a>
      <div class="flex nav-sep">
        <div class="nav-sep-title flex-1">Lists</div>
        <vl-dropdown align="right" :closeAfterClick="true">
          <button slot="toggle" class="button-panel-title">&mldr;</button>
          <div class="dropdown-menu w-24">
            <div @click.prevent="onListNew">Create new</div>
            <div @click.prevent="onListImport">Import</div>
            <div @click.prevent="onListSubscribe">Subscribe</div>
            <div @click.prevent="onListFetchAll">Fetch all</div>
          </div>
        </vl-dropdown>
      </div>
      <a
        class="nav-item"
        v-for="(item, index) in store.lists"
        :key="index"
        :class="{ active: isRoute('lists', item.id), enabled: item.enabled }"
        :href="`#lists/${item.id}`"
        :title="getName(item)">
        <span class="nav-item-status" @click.prevent.stop="switchStatus(item)"></span>
        <span class="mx-1 flex-1 truncate" v-text="getName(item)"></span>
        <span class="text-xs rounded border border-blue-400 text-blue-400 px-1 uppercase" v-if="item.subscribeUrl" title="Subscribed">s</span>
      </a>
    </div>
  </div>
</template>

<script>
import {
  store, dump, pickData, loadFile, blob2Text, getName, isRoute, setStatus,
} from '../util';

export default {
  data() {
    return {
      store,
      errors: {},
    };
  },
  methods: {
    getName,
    isRoute,
    switchStatus(item) {
      setStatus(item, !item.enabled);
    },
    onListNew() {
      this.store.editList = {
        name: '',
      };
    },
    onListImport() {
      loadFile()
        .then(blob2Text)
        .then((text) => {
          const data = JSON.parse(text);
          dump(pickData(data, ['name', 'rules']));
        });
    },
    onListSubscribe() {
      this.store.editList = {
        name: '',
        subscribeUrl: '',
        isSubscribed: true,
      };
    },
    onListFetchAll() {
      browser.runtime.sendMessage({ cmd: 'FetchLists' });
    },
  },
};
</script>

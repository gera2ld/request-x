<template>
  <div class="nav flex flex-col w-64 mr-2">
    <div class="flex-1 overflow-y-auto">
      <div class="nav-group-title">Settings</div>
      <div
        class="nav-item"
        :class="{ active: store.route.value === 'settings/interface'}"
        @click="onSelectSetting('interface')">
        Interface
      </div>
      <div class="nav-group-title">Lists</div>
      <div
        class="nav-item"
        v-for="(item, index) in store.lists"
        :key="index"
        :class="{ active: store.route.value === `lists/${item.id}`, enabled: item.enabled }"
        @click="onSelect(item)"
        :title="getName(item)">
        <span class="nav-item-status" @click.prevent.stop="switchStatus(item)"></span>
        <span class="mx-1 flex-1 truncate" v-text="getName(item)"></span>
        <span class="text-xs rounded border border-blue-400 text-blue-400 px-1 uppercase" v-if="item.subscribeUrl" title="Subscribed">s</span>
      </div>
    </div>
    <div class="py-4">
      <vl-dropdown direction="up" :closeAfterClick="true">
        <button slot="toggle" class="button-panel-title">Manage list &#8227;</button>
        <div class="dropdown-menu w-24">
          <div @click.prevent="onListNew">Create new</div>
          <div @click.prevent="onListImport">Import</div>
          <div @click.prevent="onListSubscribe">Subscribe</div>
          <div @click.prevent="onListFetchAll">Fetch all</div>
        </div>
      </vl-dropdown>
    </div>
  </div>
</template>

<script>
import {
  store, dump, pickData, loadFile, blob2Text, setRoute, getName,
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
    switchStatus(item) {
      item.enabled = !item.enabled;
      dump(pickData(item, ['id', 'enabled']));
    },
    onSelectSetting(id) {
      setRoute(`settings/${id}`);
    },
    onSelect(item) {
      setRoute(`lists/${item.id}`);
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

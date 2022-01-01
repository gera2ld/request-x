<template>
  <div class="nav">
    <div class="flex-1 overflow-y-auto">
      <div class="nav-sep nav-sep-title">Settings</div>
      <a
        class="nav-item"
        :class="{ active: isRoute('settings', 'general') }"
        href="#settings/general"
      >
        General
      </a>
      <div class="flex nav-sep">
        <div class="nav-sep-title flex-1">Lists</div>
        <VlDropdown align="right" :closeAfterClick="true">
          <template v-slot:toggle>
            <button class="button-panel-title">&mldr;</button>
          </template>
          <div class="dropdown-menu w-24">
            <div @click.prevent="onListNew">Create new</div>
            <div @click.prevent="onListImport">Import</div>
            <div @click.prevent="onListSubscribe">Subscribe</div>
            <div @click.prevent="onListFetchAll">Fetch all</div>
          </div>
        </VlDropdown>
      </div>
      <a
        class="nav-item"
        v-for="(item, index) in store.lists"
        :key="index"
        :class="{ active: isRoute('lists', item.id), enabled: item.enabled }"
        :href="`#lists/${item.id}`"
        :title="getName(item)"
      >
        <span
          class="nav-item-status"
          @click.prevent.stop="switchStatus(item)"
        ></span>
        <span class="mx-1 flex-1 truncate" v-text="getName(item)"></span>
        <span
          class="text-xs rounded border border-blue-400 text-blue-400 px-1 uppercase"
          v-if="item.subscribeUrl"
          title="Subscribed"
          >s</span
        >
      </a>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { pick } from 'lodash-es';
import VlDropdown from 'vueleton/lib/dropdown';
import browser from '#/common/browser';
import { ListData } from '#/types';
import {
  store,
  dump,
  loadFile,
  blob2Text,
  getName,
  isRoute,
  setStatus,
} from '../util';

export default defineComponent({
  components: {
    VlDropdown,
  },
  setup() {
    const switchStatus = (item: ListData) => {
      setStatus(item, !item.enabled);
    };

    const onListNew = () => {
      store.editList = {
        name: '',
      };
    };

    const onListImport = async () => {
      const blob = await loadFile();
      const text = await blob2Text(blob);
      const data = JSON.parse(text);
      dump(pick(data, ['name', 'rules']));
    };

    const onListSubscribe = () => {
      store.editList = {
        name: '',
        subscribeUrl: '',
        isSubscribed: true,
      };
    };

    const onListFetchAll = () => {
      browser.runtime.sendMessage({ cmd: 'FetchLists' });
    };

    return {
      store,
      getName,
      isRoute,
      switchStatus,
      onListNew,
      onListImport,
      onListSubscribe,
      onListFetchAll,
    };
  },
});
</script>

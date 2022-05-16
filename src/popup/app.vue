<template>
  <div class="request-x-popup">
    <div class="flex p-4 items-center text-lg">
      <img class="w-8 mr-4" src="/public/images/icon_48.png" />
      <div class="flex-1">
        Request X
        <span class="version" v-text="version"></span>
      </div>
      <a class="text-sm" @click.prevent="openDashboard">Dashboard</a>
    </div>
    <div class="mb-2 px-2">
      <input type="search" v-model="filter" placeholder="Filter by name" />
    </div>
    <div class="popup-enabled-lists" v-if="hasLists">
      <div
        v-for="(lists, group) in listGroups"
        :key="group"
        class="list-section"
      >
        <div
          class="list-section-title"
          v-text="`${SECTION_TITLE_MAP[group]} (${lists.length})`"
        ></div>
        <ul>
          <li
            v-for="(item, itemIndex) in lists"
            :key="itemIndex"
            class="list-item"
            :class="{ enabled: item.enabled }"
            :title="getName(item)"
            @click.prevent.stop="onToggle(item)"
          >
            <span class="list-section-status"></span>
            <span class="mx-1 flex-1 truncate" v-text="getName(item)"></span>
            <span
              class="list-section-badge"
              v-if="item.subscribeUrl"
              title="Subscribed"
            >
              s
            </span>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, ref } from 'vue';
import { pick } from 'lodash-es';
import { browser, sendCommand } from '@/common/browser';
import { SECTION_TITLE_MAP } from '@/common/constants';
import { getName } from '@/common/util';
import type { ListData } from '@/types';
import { store, filterLists, trackListToggle } from './store';

const manifest = browser.runtime.getManifest();
const openDashboard = () => {
  browser.runtime.openOptionsPage();
};

export default defineComponent({
  setup() {
    const filter = ref('');

    const listGroups = computed(() => {
      const lowerValue = filter.value.toLowerCase();
      const predicate = lowerValue
        ? (list: ListData) => list.name.toLowerCase().includes(lowerValue)
        : (list: ListData) =>
            list.enabled || store.recentlyDisabledListIds.includes(list.id);
      return filterLists(predicate);
    });

    const hasLists = computed(() => {
      return Object.values(listGroups.value).some((lists) => lists.length);
    });

    const onToggle = (item: ListData) => {
      item.enabled = !item.enabled;
      sendCommand('UpdateList', pick(item, ['id', 'type', 'enabled']));
      trackListToggle(item.id, item.enabled);
    };

    return {
      SECTION_TITLE_MAP,
      filter,
      getName,
      store,
      openDashboard,
      version: manifest.version,
      listGroups,
      hasLists,
      onToggle,
    };
  },
});
</script>

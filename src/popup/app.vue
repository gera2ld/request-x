<template>
  <div class="request-x-popup">
    <div class="flex p-4 items-center text-lg">
      <img class="w-8 mr-4" :src="'/public/images/icon_48.png'" />
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
          v-text="
            `${SECTION_TITLE_MAP[group]} (${lists.filter((item) => item.enabled).length})`
          "
        ></div>
        <div>
          <ListItem
            v-for="(item, itemIndex) in lists"
            :key="itemIndex"
            :item="item"
            :errors="store.ruleErrors[item.id]"
            @click.stop="onToggle(item)"
            @error-click.stop="onOpenList(item)"
          >
            <template #suffix v-if="!store.ruleErrors[item.id]">
              <div class="ml-1 text-zinc-600" @click.stop="onOpenList(item)">
                <IconOpen />
              </div>
            </template>
          </ListItem>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import IconOpen from '~icons/mdi/open-in-new';
import { SECTION_TITLE_MAP } from '@/common/constants';
import { sendMessage } from '@/common/util';
import type { ListData } from '@/types';
import { mapValues, pick } from 'lodash-es';
import { computed, ref } from 'vue';
import { store, trackListToggle } from './store';
import ListItem from '@/common/components/list-item.vue';

const { version } = chrome.runtime.getManifest();
const openDashboard = () => {
  chrome.runtime.openOptionsPage();
};

const filter = ref('');

const listGroups = computed(() => {
  const lowerValue = filter.value.toLowerCase();
  const predicate = lowerValue
    ? (list: ListData) => list.name.toLowerCase().includes(lowerValue)
    : (list: ListData) =>
        list.enabled || store.recentlyDisabledListIds.includes(list.id);
  return mapValues(store.lists, (group) => group.filter(predicate));
});

const hasLists = computed(() => {
  return Object.values(listGroups.value).some((lists) => lists.length);
});

const onToggle = (item: ListData) => {
  item.enabled = !item.enabled;
  sendMessage('SaveLists', [pick(item, ['id', 'enabled'])]);
  trackListToggle(item.id, item.enabled);
};

const onOpenList = (item: ListData) => {
  sendMessage('CreateAction', { name: 'OpenList', payload: item.id });
};
</script>

<template>
  <div class="nav">
    <div class="flex-1 overflow-y-auto">
      <section class="nav-section">
        <div class="nav-section-title">Settings</div>
        <a
          class="nav-item"
          :class="{ active: isRoute('settings', 'general') }"
          href="#settings/general"
        >
          General
        </a>
      </section>
      <section class="nav-section">
        <div class="flex">
          <div class="nav-section-title flex-1">Lists</div>
          <VlDropdown align="right" :closeAfterClick="true">
            <template v-slot:toggle>
              <button class="py-0">&mldr;</button>
            </template>
            <div class="dropdown-menu w-24">
              <div @click.prevent="onListNew">Create new</div>
              <div @click.prevent="onListImport">Import</div>
              <div @click.prevent="onListSubscribe">Subscribe</div>
              <div @click.prevent="onListFetchAll">Fetch all</div>
            </div>
          </VlDropdown>
        </div>
        <ListSection :lists="store.lists.request" type="request">
          <template #title>Request Interception</template>
        </ListSection>
        <ListSection :lists="store.lists.cookie" type="cookie">
          <template #title>Cookie Interception</template>
        </ListSection>
      </section>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { pick } from 'lodash-es';
import VlDropdown from 'vueleton/lib/dropdown';
import browser from '#/common/browser';
import { store, dump, loadFile, blob2Text, isRoute } from '../util';
import ListSection from './list-section.vue';

export default defineComponent({
  components: {
    ListSection,
    VlDropdown,
  },
  setup() {
    const onListNew = () => {
      store.editList = {
        name: '',
        type: 'request',
      };
    };

    const onListImport = async () => {
      const blob = await loadFile();
      const text = await blob2Text(blob);
      const data = JSON.parse(text);
      dump(pick(data, ['name', 'type', 'rules']));
    };

    const onListSubscribe = () => {
      store.editList = {
        name: '',
        type: 'request',
        subscribeUrl: '',
        isSubscribed: true,
      };
    };

    const onListFetchAll = () => {
      browser.runtime.sendMessage({ cmd: 'FetchLists' });
    };

    return {
      store,
      isRoute,
      onListNew,
      onListImport,
      onListSubscribe,
      onListFetchAll,
    };
  },
});
</script>

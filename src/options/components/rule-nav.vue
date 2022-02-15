<template>
  <div class="nav">
    <div class="flex-1 overflow-y-auto">
      <section class="nav-section mb-4">
        <a href="#" class="text-xl">Request X</a>
        <span class="ml-4" v-text="`v${version}`"></span>
      </section>
      <section class="nav-section">
        <div class="flex">
          <div class="nav-section-title flex-1">Lists</div>
          <VlDropdown align="right" :closeAfterClick="true">
            <template v-slot:toggle>
              <button class="py-0">&mldr;</button>
            </template>
            <div class="dropdown-menu">
              <div @click.prevent="onListNew">Create new</div>
              <div @click.prevent="onListImport">Import</div>
              <div @click.prevent="onListSubscribe">Subscribe</div>
              <div @click.prevent="onListFetchAll">Fetch all</div>
            </div>
          </VlDropdown>
        </div>
        <ListSection type="request" :lists="store.lists.request">
          <template #title>Request Interception</template>
        </ListSection>
        <ListSection
          type="cookie"
          :lists="store.lists.cookie"
          :unsupported="!store.features.cookies"
        >
          <template #title>Cookie Interception</template>
          <template #unsupported>
            <div class="subtle">Not supported in this browser.</div>
          </template>
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
import { store, dump, loadFile, blob2Text, isRoute, editList } from '../util';
import ListSection from './list-section.vue';

const manifest = browser.runtime.getManifest();

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
      data.type ??= 'request';
      dump(pick(data, ['name', 'type', 'rules']));
    };

    const onListSubscribe = () => {
      editList({
        subscribeUrl: '',
        isSubscribed: true,
      });
    };

    const onListFetchAll = () => {
      browser.runtime.sendMessage({ cmd: 'FetchLists' });
    };

    return {
      store,
      isRoute,
      version: manifest.version,
      onListNew,
      onListImport,
      onListSubscribe,
      onListFetchAll,
    };
  },
});
</script>

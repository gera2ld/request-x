<template>
  <VlModal :show="!!store.editList" @close="onListCancel" transition="fade">
    <form class="modal" v-if="store.editList" @submit.prevent="onListSave">
      <h3 class="font-bold mb-2" v-text="modalTitle" />
      <div class="modal-group" v-if="!store.editList.id">
        <div>Type:</div>
        <div class="flex">
          <label
            class="flex mr-4 items-center"
            v-for="type in ['request', 'cookie']"
            :key="type"
          >
            <input
              class="mr-1"
              type="radio"
              :value="type"
              v-model="store.editList.type"
            />
            {{ formatType(type) }}
          </label>
        </div>
      </div>
      <div class="modal-group" v-else>
        <div>Type: {{ formatType(store.editList.type) }}</div>
      </div>
      <div class="modal-group" v-if="!store.editList.isSubscribed">
        <div>Name:</div>
        <input
          type="text"
          v-model="store.editList.name"
          :placeholder="store.editList.defaultName"
        />
      </div>
      <div class="modal-group" v-if="store.editList.isSubscribed">
        <div>Subscribe URL:</div>
        <input
          type="text"
          :class="{ error: errors.subscribeUrl }"
          :value="store.editList.subscribeUrl"
          :readonly="store.editList.isEdit"
          @input="
            store.editList.isEdit ||
              (store.editList.subscribeUrl = $event.target.value)
          "
        />
      </div>
      <div class="mt-1 text-right">
        <button class="mr-1" type="submit">OK</button>
        <button @click.prevent="onListCancel">Cancel</button>
      </div>
    </form>
  </VlModal>
</template>

<script lang="ts">
import { computed, defineComponent } from 'vue';
import { pick } from 'lodash-es';
import VlModal from 'vueleton/lib/modal';
import { store, isValidURL, dump } from '../util';

export default defineComponent({
  components: {
    VlModal,
  },
  setup() {
    const modalTitle = computed(() => {
      if (!store.editList) return null;
      if (store.editList.editing) return 'Edit list';
      if (store.editList.isSubscribed) return 'Subscribe list';
      return 'Create list';
    });

    const errors = computed(() => {
      const { editList } = store;
      return {
        subscribeUrl:
          editList.isSubscribed && !isValidURL(editList.subscribeUrl),
      };
    });

    const onListCancel = () => {
      store.editList = null;
    };

    const onListSave = () => {
      if (Object.values(errors.value).some(Boolean)) return;
      dump(pick(store.editList, ['id', 'name', 'type', 'subscribeUrl']));
      onListCancel();
    };

    const formatType = (type: string) => type[0].toUpperCase() + type.slice(1);

    return {
      store,
      errors,
      modalTitle,
      onListCancel,
      onListSave,
      formatType,
    };
  },
});
</script>

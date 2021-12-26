<template>
  <VlModal :show="!!store.editList" @close="onListCancel" transition="fade">
    <form
      class="w-1/2 mx-auto p-2 bg-white"
      v-if="store.editList"
      @submit.prevent="onListSave"
    >
      <h3 class="font-bold mb-2" v-text="modalTitle" />
      <div class="nav-modal-group" v-if="!store.editList.isSubscribed">
        <div>Name:</div>
        <input
          v-model="store.editList.name"
          :placeholder="store.editList.defaultName"
        />
      </div>
      <div class="nav-modal-group" v-if="store.editList.isSubscribed">
        <div>Subscribe URL:</div>
        <input
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
      dump(pick(store.editList, ['id', 'name', 'subscribeUrl']));
      onListCancel();
    };

    return {
      store,
      errors,
      modalTitle,
      onListCancel,
      onListSave,
    };
  },
});
</script>

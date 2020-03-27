<template>
  <modal :visible="!!store.editList" @close="onListCancel" transition="fade">
    <form class="nav-modal" v-if="store.editList" @submit.prevent="onListSave">
      <h3 v-text="modalTitle" />
      <div class="nav-modal-group">
        <div>Name:</div>
        <input v-model="store.editList.name" :placeholder="store.editList.defaultName">
      </div>
      <div class="nav-modal-group" v-if="store.editList.isSubscribed">
        <div>Subscribe URL:</div>
        <input
          :class="{ error: errors.subscribeUrl }"
          :value="store.editList.subscribeUrl"
          :readonly="store.editList.isEdit"
          @input="store.editList.isEdit || (store.editList.subscribeUrl = $event.target.value)"
        />
      </div>
      <div class="nav-modal-buttons">
        <button type="submit">OK</button>
        <button @click.prevent="onListCancel">Cancel</button>
      </div>
    </form>
  </modal>
</template>

<script>
import { debounce, store, isValidURL } from '../utils';
import { Modal } from './vueleton';

export default {
  components: {
    Modal,
  },
  data() {
    return {
      store,
      errors: {},
    };
  },
  computed: {
    modalTitle() {
      if (!store.editList) return null;
      if (store.editList.isEdit) return 'Edit list';
      if (store.editList.isSubscribed) return 'Subscribe list';
      return 'Create list';
    },
  },
  watch: {
    'store.editList': {
      deep: true,
      handler() {
        this.updateErrors();
      },
    },
  },
  methods: {
    checkErrors() {
      const editList = this.store.editList || {};
      this.errors = {
        subscribeUrl: editList.isSubscribed && !isValidURL(editList.subscribeUrl),
      };
    },
    onListCancel() {
      store.editList = null;
    },
  },
  created() {
    this.updateErrors = debounce(this.checkErrors, 200);
  },
};
</script>

<style>
.nav-modal {
  width: 30rem;
  margin: 0 auto;
  padding: 1rem;
  background: white;
  &-buttons {
    margin-top: .5rem;
    text-align: right;
  }
  h3 {
    margin-bottom: 1rem;
  }
}
.nav-modal-group {
  text-align: left;
  > input {
    width: 100%;
    height: 2rem;
  }
  ~ .nav-modal-group {
    margin-top: .5rem;
  }
}
</style>

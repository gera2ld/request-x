<template>
  <form @submit.prevent="onSave">
    <div class="flex-row">
      <input class="flex-auto" :class="{ error: !editing.status.title }" v-model="editing.data.title" :placeholder="editing.data.name || 'Name'">
    </div>
    <div class="flex-row" v-if="editing.extra.subscribe">
      <input class="flex-auto" :class="{ error: !editing.status.subscribeUrl }"
      v-model="editing.data.subscribeUrl" placeholder="Subscribe URL">
    </div>
    <div>
      <button type="submit" class="item-btn">Save</button>
      <button type="button" class="item-btn" @click="onCancel">Cancel</button>
      <button type="button" class="item-btn" v-if="canDelete" @click="onDelete">Delete</button>
    </div>
  </form>
</template>

<script>
import { store, dump, remove, pickData, edit } from '../utils';

export default {
  data() {
    return store;
  },
  computed: {
    canDelete() {
      return this.editing.data.id && this.lists.length > 1;
    },
  },
  methods: {
    onSave() {
      const fields = ['id', 'title', this.editing.extra.subscribe && 'subscribeUrl'].filter(Boolean);
      const data = pickData(this.editing.data, fields);
      dump(data).then(() => edit());
    },
    onCancel() {
      edit();
    },
    onDelete() {
      remove(this.editing.data.id);
      edit();
    },
  },
};
</script>

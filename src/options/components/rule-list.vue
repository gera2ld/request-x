<template>
  <form class="rule-list-form" v-if="editing" @submit.prevent="onSubmit">
    <div class="flex">
      <div class="rule-list-label">List name:</div>
      <input class="flex-auto" type="text" v-model="input.title" :placeholder="list.name || 'Name'">
    </div>
    <div class="flex" v-if="list.subscribeUrl">
      <div class="rule-list-label">Subscribed from:</div>
      <input class="flex-auto" type="text" v-model="input.subscribeUrl" placeholder="Subscribe URL">
    </div>
    <div class="rule-list-buttons">
      <button type="submit">OK</button>
      <button type="reset" @click="onCancel">Cancel</button>
    </div>
  </form>
  <div v-else>
    <div>
      List name:
      <em v-text="list.title || list.name || 'No name'"></em>
    </div>
  </div>
</template>

<script>
import { isValidURL, debounce } from '../util';

export default {
  props: [
    'editing',
    'list',
  ],
  data() {
    return {
      input: {
        title: null,
        subscribeUrl: null,
      },
      errors: {},
    };
  },
  watch: {
    editing() {
      this.input = {
        title: this.list.title,
        subscribeUrl: this.list.subscribeUrl,
      };
    },
    input: {
      deep: true,
      handler() {
        this.updateErrors();
      },
    },
  },
  methods: {
    checkErrors() {
      this.errors = {
        subscribeUrl: !this.input.subscribeUrl || isValidURL(this.input.subscribeUrl),
      };
    },
    onSubmit() {
      this.checkErrors();
      if (Object.keys(this.errors).some(key => this.errors[key])) return;
      this.$emit('submit', {
        title: this.input.title,
        subscribeUrl: this.input.subscribeUrl,
      });
    },
    onCancel() {
      this.$emit('cancel');
    },
  },
  created() {
    this.updateErrors = debounce(this.checkErrors, 200);
  },
};
</script>

<style>
.rule-list-form {
  input {
    width: 100%;
    height: 100%;
  }
}
.rule-list-label {
  margin-right: .5rem;
}
</style>

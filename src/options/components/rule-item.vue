<template>
  <div class="rule-item">
    <form class="flex" v-if="editing" @submit.prevent="onSubmit">
      <div class="w-20 mr-1" :class="{error: errors.method}">
        <input type="text" v-model="input.method" placeholder="Method" ref="method">
        <div class="form-hint">
          <div>*</div>
          <div>GET</div>
          <div>POST</div>
          <div>HEAD</div>
          <div>PUT</div>
          <div>PATCH</div>
          <div>DELETE</div>
        </div>
      </div>
      <div class="flex-1">
        <div :class="{error: errors.url}">
          <input type="text" v-model="input.url" placeholder="URL">
          <div class="form-hint">
            A <a target="_blank" href="https://developer.chrome.com/extensions/match_patterns">match pattern</a> or a RegExp (e.g. <code>/^https:/</code>).
          </div>
        </div>
        <div class="mt-1" :class="{error: errors.target}">
          <input type="text" v-model="input.target" placeholder="Target">
          <div class="form-hint">
            Leave empty to block the request, or redirect to a new URL.
          </div>
        </div>
      </div>
      <div class="ml-1">
        <button class="mr-1" type="submit">Save</button>
        <button type="reset" @click="onCancel">Cancel</button>
      </div>
    </form>
    <div class="flex items-center" v-else>
      <div class="w-20 mr-1" v-text="rule.method"></div>
      <div class="flex-1 min-w-0 break-words" v-text="rule.url"></div>
      <div class="p-1 text-xs text-gray-600 uppercase" v-text="getTargetBadge(rule)"></div>
      <div class="ml-1" v-if="editable">
        <button class="mr-1" @click="onEdit">Edit</button>
        <button @click="onRemove">Remove</button>
      </div>
    </div>
  </div>
</template>

<script>
import {
  isValidMethod, isValidPattern, isValidTarget, debounce,
} from '../util';

export default {
  props: [
    'rule',
    'editable',
    'editing',
    'extra',
  ],
  data() {
    return {
      input: {
        method: null,
        url: null,
        target: null,
      },
      errors: {},
    };
  },
  watch: {
    'input.method'(method, lastMethod) {
      if (method && method !== lastMethod) {
        this.input.method = method.toUpperCase();
      }
    },
    input: {
      deep: true,
      handler() {
        this.updateErrors();
      },
    },
    editing: 'initEdit',
  },
  methods: {
    initEdit() {
      if (this.editing) {
        this.input = {
          method: this.rule.method,
          url: this.rule.url,
          target: this.rule.target,
        };
        this.$nextTick(() => {
          const { method } = this.$refs;
          if (method) method.focus();
        });
      }
    },
    checkErrors() {
      this.errors = {
        method: !isValidMethod(this.input.method),
        url: !isValidPattern(this.input.url),
        target: this.input.target && !isValidTarget(this.input.target),
      };
    },
    getTargetBadge(rule) {
      return rule.target ? 'redirect' : 'block';
    },
    onEdit() {
      this.$emit('edit');
    },
    onRemove() {
      this.$emit('remove');
    },
    onSubmit() {
      this.checkErrors();
      if (Object.keys(this.errors).some(key => this.errors[key])) return;
      this.$emit('submit', {
        extra: this.extra,
        input: this.input,
      });
    },
    onCancel() {
      this.$emit('cancel');
    },
  },
  created() {
    this.initEdit();
    this.updateErrors = debounce(this.checkErrors, 200);
  },
};
</script>

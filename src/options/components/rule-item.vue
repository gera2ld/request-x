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
            Set to <code>-</code> for blocking the request, <code>=</code> for keeping the original, or a new URL to redirect.
          </div>
        </div>
        <div class="mt-1">
          <textarea type="text" v-model="input.headers" placeholder="Request headers" rows="5"></textarea>
          <div class="form-hint">
            Modify request headers, each in a line, prefixed with <code>-</code> to remove, e.g.<br>
            <code>x-added-by: request-x</code>, <code>authorization: token just-keep-my-token</code>, <code>-x-to-remove</code>.
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
      <div class="p-1 text-xs text-gray-600 uppercase" v-for="badge in badges" v-text="badge" :key="badge"></div>
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
      input: null,
      errors: {},
    };
  },
  computed: {
    badges() {
      const { rule } = this;
      return [
        rule.target === '-' && 'block',
        rule.target?.length > 1 && 'redirect',
        rule.headers.length && 'headers',
      ].filter(Boolean);
    },
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
          headers: (this.rule.headers || []).map(pair => pair.join(': ')).join('\n'),
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
        url: !this.input.url || !isValidPattern(this.input.url),
        target: this.input.target && !['-', '='].includes(this.input.target) && !isValidTarget(this.input.target),
      };
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

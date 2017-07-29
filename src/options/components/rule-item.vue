<template>
  <div class="rule-item">
    <form class="flex" v-if="editing" @submit.prevent="onSubmit">
      <div class="rule-item-method" :class="{error: errors.method}">
        <input type="text" v-model="input.method" placeholder="Method" ref="method">
        <div class="rule-item-hint">
          <div>*</div>
          <div>GET</div>
          <div>POST</div>
          <div>HEAD</div>
          <div>PUT</div>
          <div>DELETE</div>
        </div>
      </div>
      <div class="rule-item-url flex-auto" :class="{error: errors.url}">
        <input type="text" v-model="input.url" placeholder="URL">
        <div class="rule-item-hint">
          A <a target="_blank" href="https://developer.chrome.com/extensions/match_patterns">match pattern</a>.
        </div>
      </div>
      <div class="rule-item-buttons">
        <button type="submit">Save</button>
        <button type="reset" @click="onCancel">Cancel</button>
      </div>
    </form>
    <div class="flex" v-else>
      <div class="rule-item-method" v-text="rule.method"></div>
      <div class="rule-item-url flex-auto" v-text="rule.url"></div>
      <div class="rule-item-buttons" v-if="editable">
        <button class="item-btn" @click="onEdit">Edit</button>
        <button class="item-btn" @click="onRemove">Remove</button>
      </div>
    </div>
  </div>
</template>

<script>
import { isValidMethod, isValidURLPattern, debounce } from '../utils';

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
        url: !isValidURLPattern(this.input.url),
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

<style>
.rule-item {
  padding: .5rem;
  input {
    width: 100%;
    height: 2rem;
  }
  &-buttons {
    margin-left: .5rem;
  }
  &-method {
    flex: 0 0 5rem;
    margin-right: .5rem;
  }
  &-url {
    word-wrap: break-word;
  }
  &-buttons {
    margin-left: .5rem;
  }
  &-hint {
    padding: .5rem;
    background: #f0f0f0;
  }
}
</style>

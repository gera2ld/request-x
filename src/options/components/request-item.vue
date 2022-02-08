<template>
  <form
    v-if="showDetail"
    class="grid grid-cols-[5rem_auto_min-content] gap-2"
    @submit.prevent="onSubmit"
    ref="refForm"
  >
    <div class="row-span-5" :class="{ error: errors.method }">
      <input
        type="text"
        :value="input.method"
        @input="onMethodInput"
        placeholder="Method"
        :readonly="!editable"
      />
      <div class="form-hint">
        <div
          class="cursor-pointer hover:font-bold"
          v-for="method in methodList"
          :key="method"
          v-text="method"
          @click="editable && (input.method = method)"
        ></div>
      </div>
    </div>
    <div :class="{ error: errors.url }">
      <input
        type="text"
        v-model="input.url"
        placeholder="URL"
        :readonly="!editable"
      />
      <div class="form-hint">
        A
        <a
          target="_blank"
          href="https://developer.chrome.com/extensions/match_patterns"
          >match pattern</a
        >
        or a RegExp (e.g. <code>/^https:/</code>).
      </div>
    </div>
    <div class="row-span-2 whitespace-nowrap">
      <button class="mr-1" type="submit" v-if="editable">Save</button>
      <button
        type="reset"
        @click="onCancel"
        v-text="editable ? 'Cancel' : 'Close'"
      ></button>
    </div>
    <div :class="{ error: errors.target }">
      <input
        type="text"
        v-model="input.target"
        placeholder="Target"
        :readonly="!editable"
      />
      <div class="form-hint">
        Set to <code>-</code> for blocking the request, <code>=</code> for
        keeping the original, or a new URL to redirect.
      </div>
    </div>
    <div>
      <textarea
        type="text"
        v-model="input.reqHeaders"
        placeholder="Modify request headers"
        rows="3"
        :readonly="!editable"
      ></textarea>
    </div>
    <div class="mt-1">Request headers</div>
    <div>
      <textarea
        type="text"
        :class="{ subtle: !store.features.responseHeaders }"
        v-model="input.resHeaders"
        placeholder="Modify response headers"
        rows="3"
        :readonly="!editable"
      ></textarea>
    </div>
    <div class="mt-1">
      Response headers
      <span v-if="!store.features.responseHeaders" class="label-unsupported">
        {{ ' (unsupported)' }}
      </span>
    </div>
    <div>
      <div class="form-hint">
        Modify headers, each in a line, prefix with
        <code>!</code> to remove, e.g.<br />
        <code>x-powered-by: request-x</code>,
        <code>authorization: token always-add-my-token</code>,
        <code>!x-to-remove</code>.
      </div>
    </div>
  </form>
  <RuleItemView v-else :selected="selected" :badges="badges" @select="onSelect">
    <div class="w-20 mr-1" v-text="rule.method"></div>
    <div class="flex-1 min-w-0 break-words" v-text="rule.url"></div>
  </RuleItemView>
</template>

<script lang="ts">
import {
  PropType,
  computed,
  defineComponent,
  reactive,
  watch,
  ref,
  nextTick,
  onMounted,
} from 'vue';
import { HttpHeaderItem, RequestData } from '#/types';
import { isValidMethod, isValidPattern, isValidTarget, store } from '../util';
import RuleItemView from './rule-item-view.vue';

const methodList = ['*', 'GET', 'POST', 'HEAD', 'PUT', 'PATCH', 'DELETE'];

function stringifyHeaders(headers?: HttpHeaderItem[]) {
  return (
    headers?.map(({ name, value }) => `${name}: ${value}`).join('\n') || ''
  );
}

function parseHeaders(headers: string) {
  return headers
    .split('\n')
    .filter(Boolean)
    .map((line: string) => {
      let i = line.indexOf(':');
      if (i < 0) i = line.length;
      const name = line.slice(0, i).trim();
      const value = line.slice(i + 1).trim();
      return { name, value };
    });
}

export default defineComponent({
  components: {
    RuleItemView,
  },
  props: {
    rule: {
      type: Object as PropType<RequestData>,
    },
    showDetail: Boolean,
    selected: Boolean,
    editable: Boolean,
  },
  emits: ['cancel', 'submit', 'select'],
  setup(props, context) {
    const input = reactive<{
      method?: string;
      url?: string;
      target?: string;
      reqHeaders?: string;
      resHeaders?: string;
    }>({});
    const refForm = ref(null);

    const reset = () => {
      if (!props.showDetail) return;
      const { rule } = props;
      Object.assign(input, {
        method: rule.method,
        url: rule.url,
        target: rule.target || '=',
        reqHeaders: stringifyHeaders(rule.requestHeaders),
        resHeaders: stringifyHeaders(rule.responseHeaders),
      });
      nextTick(() => {
        if (props.editable) {
          refForm.value?.querySelector('input,select')?.focus();
        }
      });
    };

    const errors = computed(() => {
      return {
        method: !isValidMethod(input.method),
        url: !input.url || !isValidPattern(input.url),
        target:
          !input.target ||
          (!['-', '='].includes(input.target) && !isValidTarget(input.target)),
      };
    });

    const badges = computed(() => {
      const { rule } = props;
      return [
        rule.target === '-' && 'block',
        rule.target?.length > 1 && 'redirect',
        rule.requestHeaders?.length && 'req_headers',
        rule.responseHeaders?.length && 'res_headers',
      ].filter(Boolean);
    });

    const onMethodInput = (e: InputEvent) => {
      input.method = (e.target as HTMLInputElement).value.toUpperCase();
    };

    const onCancel = () => {
      context.emit('cancel');
    };

    const onSubmit = () => {
      if (Object.values(errors.value).some(Boolean)) return;
      context.emit('submit', {
        rule: {
          method: input.method,
          url: input.url,
          target: input.target,
          requestHeaders: parseHeaders(input.reqHeaders),
          responseHeaders: parseHeaders(input.resHeaders),
        } as RequestData,
      });
    };

    const onSelect = (e: any) => {
      context.emit('select', e);
    };

    watch(() => props.showDetail, reset);
    onMounted(reset);

    return {
      store,
      input,
      errors,
      badges,
      refForm,
      methodList,
      onMethodInput,
      onCancel,
      onSubmit,
      onSelect,
    };
  },
});
</script>

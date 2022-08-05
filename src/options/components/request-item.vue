<template>
  <form
    v-if="showDetail"
    class="grid grid-cols-[8rem_auto_9rem] gap-2"
    @submit.prevent="onSubmit"
    ref="refForm"
  >
    <div class="row-span-4" :class="{ error: errors.method }">
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
        >
          match pattern
        </a>
        or a RegExp (e.g. <code>/^https:/</code>).
      </div>
    </div>
    <div class="whitespace-nowrap">
      <button class="mr-1" type="submit" v-if="editable">Save</button>
      <button
        type="reset"
        @click="onCancel"
        v-text="editable ? 'Cancel' : 'Close'"
      ></button>
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
    <div></div>
    <div>
      <select v-model="input.type" :disabled="!editable">
        <option value="">Noop</option>
        <option value="block">Block</option>
        <option value="redirect">Redirect</option>
        <option value="replace">Replace</option>
      </select>
      <div class="form-hint">Action type</div>
    </div>
    <div :class="{ error: errors.target }">
      <textarea
        :value="noTarget ? '' : input.target"
        @input="!noTarget && (input.target = ($event.target as HTMLInputElement).value)"
        :placeholder="noTarget ? 'No target' : 'Set target here'"
        :readonly="!editable"
        :disabled="noTarget"
      />
      <div class="form-hint">
        <ul>
          <li>
            <code>Noop</code> / <code>Block</code> - No target is allowed.
          </li>
          <li><code>Redirect</code> - A valid URL must be set.</li>
          <li>
            <code>Replace</code> - Any text content is allowed and will replace
            the response content by redirecting it to a dataURL.
          </li>
        </ul>
      </div>
    </div>
    <div v-if="input.type === 'replace'">
      <input type="text" v-model="input.contentType" />
      <div class="form-hint">Content type</div>
    </div>
  </form>
  <RuleItemView v-else :selected="selected" :badges="badges" @select="onSelect">
    <div class="w-20 mr-1" v-text="rule.method"></div>
    <div class="flex-1 min-w-0 break-words" v-text="rule.url"></div>
  </RuleItemView>
</template>

<script lang="ts">
import {
  computed,
  defineComponent,
  reactive,
  watch,
  ref,
  nextTick,
  onMounted,
} from 'vue';
import type { PropType } from 'vue';
import type { HttpHeaderItem, RequestData } from '@/types';
import { store } from '../store';
import {
  isValidMethod,
  isValidPattern,
  isValidTarget,
  focusInput,
} from '../util';
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

function parseTarget(target: string) {
  let type = '';
  let contentType = 'text/plain';
  if (target === '-') {
    type = 'block';
    target = '';
  } else if (target[0] === '<') {
    type = 'replace';
    const i = target.indexOf('\n');
    contentType = target.slice(1, i);
    target = target.slice(i + 1);
  } else if (target && target !== '=') {
    type = 'redirect';
  } else {
    target = '';
  }
  return { type, contentType, target };
}

export default defineComponent({
  components: {
    RuleItemView,
  },
  props: {
    rule: {
      type: Object as PropType<RequestData>,
      required: true,
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
      type: '' | 'block' | 'redirect' | 'replace';
      contentType: string;
      reqHeaders?: string;
      resHeaders?: string;
    }>({
      type: '',
      contentType: '',
    });
    const refForm = ref<HTMLFormElement | undefined>(undefined);

    const reset = () => {
      if (!props.showDetail) return;
      const { rule } = props;
      const { type, contentType, target } = parseTarget(rule.target);
      Object.assign(input, {
        method: rule.method,
        url: rule.url,
        type,
        contentType,
        target,
        reqHeaders: stringifyHeaders(rule.requestHeaders),
        resHeaders: stringifyHeaders(rule.responseHeaders),
      });
      nextTick(() => {
        if (props.editable) {
          focusInput(refForm.value);
        }
      });
    };

    const noTarget = computed(() => ['', 'block'].includes(input.type));
    const errors = computed(() => {
      return {
        method: !isValidMethod(input.method ?? ''),
        url: !input.url || !isValidPattern(input.url),
        target:
          !noTarget.value &&
          input.type === 'redirect' &&
          (!input.target || !isValidTarget(input.target)),
      };
    });

    const badges = computed(() => {
      const { rule } = props;
      const { type } = parseTarget(rule.target);
      return [
        type,
        rule.requestHeaders?.length && 'req_headers',
        rule.responseHeaders?.length && 'res_headers',
      ].filter(Boolean) as string[];
    });

    const onMethodInput = (e: Event) => {
      input.method = (e.target as HTMLInputElement).value.toUpperCase();
    };

    const onCancel = () => {
      context.emit('cancel');
    };

    const onSubmit = () => {
      if (Object.values(errors.value).some(Boolean)) return;
      let target: string;
      if (input.type === 'block') target = '-';
      else if (input.type === 'replace')
        target = `<${input.contentType}\n${input.target}`;
      else target = (input.target || '=').trim();
      context.emit('submit', {
        rule: {
          method: input.method,
          url: input.url,
          target,
          requestHeaders: parseHeaders(input.reqHeaders ?? ''),
          responseHeaders: parseHeaders(input.resHeaders ?? ''),
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
      noTarget,
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

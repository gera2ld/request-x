<template>
  <form
    v-if="showDetail"
    class="grid grid-cols-[8rem_auto_9rem] children:m-1"
    @submit.prevent="onSubmit"
    ref="refForm"
  >
    <div class="row-span-4">
      <div
        class="request-method-item"
        :class="{ active: !input.methods.size }"
        @click="editable && handleToggleMethod('')"
      >
        <div class="w-4 mr-1">
          <IconCheck />
        </div>
        <span class="flex-1">No Limit</span>
      </div>
      <div
        v-for="method in methodList"
        class="request-method-item"
        :class="{ active: input.methods.has(method) }"
        :key="method"
        @click="editable && handleToggleMethod(method)"
      >
        <div class="w-4 mr-1">
          <IconCheck />
        </div>
        <span class="flex-1" v-text="method.toUpperCase()"></span>
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
        <p>One of the following:</p>
        <ul class="list-disc pl-4">
          <li>
            a
            <a
              target="_blank"
              href="https://developer.chrome.com/docs/extensions/reference/api/declarativeNetRequest#property-RuleCondition-urlFilter"
            >
              URL filter
            </a>
          </li>
          <li>
            a regular expression, e.g. <code>/^https://www\./</code>, note that
            <code>/</code> does not have to be escaped.
          </li>
        </ul>
      </div>
    </div>
    <div>
      <select v-model="input.type" :disabled="!editable">
        <option value="block">Block</option>
        <option value="redirect">Redirect</option>
        <option value="replace">Replace</option>
        <option value="headers">Headers</option>
      </select>
      <div class="form-hint">Action type</div>
    </div>
    <template v-if="input.type !== 'headers'">
      <div
        :class="{ error: errors.target }"
        v-if="input.type === 'redirect' || input.type === 'replace'"
      >
        <textarea
          :value="noTarget ? '' : input.target"
          @input="
            !noTarget &&
              (input.target = ($event.target as HTMLInputElement).value)
          "
          :placeholder="noTarget ? 'No target' : 'Set target here'"
          :readonly="!editable"
          :disabled="noTarget"
        />
        <div class="form-hint">
          <p>If the original URL is matched by</p>
          <ul class="list-disc pl-4" v-if="input.type === 'redirect'">
            <li>
              a
              <a
                target="_blank"
                href="https://developer.chrome.com/docs/extensions/reference/api/declarativeNetRequest#property-RuleCondition-urlFilter"
              >
                URL filter</a
              >, it will be redirected to the target.
            </li>
            <li>
              a regular expression, the matched part will be replaced with the
              target.
            </li>
          </ul>
          <p v-else-if="input.type === 'replace'">
            Any text content is allowed and will replace the response content by
            redirecting it to a dataURL.
          </p>
        </div>
      </div>
      <div v-if="input.type === 'replace'">
        <input type="text" v-model="input.contentType" />
        <div class="form-hint">Content type</div>
      </div>
    </template>
    <template v-else>
      <div>
        <textarea
          type="text"
          v-model="input.reqHeaders"
          placeholder="Modify request headers"
          rows="3"
          :readonly="!editable"
        ></textarea>
      </div>
      <div class="pt-1">Request headers</div>
      <div>
        <textarea
          type="text"
          v-model="input.resHeaders"
          placeholder="Modify response headers"
          rows="3"
          :readonly="!editable"
        ></textarea>
      </div>
      <div class="pt-1">Response headers</div>
      <div>
        <div class="form-hint">
          Modify headers, each in a line, prefix with
          <code>!</code> to remove, e.g.<br />
          <code>x-powered-by: request-x</code>,
          <code>authorization: token always-add-my-token</code>,
          <code>!x-to-remove</code>.
        </div>
      </div>
    </template>
    <div class="whitespace-nowrap" style="grid-column-start: 3">
      <button class="mr-1" type="submit" v-if="editable">Save</button>
      <button
        type="reset"
        @click="onCancel"
        v-text="editable ? 'Cancel' : 'Close'"
      ></button>
    </div>
  </form>
  <RuleItemView v-else :selected="selected" :badges="badges" @select="onSelect">
    <Toggle
      class="mr-4"
      :class="{ disabled: listDisabled }"
      :active="!!rule.enabled"
      @toggle="handleToggle"
    />
    <div class="w-32 mr-1" v-text="[...rule.methods].join(',') || '*'"></div>
    <div class="flex-1 min-w-0 break-words" v-text="rule.url"></div>
    <div class="mx-2 text-error" v-if="ruleError" :title="ruleError">
      <IconError />
    </div>
  </RuleItemView>
</template>

<script lang="ts" setup>
import Toggle from '@/common/components/toggle.vue';
import type { HttpHeaderItem, RequestData } from '@/types';
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue';
import IconCheck from '~icons/mdi/check';
import IconError from '~icons/mdi/error';
import { ruleActions } from '../actions';
import { currentList, store } from '../store';
import { focusInput } from '../util';
import RuleItemView from './rule-item-view.vue';
import { loadRegExp } from '@/common/util';

const props = defineProps<{
  rule: RequestData;
  index: number;
  showDetail?: boolean;
  selected?: boolean;
  editable?: boolean;
  listDisabled?: boolean;
}>();

const emit = defineEmits<{
  (event: 'cancel'): void;
  (event: 'submit', data: { rule: RequestData }): void;
  (event: 'select', data: { cmdCtrl: boolean; shift: boolean }): void;
}>();

const methodList = ['get', 'post', 'head', 'put', 'patch', 'delete', 'connect'];

const input = reactive<{
  methods: Set<string>;
  url?: string;
  target?: string;
  type: RequestData['type'];
  contentType: string;
  reqHeaders?: string;
  resHeaders?: string;
}>({
  methods: new Set(),
  type: 'block',
  contentType: '',
});
const refForm = ref<HTMLFormElement | undefined>(undefined);

const noTarget = computed(() => ['', 'block'].includes(input.type));
const errors = computed(() => {
  return {
    url: !input.url,
    target: !noTarget.value && input.type === 'redirect' && !input.target,
  };
});
const ruleError = computed(
  () => store.ruleErrors[currentList.value?.id || 0]?.[props.index + 1],
);

const badges = computed(() => {
  const { rule } = props;
  return [
    loadRegExp(rule.url) ? 'regex' : 'url_filter',
    ...(rule.type === 'headers'
      ? [
          rule.requestHeaders?.length ? 'req_headers' : '',
          rule.responseHeaders?.length ? 'res_headers' : '',
        ].filter(Boolean)
      : [rule.type]),
  ];
});

const reset = () => {
  if (!props.showDetail) return;
  const { rule } = props;
  Object.assign(input, {
    methods: new Set(rule.methods || []),
    url: rule.url,
    type: rule.type || 'block',
    contentType: rule.contentType,
    target: rule.target,
    reqHeaders: stringifyHeaders(rule.requestHeaders),
    resHeaders: stringifyHeaders(rule.responseHeaders),
  });
  nextTick(() => {
    if (props.editable) {
      focusInput(refForm.value);
    }
  });
};

const onCancel = () => {
  emit('cancel');
};

const onSubmit = () => {
  if (Object.values(errors.value).some(Boolean)) return;
  if (!input.type) return;
  const rule: RequestData = {
    enabled: props.rule.enabled ?? true,
    type: input.type,
    methods: [...input.methods] as chrome.declarativeNetRequest.RequestMethod[],
    url: input.url || '',
    target: input.target || '',
    contentType: input.contentType,
    requestHeaders: parseHeaders(input.reqHeaders ?? ''),
    responseHeaders: parseHeaders(input.resHeaders ?? ''),
  };
  emit('submit', {
    rule,
  });
};

const onSelect = (e: any) => {
  emit('select', e);
};

watch(() => props.showDetail, reset);
onMounted(reset);

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

function handleToggleMethod(method: string) {
  if (!method) {
    input.methods.clear();
  } else {
    input.methods[input.methods.has(method) ? 'delete' : 'add'](method);
  }
}

function handleToggle() {
  ruleActions.toggle(props.rule);
}
</script>

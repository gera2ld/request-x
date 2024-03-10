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
        <ul>
          <li>
            a
            <a
              target="_blank"
              href="https://developer.mozilla.org/docs/Mozilla/Add-ons/WebExtensions/API/declarativeNetRequest/RuleCondition#urlfilter"
            >
              URL filter
            </a>
          </li>
          <li>
            a regular expression, e.g. <code>/^https://www\./</code>, note that
            <code>/</code> does not have to be escaped
          </li>
        </ul>
      </div>
    </div>
    <div>
      <select v-model="input.type" :disabled="!editable">
        <option value="block">Block</option>
        <option value="redirect">Redirect</option>
        <option value="transform">Transform</option>
        <option value="replace">Replace</option>
        <option value="headers">Headers</option>
      </select>
      <div class="form-hint">Action type</div>
    </div>
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
        <template v-if="input.type === 'redirect'">
          <p>If the original URL is matched by</p>
          <ul>
            <li>
              a
              <a
                target="_blank"
                href="https://developer.mozilla.org/docs/Mozilla/Add-ons/WebExtensions/API/declarativeNetRequest/RuleCondition#urlfilter"
              >
                URL filter</a
              >, it will be redirected to the target.
            </li>
            <li>
              a regular expression, the matched part will be replaced with the
              target.
            </li>
          </ul>
        </template>
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
    <template v-if="input.type === 'transform'">
      <div>
        <textarea
          type="text"
          v-model="input.transformQuery"
          placeholder="Modify query string"
          rows="3"
          :readonly="!editable"
        ></textarea>
        <div class="form-hint">
          <p>Either change the entire query string:</p>
          <ul>
            <li>Set to <code>!</code> to remove it</li>
            <li>
              Prefix with <code>?</code> to replace it, e.g.
              <code>?new_query_string</code>
            </li>
          </ul>
          <p>Or modify the query string by keys, each in a line:</p>
          <ul>
            <li>
              Prefix with <code>!</code> to remove a key, e.g.
              <code>!key_to_remove</code>
            </li>
            <li>
              To add or replace a key, e.g. <code>some_key: some_value</code>
            </li>
          </ul>
        </div>
      </div>
      <div class="pt-1">Query String</div>
      <div>
        <textarea
          type="text"
          v-model="input.transformUrl"
          placeholder="Transform URL"
          rows="3"
          :readonly="!editable"
        ></textarea>
        <div class="form-hint">
          <p>
            <a
              target="_blank"
              href="https://developer.mozilla.org/docs/Mozilla/Add-ons/WebExtensions/API/declarativeNetRequest/URLTransform"
              >Transform URL parts</a
            >
            optionally, with each in a line:
          </p>
          <ul>
            <li><code>host: www.example.com</code></li>
            <li><code>path: /new/path</code></li>
          </ul>
        </div>
      </div>
    </template>
    <template v-if="input.type === 'headers'">
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
          <p>Modify headers, each in a line:</p>
          <ul>
            <li>
              Prefix with <code>!</code> to remove it, e.g.
              <code>!x-to-remove</code>
            </li>
            <li>
              Add or replace a header, e.g.
              <code>x-powered-by: request-x</code>,
              <code>authorization: token always-add-my-token</code>
            </li>
          </ul>
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
import type { KeyValueItem, RequestData } from '@/types';
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue';
import IconCheck from '~icons/mdi/check';
import IconError from '~icons/mdi/error';
import { ruleActions } from '../actions';
import { currentList, store } from '../store';
import { focusInput } from '../util';
import RuleItemView from './rule-item-view.vue';
import { loadRegExp } from '@/common/util';
import { URL_TRANSFORM_KEYS } from '@/common/constants';

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
  transformUrl?: string;
  transformQuery?: string;
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
  const result = [loadRegExp(rule.url) ? 'regex' : 'url_filter'];
  switch (rule.type) {
    case 'headers': {
      if (rule.requestHeaders?.length) result.push('req_headers');
      if (rule.responseHeaders?.length) result.push('res_headers');
      break;
    }
    case 'transform': {
      const { transform } = rule;
      if (
        transform &&
        (URL_TRANSFORM_KEYS.some((key) => transform[key] != null) ||
          transform.query?.length)
      )
        result.push('url_transform');
      break;
    }
  }
  return result;
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
    reqHeaders: stringifyKeyValues(rule.requestHeaders),
    resHeaders: stringifyKeyValues(rule.responseHeaders),
    transformQuery: stringifyKeyValues(rule.transform?.query),
    transformUrl: stringifyKeyValues(
      URL_TRANSFORM_KEYS.flatMap((key) => {
        const value = rule.transform?.[key as keyof RequestData['transform']];
        return value == null ? [] : { name: key, value };
      }),
    ),
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
    ...(input.type === 'headers' && {
      requestHeaders: parseKeyValues(input.reqHeaders ?? ''),
      responseHeaders: parseKeyValues(input.resHeaders ?? ''),
    }),
    ...(input.type === 'transform' && {
      transform: {
        query: parseKeyValues(input.transformQuery ?? ''),
        ...Object.fromEntries(
          parseKeyValues(input.transformUrl ?? '')
            .filter(({ name }) =>
              (URL_TRANSFORM_KEYS as readonly string[]).includes(name),
            )
            .map(({ name, value }) => [name, value]),
        ),
      },
    }),
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

function stringifyKeyValues(items?: KeyValueItem[]) {
  return items?.map(({ name, value }) => `${name}: ${value}`).join('\n') || '';
}

function parseKeyValues(content: string): KeyValueItem[] {
  return content
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

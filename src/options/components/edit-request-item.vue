<template>
  <form
    class="grid grid-cols-[8rem_auto_12rem] children:m-1"
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
    <div :class="{ error: errors.target }" v-if="input.type === 'redirect'">
      <textarea
        v-model="input.target"
        placeholder="Set target here"
        :readonly="!editable"
      />
      <div class="form-hint">
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
      </div>
    </div>
    <template v-if="input.type === 'replace'">
      <div class="min-w-0" :class="{ error: errors.target }">
        <CodeEditor
          class="h-[50vh]"
          v-model="input.target"
          :lang="guessLang"
          :readonly="!editable"
          :content-type="input.contentType"
        />
        <div class="form-hint">
          <p>
            Any text content is allowed and will replace the response content by
            redirecting it to a dataURL.
          </p>
          <a v-if="formatters[guessLang]" @click.prevent="handleFormat">
            Format
          </a>
        </div>
      </div>
      <div>
        <input type="text" v-model="input.contentType" />
        <div class="form-hint">
          Content type, e.g.
          <template v-for="(type, i) in contentTypes" :key="i">
            <span v-if="i > 0">, </span>
            <code v-text="type"></code
            ><a @click.prevent="input.contentType = type">^</a>
          </template>
        </div>
      </div>
    </template>
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
    <div class="col-start-2">
      <textarea
        v-model="input.comment"
        placeholder="Comment"
        :readonly="!editable"
      />
      <div class="form-hint">
        <p>Comment</p>
      </div>
    </div>
    <div class="whitespace-nowrap" style="grid-column-start: 3">
      <button class="mr-1" type="submit" v-if="editable">Save</button>
      <button
        type="reset"
        @click="onCancel"
        v-text="editable ? 'Cancel' : 'Close'"
      ></button>
    </div>
  </form>
</template>

<script lang="ts" setup>
import type { KeyValueItem, RequestData } from '@/types';
import { computed, nextTick, onMounted, reactive, ref } from 'vue';
import IconCheck from '~icons/mdi/check';
import { focusInput } from '../util';
import { URL_TRANSFORM_KEYS } from '@/common/constants';
import CodeEditor from './code-editor.vue';

const props = defineProps<{
  rule: RequestData;
  selected?: boolean;
  editable?: boolean;
  listDisabled?: boolean;
}>();

const emit = defineEmits<{
  (event: 'cancel'): void;
  (event: 'submit', data: { rule: RequestData }): void;
}>();

const methodList = ['get', 'post', 'head', 'put', 'patch', 'delete', 'connect'];
const contentTypes = ['application/json', 'text/html', 'text/plain'];

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
  comment?: string;
}>({
  methods: new Set(),
  type: 'block',
  contentType: '',
});
const refForm = ref<HTMLFormElement | undefined>(undefined);

const errors = computed(() => {
  return {
    url: !input.url,
    target: input.type === 'redirect' && !input.target,
  };
});

const guessLang = computed(() => {
  const type = input.contentType || '';
  if (/json/.test(type)) return 'json';
  if (/html/.test(type)) return 'html';
  return '';
});

const formatters: Record<string, (input: string) => string> = {
  json(input) {
    return JSON.stringify(JSON.parse(input), null, 2);
  },
};

const handleFormat = () => {
  const format = formatters[guessLang.value];
  if (!format || !input.target) return;
  const value = format(input.target);
  input.target = value;
};

const reset = () => {
  const { rule } = props;
  Object.assign(input, {
    methods: new Set(rule.methods || []),
    url: rule.url,
    type: rule.type || 'block',
    contentType: rule.contentType,
    target: rule.target,
    comment: rule.comment,
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
    methods: [...input.methods],
    url: input.url || '',
    target: input.target || '',
    comment: input.comment || '',
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
</script>

<template>
  <form
    class="grid grid-cols-[auto_auto_auto_min-content] gap-2 m-2"
    @submit.prevent="onSubmit"
    ref="refForm"
  >
    <div class="col-span-3">
      <input
        :class="{ 'input-error': errors.url }"
        type="text"
        v-model="input.url"
        placeholder="URL"
        :readonly="!editable"
      />
      <div class="form-hint">
        A
        <a
          target="_blank"
          href="https://developer.mozilla.org/docs/Mozilla/Add-ons/WebExtensions/Match_patterns"
          >match pattern</a
        >
        or a RegExp (e.g. <code>/^https:/</code>).
      </div>
    </div>
    <div class="row-span-3 whitespace-nowrap">
      <button class="mr-1" type="submit" v-if="editable">Save</button>
      <button
        type="reset"
        @click="onCancel"
        v-text="editable ? 'Cancel' : 'Close'"
      ></button>
    </div>
    <div class="col-span-3">
      <input
        type="text"
        v-model="input.name"
        placeholder="Name"
        :readonly="!editable"
      />
      <div class="form-hint">
        Name of cookie, a string for exact match or a RegExp like
        <code>/^mycookie/</code>.
      </div>
    </div>
    <div>
      <select v-model="input.sameSite" :readonly="!editable">
        <option
          v-for="{ label, value } in sameSiteOptions"
          :key="value"
          v-text="label"
          :value="value"
        />
      </select>
      <div class="form-hint">SameSite</div>
    </div>
    <div>
      <select v-model="input.httpOnly" :readonly="!editable">
        <option value="">Noop</option>
        <option value="true">true</option>
        <option value="false">false</option>
      </select>
      <div class="form-hint">HttpOnly</div>
    </div>
    <div>
      <select v-model="input.secure" :readonly="!editable">
        <option value="">Noop</option>
        <option value="true">true</option>
        <option value="false">false</option>
      </select>
      <div class="form-hint">Secure</div>
    </div>
    <div class="col-span-3">
      <input
        type="number"
        v-model="input.ttl"
        placeholder="TTL"
        :readonly="!editable"
      />
      <div class="form-hint">
        TTL in seconds, -1 for removing, 0 for session cookie.
      </div>
    </div>
    <div class="col-span-3">
      <textarea
        v-model="input.comment"
        placeholder="Comment"
        :readonly="!editable"
      />
      <div class="form-hint">
        <p>Comment</p>
      </div>
    </div>
  </form>
</template>

<script lang="ts" setup>
import { computed, nextTick, reactive, ref, onMounted } from 'vue';
import type { CookieData, SameSiteStatus } from '@/types';
import { isValidPattern, focusInput } from '../util';

const props = defineProps<{
  rule: CookieData;
  editable?: boolean;
}>();

const emit = defineEmits<{
  (event: 'cancel'): void;
  (event: 'submit', data: { rule: CookieData }): void;
}>();

const sameSiteOptions = [
  {
    label: 'Noop',
    value: '',
  },
  // We don't need unspecified since we already know what browser will do with it
  // {
  //   label: 'Unspecified',
  //   value: 'unspecified',
  // },
  {
    label: 'Lax',
    value: 'lax',
  },
  {
    label: 'Strict',
    value: 'strict',
  },
  {
    label: 'No restriction (None)',
    value: 'no_restriction',
  },
];

const input = reactive<{
  url?: string;
  name?: string;
  comment?: string;
  sameSite?: '' | SameSiteStatus;
  httpOnly?: '' | 'true' | 'false';
  secure?: '' | 'true' | 'false';
  ttl?: string;
}>({});
const refForm = ref<HTMLFormElement | undefined>(undefined);

const reset = () => {
  const { rule } = props;
  Object.assign(input, {
    url: rule.url,
    name: rule.name,
    sameSite: rule.sameSite || '',
    httpOnly: bool2str(rule.httpOnly),
    secure: bool2str(rule.secure),
    ttl: rule.ttl,
  });
  nextTick(() => {
    if (props.editable) {
      focusInput(refForm.value);
    }
  });
};

const errors = computed(() => {
  return {
    url: !input.url || !isValidPattern(input.url),
  };
});

const onCancel = () => {
  emit('cancel');
};

const onSubmit = () => {
  if (Object.values(errors.value).some(Boolean)) return;
  const rule: CookieData = {
    enabled: props.rule.enabled ?? true,
    url: input.url || '',
    name: input.name || '',
    comment: input.comment || '',
    sameSite: input.sameSite || undefined,
    httpOnly: str2bool(input.httpOnly ?? ''),
    secure: str2bool(input.secure ?? ''),
    ttl: str2num(input.ttl ?? ''),
  };
  emit('submit', {
    rule,
  });
};

onMounted(reset);

function bool2str(value?: boolean) {
  if (value == null) return '';
  return `${!!value}`;
}

function str2bool(value: '' | 'true' | 'false') {
  if (value === 'true') return true;
  if (value === 'false') return false;
}

function str2num(value: string) {
  const num = +value;
  return isNaN(num) ? undefined : num;
}
</script>

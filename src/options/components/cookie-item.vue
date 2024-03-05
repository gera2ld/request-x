<template>
  <form
    class="grid grid-cols-[auto_auto_auto_min-content] gap-2"
    v-if="showDetail"
    @submit.prevent="onSubmit"
    ref="refForm"
  >
    <div class="col-span-3" :class="{ error: errors.url }">
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
  </form>
  <RuleItemView v-else :selected="selected" :badges="badges" @select="onSelect">
    <Toggle
      class="mr-4"
      :class="{ disabled: listDisabled }"
      :active="!!rule.enabled"
      @toggle="handleToggle"
    />
    <div class="flex-1 min-w-0 break-words" v-text="rule.url"></div>
  </RuleItemView>
</template>

<script lang="ts" setup>
import { computed, nextTick, reactive, ref, watch, onMounted } from 'vue';
import type { CookieData, SameSiteStatus } from '@/types';
import Toggle from '@/common/components/toggle.vue';
import { isValidPattern, focusInput } from '../util';
import RuleItemView from './rule-item-view.vue';
import { ruleActions } from '../actions';

const props = defineProps<{
  rule: CookieData;
  showDetail?: boolean;
  selected?: boolean;
  editable?: boolean;
  listDisabled?: boolean;
}>();

const emit = defineEmits<{
  (event: 'cancel'): void;
  (event: 'submit', data: { rule: CookieData }): void;
  (event: 'select', data: { cmdCtrl: boolean; shift: boolean }): void;
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
  sameSite?: '' | SameSiteStatus;
  httpOnly?: '' | 'true' | 'false';
  secure?: '' | 'true' | 'false';
  ttl?: string;
}>({});
const refForm = ref<HTMLFormElement | undefined>(undefined);

const reset = () => {
  if (!props.showDetail) return;
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

const badges = computed(() => {
  const { rule } = props;
  return [
    rule.sameSite != null && 'SameSite',
    rule.httpOnly != null && 'httpOnly',
    rule.ttl != null && 'ttl',
  ].filter(Boolean) as string[];
});

const onCancel = () => {
  emit('cancel');
};

const onSubmit = () => {
  if (Object.values(errors.value).some(Boolean)) return;
  emit('submit', {
    rule: {
      url: input.url,
      name: input.name,
      sameSite: input.sameSite || undefined,
      httpOnly: str2bool(input.httpOnly ?? ''),
      secure: str2bool(input.secure ?? ''),
      ttl: str2num(input.ttl ?? ''),
    } as CookieData,
  });
};

const onSelect = (e: any) => {
  emit('select', e);
};

watch(() => props.showDetail, reset);
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

function handleToggle() {
  ruleActions.toggle(props.rule);
}
</script>

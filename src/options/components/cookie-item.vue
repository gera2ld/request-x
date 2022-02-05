<template>
  <form
    class="rule-item grid grid-cols-[auto_auto_auto_min-content] gap-2"
    v-if="showDetail"
    @submit.prevent="onSubmit"
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
    <div class="flex-1 min-w-0 break-words" v-text="rule.url"></div>
    <template #buttons>
      <slot name="buttons"></slot>
    </template>
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
  onMounted,
} from 'vue';
import { CookieData, SameSiteStatus } from '#/types';
import { isValidPattern, store } from '../util';
import RuleItemView from './rule-item-view.vue';

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

export default defineComponent({
  components: {
    RuleItemView,
  },
  props: {
    rule: {
      type: Object as PropType<CookieData>,
    },
    showDetail: Boolean,
    editable: Boolean,
    selected: Boolean,
  },
  emits: ['cancel', 'submit', 'select'],
  setup(props, context) {
    const input = reactive<{
      url?: string;
      name?: string;
      sameSite?: '' | SameSiteStatus;
      httpOnly?: '' | 'true' | 'false';
      secure?: '' | 'true' | 'false';
      ttl?: string;
    }>({});
    const refMethod = ref(null);

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
      ].filter(Boolean);
    });

    const onCancel = () => {
      context.emit('cancel');
    };

    const onSubmit = () => {
      if (Object.values(errors.value).some(Boolean)) return;
      context.emit('submit', {
        rule: {
          url: input.url,
          name: input.name,
          sameSite: input.sameSite || undefined,
          httpOnly: str2bool(input.httpOnly),
          secure: str2bool(input.secure),
          ttl: str2num(input.ttl),
        } as CookieData,
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
      refMethod,
      sameSiteOptions,
      onCancel,
      onSubmit,
      onSelect,
    };
  },
});
</script>

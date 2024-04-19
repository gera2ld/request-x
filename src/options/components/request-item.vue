<template>
  <RuleItemView :selected="selected" @select="onSelect">
    <Toggle
      class="mr-4"
      :class="{ disabled: listDisabled }"
      :active="!!rule.enabled"
      @toggle="handleToggle"
    />
    <div
      class="w-32 h-8 leading-8 mr-1 truncate"
      v-text="ruleMethods"
      :title="ruleMethods"
    ></div>
    <div class="rule-item-content">
      <div v-text="rule.url"></div>
      <div
        class="rule-item-comment"
        v-if="rule.comment"
        v-text="rule.comment"
      ></div>
    </div>
    <div class="mx-2 text-error" v-if="ruleError" :title="ruleError">
      <IconError />
    </div>
    <div
      class="rule-item-badge"
      v-for="badge in badges"
      v-text="badge"
      :key="badge"
    ></div>
  </RuleItemView>
</template>

<script lang="ts" setup>
import Toggle from '@/common/components/toggle.vue';
import type { RequestData } from '@/types';
import { computed } from 'vue';
import IconError from '~icons/mdi/error';
import { ruleActions } from '../actions';
import { currentList, store } from '../store';
import RuleItemView from './rule-item-view.vue';
import { loadRegExp } from '@/common/util';
import { URL_TRANSFORM_KEYS } from '@/common/constants';

const props = defineProps<{
  rule: RequestData;
  index: number;
  selected?: boolean;
  listDisabled?: boolean;
}>();

const emit = defineEmits<{
  (event: 'select', data: { cmdCtrl: boolean; shift: boolean }): void;
}>();

const ruleError = computed(
  () => store.ruleErrors[currentList.value?.id || 0]?.[props.index + 1],
);

const ruleMethods = computed(() => props.rule.methods.join(',') || '*');
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

const onSelect = (e: any) => {
  emit('select', e);
};

function handleToggle() {
  ruleActions.toggle(props.rule);
}
</script>

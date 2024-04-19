<template>
  <RuleItemView :selected="selected" @select="onSelect">
    <Toggle
      class="mr-4"
      :class="{ disabled: listDisabled }"
      :active="!!rule.enabled"
      @toggle="handleToggle"
    />
    <div class="rule-item-content">
      <div v-text="rule.url"></div>
      <div
        class="rule-item-comment"
        v-if="rule.comment"
        v-text="rule.comment"
      ></div>
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
import { computed } from 'vue';
import type { CookieData } from '@/types';
import Toggle from '@/common/components/toggle.vue';
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

const badges = computed(() => {
  const { rule } = props;
  return [
    rule.sameSite != null && 'SameSite',
    rule.httpOnly != null && 'httpOnly',
    rule.ttl != null && 'ttl',
  ].filter(Boolean) as string[];
});

const onSelect = (e: any) => {
  emit('select', e);
};

function handleToggle() {
  ruleActions.toggle(props.rule);
}
</script>

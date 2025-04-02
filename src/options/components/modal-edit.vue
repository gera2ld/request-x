<template>
  <VlModal :show="!!editingRule" @close="onCancel" transition="fade">
    <div class="modal">
      <div
        class="py-1 text-lg font-bold text-center"
        v-text="
          !listEditable
            ? 'View Rule'
            : ruleState.newRule
              ? 'Create Rule'
              : 'Edit Rule'
        "
      ></div>
      <Component
        :is="EditRuleItem"
        :rule="editingRule as any"
        :editable="listEditable"
        @submit="onSubmit"
        @cancel="onCancel"
      />
    </div>
  </VlModal>
</template>

<script lang="ts" setup>
import { computed } from 'vue';
import VlModal from './modal.vue';
import { currentList, ruleState, listEditable } from '../store';
import { ruleActions } from '../actions';
import EditRequestItem from './edit-request-item.vue';
import EditCookieItem from './edit-cookie-item.vue';

const editRuleItemMap = {
  request: EditRequestItem,
  cookie: EditCookieItem,
};

const editingRule = computed(() => {
  if (ruleState.newRule) return ruleState.newRule;
  return currentList.value?.rules[ruleState.editing];
});
const EditRuleItem = computed(
  () => currentList.value && editRuleItemMap[currentList.value.type],
);
const onCancel = ruleActions.cancel;
const onSubmit = ruleActions.submit;
</script>

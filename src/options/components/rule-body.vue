<template>
  <div
    v-if="currentList"
    class="flex flex-col"
    :class="{ 'active-area': store.activeArea === 'rules' }"
    @mousedown="store.activeArea = 'rules'"
  >
    <div
      v-if="!currentList.rules.length && !ruleState.newRule"
      class="flex flex-1 items-center justify-center subtle text-lg"
    >
      <div>
        No rules yet
        <template v-if="listEditable">
          , <a href="#" @click.prevent="onRuleAdd">add one</a>
        </template>
      </div>
    </div>
    <div
      v-else
      class="relative flex-1 pt-1 overflow-y-auto"
      @click="onSelClear"
    >
      <Component
        v-for="(rule, index) in currentList.rules"
        :is="RuleItem"
        :key="index"
        :index="index"
        :rule="rule as any"
        :listDisabled="!currentList.enabled"
        v-show="ruleState.visible[index]"
        :selected="ruleSelection.selected[index]"
        @select="onSelToggle(index, $event)"
        @dblclick="onEdit(index)"
        class="rule-item"
        :class="{
          active: index === ruleSelection.active || index === ruleState.editing,
        }"
      />
      <div v-if="editingRule" class="absolute inset-[2px_0] bg-primary">
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
          :rule="editingRule"
          :editable="listEditable"
          @submit="onSubmit($event)"
          @cancel="onCancel"
        />
      </div>
    </div>
    <footer class="p-1">
      <div class="mb-1 truncate subtle" v-if="currentList.subscribeUrl">
        Subscribed from:
        <span v-text="currentList.subscribeUrl"></span>
      </div>
      <div
        class="mb-1 subtle"
        v-if="currentList.subscribeUrl && currentList.lastUpdated"
      >
        Last updated at:
        <span
          v-text="new Date(currentList.lastUpdated).toLocaleString()"
        ></span>
      </div>
      <div>
        <div class="rule-label" v-if="currentList.subscribeUrl">Subscribed</div>
        <div class="rule-label disabled" v-if="!currentList.enabled">
          Disabled
        </div>
      </div>
    </footer>
  </div>
  <RuleHint v-else />
</template>

<script lang="ts" setup>
import { computed, onMounted } from 'vue';
import {
  currentList,
  ruleSelection,
  ruleState,
  listEditable,
  store,
} from '../store';
import RequestItem from './request-item.vue';
import CookieItem from './cookie-item.vue';
import RuleHint from './rule-hint.vue';
import { ruleActions } from '../actions';
import EditRequestItem from './edit-request-item.vue';
import EditCookieItem from './edit-cookie-item.vue';

const ruleItemMap = {
  request: RequestItem,
  cookie: CookieItem,
};
const editRuleItemMap = {
  request: EditRequestItem,
  cookie: EditCookieItem,
};

const RuleItem = computed(
  () => currentList.value && ruleItemMap[currentList.value.type],
);
const editingRule = computed(() => {
  if (ruleState.newRule) return ruleState.newRule;
  return currentList.value?.rules[ruleState.editing];
});
const EditRuleItem = computed(
  () => currentList.value && editRuleItemMap[currentList.value.type],
);
const onCancel = ruleActions.cancel;
const onEdit = ruleActions.edit;
const onSubmit = ruleActions.submit;
const onSelClear = ruleActions.selClear;
const onSelToggle = ruleActions.selToggle;
const onRuleAdd = ruleActions.new;

onMounted(() => {
  ruleActions.update();
});
</script>

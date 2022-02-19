<template>
  <div class="flex flex-col" v-if="currentList">
    <div class="flex-1 pt-1 overflow-y-auto" @click="onSelClear">
      <component
        v-for="(rule, index) in currentList.rules"
        :is="RuleItem"
        :key="index"
        :rule="rule"
        :showDetail="ruleState.editing === index"
        :editable="listEditable"
        v-show="ruleState.visible[index]"
        :selected="ruleSelection.selected[index]"
        @submit="onSubmit(index, $event)"
        @cancel="onCancel"
        @select="onSelToggle(index, $event)"
        @dblclick="onEdit(index)"
        class="rule-item"
        :class="{ 'rule-item-active': index === ruleSelection.active }"
      />
      <component
        :is="RuleItem"
        v-if="ruleState.newRule"
        :rule="ruleState.newRule"
        :showDetail="true"
        :editable="true"
        class="rule-item rule-item-active"
        @submit="onSubmit(-1, $event)"
        @cancel="onCancel"
      />
    </div>
    <footer>
      <div class="mb-1 truncate text-zinc-500" v-if="currentList.subscribeUrl">
        Subscribed from:
        <span v-text="currentList.subscribeUrl"></span>
      </div>
      <div
        class="mb-1 text-zinc-500"
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
</template>

<script lang="ts">
import { computed, defineComponent, onMounted } from 'vue';
import { keyboardService } from '#/common/keyboard';
import {
  currentList,
  currentType,
  ruleSelection,
  ruleState,
  listEditable,
} from '../store';
import { shortcutTextMap } from '../shortcut';
import RequestItem from './request-item.vue';
import CookieItem from './cookie-item.vue';
import { ruleActions } from '../actions';

const ruleItemMap = {
  request: RequestItem,
  cookie: CookieItem,
};

export default defineComponent({
  setup() {
    const RuleItem = computed(() => ruleItemMap[currentType.value]);

    onMounted(() => {
      ruleActions.update();
      keyboardService.enable();
      return () => {
        keyboardService.disable();
      };
    });

    return {
      RuleItem,
      currentList,
      listEditable,
      shortcutTextMap,
      ruleSelection,
      ruleState,
      onCancel: ruleActions.cancel,
      onEdit: ruleActions.edit,
      onSubmit: ruleActions.submit,
      onSelClear: ruleActions.selClear,
      onSelToggle: ruleActions.selToggle,
    };
  },
});
</script>

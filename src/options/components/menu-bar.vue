<template>
  <div class="menu-bar">
    <vl-dropdown
      v-for="(menu, i) in menus"
      :key="i"
      :closeAfterClick="true"
      :modelValue="active === i"
      @update:modelValue="(value) => onToggle(i, value)"
    >
      <template v-slot:toggle>
        <div
          class="menu-toggle"
          :class="{ active: active === i }"
          v-text="menu.label"
          @mouseover="onHover(i)"
        ></div>
      </template>
      <div class="menu-dropdown">
        <template v-for="(item, j) in menu.items" :key="j">
          <div v-if="item.type === 'sep'" class="menu-sep"></div>
          <div
            v-else-if="item.type === 'group'"
            class="menu-group"
            v-text="item.label"
          ></div>
          <div
            v-else
            class="menu-item"
            :class="{ disabled: item.disabled }"
            @click="() => !item.disabled && item.handler?.()"
          >
            <div class="flex-1 mr-4" v-text="item.label"></div>
            <div
              class="menu-shortcut"
              v-if="item.shortcut"
              v-text="item.shortcut"
            ></div>
          </div>
        </template>
      </div>
    </vl-dropdown>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, ref } from 'vue';
import VlDropdown from 'vueleton/lib/dropdown';
import { shortcutTextMap } from '../shortcut';
import { currentList, listEditable, ruleSelection } from '../store';
import { listActions, ruleActions } from '../actions';

const menus = computed(() => [
  {
    label: 'List',
    items: [
      {
        label: 'Create new list',
        handler: listActions.new,
      },
      {
        label: 'Import data',
        handler: listActions.import,
      },
      {
        label: 'Subscribe a list',
        handler: listActions.subscribe,
      },
      {
        label: 'Fetch all',
        handler: listActions.fetchAll,
      },
      {
        type: 'group',
        label: 'Selection',
      },
      {
        label: 'Export',
        handler: listActions.export,
        disabled: !currentList.value,
      },
      {
        label: 'Disable',
      },
      {
        label: 'Enable',
      },
      {
        label: 'Remove',
        handler: listActions.remove,
        disabled: !currentList.value,
      },
      {
        type: 'group',
        label: 'Current list',
      },
      {
        label: currentList.value?.enabled ? 'Disable' : 'Enable',
        handler: listActions.toggle,
        disabled: !currentList.value,
      },
      {
        label: 'Edit',
        handler: listActions.edit,
        disabled: !currentList.value,
      },
      {
        label: 'Fork',
        handler: listActions.fork,
        disabled: !currentList.value,
      },
    ],
  },
  {
    label: 'Rule',
    items: [
      {
        label: 'Add new rule',
        shortcut: shortcutTextMap.add,
        handler: ruleActions.new,
      },
      {
        label: 'Edit / View detail',
        shortcut: shortcutTextMap.edit,
        handler: ruleActions.selEdit,
        disabled:
          ruleSelection.active < 0 ||
          ruleSelection.active >= currentList.value.rules.length,
      },
      {
        type: 'group',
        label: 'Selection',
      },
      {
        label: 'Duplicate',
        shortcut: shortcutTextMap.duplicate,
        handler: ruleActions.selDuplicate,
        disabled: !ruleSelection.count || !listEditable.value,
      },
      {
        label: 'Remove',
        shortcut: shortcutTextMap.remove,
        handler: ruleActions.selRemove,
        disabled: !ruleSelection.count || !listEditable.value,
      },
    ],
  },
  {
    label: 'Edit',
    items: [
      {
        label: 'Cut',
        shortcut: shortcutTextMap.cut,
        handler: ruleActions.selCut,
        disabled: !ruleSelection.count || !listEditable.value,
      },
      {
        label: 'Copy',
        shortcut: shortcutTextMap.copy,
        handler: ruleActions.selCopy,
        disabled: !ruleSelection.count,
      },
      {
        label: 'Paste',
        shortcut: shortcutTextMap.paste,
        handler: ruleActions.selPaste,
        disabled: !listEditable.value,
      },
    ],
  },
]);

export default defineComponent({
  components: {
    VlDropdown,
  },
  setup() {
    const active = ref<number>(-1);

    const onToggle = (index: number, value: boolean) => {
      if (value) {
        active.value = index;
      } else if (active.value === index) {
        active.value = -1;
      }
    };

    const onHover = (index: number) => {
      if (active.value >= 0 && active.value !== index) {
        active.value = index;
      }
    };

    return {
      menus,
      active,
      onToggle,
      onHover,
    };
  },
});
</script>

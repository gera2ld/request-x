<template>
  <div class="menu-bar">
    <vl-dropdown
      v-for="(menu, i) in menus"
      :key="i"
      :closeAfterClick="true"
      :modelValue="active === i"
      @update:modelValue="(value: boolean) => onToggle(i, value)"
    >
      <div
        class="menu-toggle"
        :class="{ active: active === i }"
        v-text="menu.label"
        @mouseover="onHover(i)"
      />
      <template #content>
        <div class="menu-dropdown">
          <template v-for="(item, _j) in menu.items" :key="_j">
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
      </template>
    </vl-dropdown>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, ref } from 'vue';
import VlDropdown from 'vueleton/lib/dropdown';
import { shortcutTextMap } from '../shortcut';
import {
  currentList,
  listEditable,
  ruleSelection,
  selectedLists,
  store,
} from '../store';
import {
  listActions,
  ruleActions,
  selPaste,
  selectAll,
  selEdit,
} from '../actions';

const menus = computed(() => [
  {
    label: 'List',
    items: [
      {
        label: 'Create new list',
        handler: listActions.new,
        shortcut: shortcutTextMap.new,
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
        handler: listActions.selExport,
        disabled: !selectedLists.value.length,
      },
      {
        label: 'Enable / Disable',
        handler: listActions.selToggleStatus,
        disabled: !selectedLists.value.length,
      },
      {
        type: 'group',
        label: 'Current list',
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
        type: 'group',
        label: 'Selection',
      },
      {
        label: 'Duplicate',
        shortcut: shortcutTextMap.duplicate,
        handler: ruleActions.selDuplicate,
        disabled: !ruleSelection.count || !listEditable.value,
      },
    ],
  },
  {
    label: 'Edit',
    items: [
      {
        type: 'group',
        label: `Realm: ${store.activeArea === 'lists' ? 'List' : 'Rule'}`,
      },
      {
        label: 'Select All',
        shortcut: shortcutTextMap.selectAll,
        handler: selectAll,
      },
      {
        type: 'sep',
      },
      {
        label: 'Cut',
        shortcut: shortcutTextMap.cut,
        handler:
          store.activeArea === 'lists'
            ? listActions.selCut
            : ruleActions.selCut,
        disabled:
          store.activeArea === 'lists'
            ? !selectedLists.value.length
            : !ruleSelection.count || !listEditable.value,
      },
      {
        label: 'Copy',
        shortcut: shortcutTextMap.copy,
        handler:
          store.activeArea === 'lists'
            ? listActions.selCopy
            : ruleActions.selCopy,
        disabled:
          store.activeArea === 'lists'
            ? !selectedLists.value.length
            : !ruleSelection.count,
      },
      {
        label: 'Paste',
        shortcut: shortcutTextMap.paste,
        handler: selPaste,
      },
      {
        type: 'sep',
      },
      store.activeArea === 'lists'
        ? {
            label: 'Edit metadata',
            shortcut: shortcutTextMap.edit,
            handler: selEdit,
            disabled: !currentList.value,
          }
        : {
            label: 'Edit / View detail',
            shortcut: shortcutTextMap.edit,
            handler: selEdit,
            disabled:
              ruleSelection.active < 0 ||
              !currentList.value ||
              ruleSelection.active >= currentList.value.rules.length,
          },
      {
        label: 'Remove',
        shortcut: shortcutTextMap.remove,
        handler:
          store.activeArea === 'lists'
            ? listActions.selRemove
            : ruleActions.selRemove,
        disabled:
          store.activeArea === 'lists'
            ? !selectedLists.value.length
            : !ruleSelection.count || !listEditable.value,
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

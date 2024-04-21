<template>
  <div
    ref="refEl"
    class="vl-dropdown"
    :class="`vl-dropdown-${align} vl-dropdown-${direction}`"
    @mouseup="onMouseUp"
  >
    <div
      class="vl-dropdown-toggle"
      @click="onToggle"
      @focus="onFocus"
      @blur="onBlur"
    >
      <slot></slot>
    </div>
    <div class="vl-dropdown-menu" v-show="model" @mousedown.stop>
      <slot name="content">
        {{ content }}
      </slot>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, watch } from 'vue';

const props = withDefaults(
  defineProps<{
    /**
     * If true, the dropdown menu will close on menu clicked.
     */
    closeAfterClick?: boolean;
    /**
     * If true, the dropdown menu will open on toggle focused.
     */
    focusOpen?: boolean;
    /**
     * Set alignment of the dropdown menu, either 'left' or 'right'.
     */
    align?: string;
    /**
     * Set direction of the dropdown menu, either 'down' or 'up'.
     */
    direction?: string;
    /**
     * Content of dropdown, can be overriden by `v-slot:content`.
     */
    content?: string;
  }>(),
  {
    align: 'left',
    direction: 'down',
    content: '',
  },
);
const model = defineModel<boolean>({ default: false });

const refEl = ref<HTMLElement>();

watch(model, (value, prevValue) => {
  if (value === prevValue) return;
  if (value) {
    document.addEventListener('mousedown', onClose, false);
  } else {
    document.removeEventListener('mousedown', onClose, false);
  }
});

function onToggle() {
  model.value = !model.value;
}
function onClose() {
  if (model.value) onToggle();
}
function onFocus() {
  if (props.focusOpen && !model.value) onToggle();
}
function onBlur() {
  const { activeElement } = document;
  if (
    activeElement !== document.body &&
    !refEl.value?.contains(activeElement)
  ) {
    onClose();
  }
}
function onMouseUp() {
  if (props.closeAfterClick) onClose();
}
</script>

<style>
.vl-dropdown {
  position: relative;
  display: inline-block;
}
.vl-dropdown-toggle {
  cursor: pointer;
}
.vl-dropdown-menu {
  position: absolute;
  z-index: 10;
}
.vl-dropdown-right .vl-dropdown-menu {
  right: 0;
}
.vl-dropdown-down .vl-dropdown-menu {
  top: 100%;
  margin-top: 5px;
}
.vl-dropdown-up .vl-dropdown-menu {
  bottom: 100%;
  margin-bottom: 5px;
}
</style>

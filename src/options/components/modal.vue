<template>
  <teleport to="body">
    <transition :name="transition" @after-leave="onAfterLeave" appear>
      <div :class="`vl-modal ${modalClass}`" v-if="show">
        <div
          :class="`vl-modal-backdrop ${backdropClass}`"
          @click="onBackdropClick"
        />
        <slot></slot>
      </div>
    </transition>
  </teleport>
</template>

<script lang="ts" setup>
defineProps<{
  modalClass?: string;
  backdropClass?: string;
  transition?: string;
  show?: boolean;
}>();
const emit = defineEmits<{
  (type: 'close'): void;
  (type: 'afterLeave'): void;
}>();

function onBackdropClick() {
  emit('close');
}
function onAfterLeave() {
  emit('afterLeave');
}
</script>

<style>
.vl-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 10;
  text-align: center;
}
.vl-modal-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  z-index: -1;
}
</style>

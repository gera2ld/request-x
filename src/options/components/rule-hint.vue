<template>
  <div class="subtle flex flex-1 justify-center">
    <div v-if="store.hintType === 'listRequired'" class="mt-16 text-lg">
      You must choose a list from the side menu in order to perform this action,
      or <a href="#" @click.prevent="onListCreate">create a new list</a>.
    </div>
    <ul v-else class="list-disc leading-8 text-lg self-center">
      <li>
        Choose a list from the side menu to get started, or
        <a href="#" @click.prevent="onListCreate">create one</a>
      </li>
      <li>
        Select rules for batch operations, also try
        <kbd v-text="isMacintosh ? 'Cmd' : 'Ctrl'"></kbd> / <kbd>Shift</kbd> +
        click
      </li>
      <li>Double click or press <kbd>E</kbd> to edit a rule</li>
    </ul>
  </div>
</template>

<script lang="ts" setup>
import { isMacintosh } from '@/common/keyboard';
import { listActions } from '../actions';
import { store } from '../store';

const onListCreate = listActions.new;
</script>

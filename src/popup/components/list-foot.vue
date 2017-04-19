<template>
  <footer>
    <component :is="comp" />
  </footer>
</template>

<script>
import Control from './control';
import EditList from './edit-list';
import EditRule from './edit-rule';
import { store } from '../utils';

export default {
  computed: {
    comp() {
      if (store.editing.type === 'list') return EditList;
      if (store.editing.type === 'rule') return EditRule;
      return Control;
    },
  },
};
</script>

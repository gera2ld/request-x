<template>
  <div>
    <div>
      List:
      <button @click="createList">New</button>
      <button @click="subscribeList">Subscribe</button>
      <button @click="importList">Import</button>
      <button @click="exportList">Export</button>
    </div>
    <div>
      Rule:
      <button @click="createRule">New</button>
    </div>
  </div>
</template>

<script>
import { edit, loadFile, blob2Text, pickData, dump } from '../utils';

export default {
  methods: {
    createList() {
      edit('list', {
        enabled: true,
      }, {});
    },
    subscribeList() {
      edit('list', {
        enabled: true,
      }, { subscribe: true });
    },
    importList() {
      loadFile(file => {
        blob2Text(file).then(text => {
          const data = JSON.parse(text);
          const list = pickData(data, ['name', 'rules']);
          dump(list);
        });
      });
    },
    exportList() {
      const list = {
        name: this.current.title,
        rules: this.currentRules,
      };
      const blob = new Blob([JSON.stringify(list)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.download = `${this.current.title}.json`;
      a.href = url;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url));
    },
    createRule() {
      edit('rule', {}, {});
    },
  },
};
</script>

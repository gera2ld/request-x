import Vue from 'vue';
import { store } from './utils';
import App from './components/app';

chrome.runtime.sendMessage({ cmd: 'GetLists' }, ({ data }) => {
  store.lists = data;
  store.current = data[0];
});

const commands = {
  UpdatedList(data) {
    const i = store.lists.findIndex(item => item.id === data.id);
    const rules = data.rules;
    delete data.rules;
    if (i < 0) {
      store.lists.push(data);
    } else {
      Vue.set(store.lists, i, data);
    }
    if (store.current.id === data.id) {
      store.currentRules = rules;
    }
  },
  RemovedList(id) {
    const i = store.lists.findIndex(item => item.id === id);
    if (i < 0) return;
    const item = store.lists.splice(i, 1)[0];
    if (item === store.current) {
      store.current = store.lists[i] || store.lists[i - 1];
    }
  },
};
chrome.runtime.onMessage.addListener((req, src, callback) => {
  const func = commands[req.cmd];
  if (!func) return;
  const res = func(req.data, src);
  Promise.resolve(res)
  .then(data => callback({ data }), error => callback({ error }));
  return true;
});

new Vue({
  render: h => h(App),
})
.$mount('#app');

// new Vue({
//   methods: {
//     removeList() {
//       const list = this.editData.list;
//       this.editData = null;
//       chrome.runtime.sendMessage({cmd: 'RemoveList', data: list.id}, res => {
//         if (this.currentList.id === list.id) {
//           this.lists.splice(list.index, 1);
//           const index = Math.min(list.index, this.lists.length - 1);
//           this.select(this.lists[index]);
//           this.recalcTabs();
//         }
//       });
//     },
//   },
// });

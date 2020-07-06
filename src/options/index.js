import Vue from 'vue';
import { store } from './util';
import App from './components/app.vue';
import './style.css';

browser.runtime.sendMessage({ cmd: 'GetLists' })
  .then(data => {
    store.lists = data;
    store.current = data[0];
  });
browser.runtime.sendMessage({ cmd: 'GetConfig' })
  .then(data => {
    store.config = data;
  });

const commands = {
  UpdatedList(data) {
    const i = store.lists.findIndex(item => item.id === data.id);
    if (i < 0) {
      store.lists.push(data);
    } else {
      Vue.set(store.lists, i, data);
    }
    if (store.current.id === data.id) {
      store.current = data;
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
browser.runtime.onMessage.addListener((req, src) => {
  const func = commands[req.cmd];
  if (!func) return;
  return func(req.data, src);
});

const vm = new Vue({
  render: h => h(App),
})
.$mount();
document.body.append(vm.$el);

import Vue from 'vue';
import { store, setRoute } from './util';
import './components/vueleton';
import App from './components/app.vue';
import './style.css';

browser.runtime.sendMessage({ cmd: 'GetLists' })
  .then(data => {
    store.lists = data;
    setRoute(`lists/${data[0]?.id}`);
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
  },
  RemovedList(id) {
    const i = store.lists.findIndex(item => item.id === id);
    if (i < 0) return;
    store.lists.splice(i, 1);
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

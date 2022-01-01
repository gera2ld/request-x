import { createApp } from 'vue';
import browser from '#/common/browser';
import { ListData } from '#/types';
import { store, setRoute } from './util';
import App from './components/app.vue';
import './style.css';

browser.runtime.sendMessage({ cmd: 'GetLists' }).then((data) => {
  store.lists = data;
  setRoute(`lists/${data[0]?.id}`);
});
browser.runtime.sendMessage({ cmd: 'GetData' }).then(({ config, features }) => {
  store.config = config;
  store.features = features;
});

const commands = {
  UpdatedList(data: ListData) {
    const i = store.lists.findIndex((item) => item.id === data.id);
    if (i < 0) {
      store.lists.push(data);
    } else {
      store.lists[i] = data;
    }
  },
  RemovedList(id: number) {
    const i = store.lists.findIndex((item) => item.id === id);
    if (i < 0) return;
    store.lists.splice(i, 1);
  },
};
browser.runtime.onMessage.addListener((req, src) => {
  const func = commands[req.cmd];
  if (!func) return;
  return func(req.data, src);
});

createApp(App).mount(document.body);

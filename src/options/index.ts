import { createApp } from 'vue';
import browser from '#/common/browser';
import { ListData } from '#/types';
import { store } from './store';
import { setRoute, isRoute, updateRoute, getData } from './util';
import App from './components/app.vue';
import './style.css';

browser.runtime.sendMessage({ cmd: 'GetLists' }).then((data) => {
  store.lists = data;
  updateRoute();
  if (!isRoute('lists')) {
    setRoute();
  }
});

getData();

const commands = {
  UpdatedList(data: ListData) {
    const group = store.lists[data.type];
    if (!group) return;
    const i = group.findIndex((item) => item.id === data.id);
    if (i < 0) {
      group.push(data);
    } else {
      group[i] = data;
    }
  },
  RemovedList({ type, id }: { type: ListData['type']; id: number }) {
    const group = store.lists[type];
    const i = group?.findIndex((item) => item.id === id);
    if (i >= 0) {
      group.splice(i, 1);
      if (isRoute('lists', type, id)) {
        const next = group[Math.min(group.length - 1, i)]?.id;
        setRoute(next ? `lists/${type}/${next}` : undefined);
      }
    }
  },
  SetErrors(errors: Array<{ id: number; error: string }>) {
    store.listErrors = errors.reduce((res, item) => {
      res[item.id] = item.error;
      return res;
    }, {});
  },
};
browser.runtime.onMessage.addListener((req, src) => {
  const func = commands[req.cmd];
  if (!func) return;
  return func(req.data, src);
});

createApp(App).mount(document.body);

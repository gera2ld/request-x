import { createApp } from 'vue';
import browser from '#/common/browser';
import type { ListData } from '#/types';
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

const commands: {
  [command: string]: (data: any, src: browser.Runtime.MessageSender) => void;
} = {
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
  SetErrors(errors: { [id: number]: string }) {
    store.listErrors = errors;
  },
};
browser.runtime.onMessage.addListener(
  (req: { cmd: string; data: any }, src) => {
    const func = commands[req.cmd];
    if (!func) return;
    return func(req.data, src);
  }
);

createApp(App).mount(document.body);

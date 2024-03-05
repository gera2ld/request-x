import '@/common/style';
import { handleMessages, sendMessage } from '@/common/util';
import { ListGroups } from '@/types';
import { createApp } from 'vue';
import App from './components/app.vue';
import { store } from './store';
import { editList, isRoute, setRoute, updateRoute } from './util';

createApp(App).mount(document.body);

loadData();
updateRoute();
if (!isRoute('lists')) {
  setRoute();
}

handleMessages({
  UpdateLists: loadData,
  CheckAction: checkAction,
});

async function loadData() {
  store.lists = await sendMessage<ListGroups>('GetLists');
  store.ruleErrors =
    await sendMessage<Record<number, Record<number, string>>>('GetErrors');
  checkAction();
}

const actionHandlers: Record<string, (payload: any) => void> = {
  SubscribeUrl(url: string) {
    editList({
      subscribeUrl: url,
      isSubscribed: true,
    });
  },
  OpenList(id: number) {
    window.location.hash = `#lists/${id}`;
  },
};

async function checkAction() {
  const action = await sendMessage<{ name: string; payload: any } | null>(
    'GetAction',
  );
  if (action) {
    const handler = actionHandlers[action.name];
    handler?.(action.payload);
  }
}

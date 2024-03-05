import '@/common/style';
import { handleMessages, sendMessage } from '@/common/util';
import { ListGroups } from '@/types';
import { createApp } from 'vue';
import App from './app.vue';
import { store } from './store';

createApp(App).mount(document.body);

loadData();

handleMessages({
  UpdateLists: loadData,
});

async function loadData() {
  store.lists = await sendMessage<ListGroups>('GetLists');
  store.ruleErrors =
    await sendMessage<Record<number, Record<number, string>>>('GetErrors');
}

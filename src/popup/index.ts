import { createApp } from 'vue';
import { loadData, loadLists } from '@/common/api';
import App from './app.vue';
import { store } from './store';
import '@/common/style.css';

(async () => {
  const [{ features }, lists] = await Promise.all([loadData(), loadLists()]);
  store.lists = lists;
  store.features = features;

  if (!features.cookies) delete lists.cookie;
})();

createApp(App).mount(document.body);

import { createApp } from 'vue';
import browser from '#/common/browser';
import { store } from './util';
import App from './app.vue';
import './style.css';

browser.runtime.sendMessage({ cmd: 'GetCount' }).then((data) => {
  store.count = data;
});

createApp(App).mount(document.body);

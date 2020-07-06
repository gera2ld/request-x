import Vue from 'vue';
import { store } from './util';
import App from './app.vue';
import './style.css';

browser.runtime.sendMessage({ cmd: 'GetCount' })
  .then(data => {
    store.count = data;
  });

const vm = new Vue({
  render: h => h(App),
})
.$mount();
document.body.append(vm.$el);

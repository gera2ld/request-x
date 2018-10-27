import '#/common/browser';
import Vue from 'vue';
import App from './app';

const vm = new Vue({
  render: h => h(App),
})
.$mount();
document.body.append(vm.$el);

import Vue from 'vue';
import 'src/common/browser';
import App from './app';

new Vue({
  render: h => h(App),
})
.$mount('#app');

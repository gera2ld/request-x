!function () {
  chrome.runtime.sendMessage({cmd: 'GetRules'}, res => {
    store.items = res.data;
  });

  function dumpRules() {
    chrome.runtime.sendMessage({cmd: 'SetRules', data: store.items});
  }

  function isValidMethod(method) {
    return !method || ~[
      '*',
      'HEAD',
      'GET',
      'POST',
      'PUT',
      'DELETE',
      'PATCH',
    ].indexOf(method.toUpperCase());
  }
  function isValidURL(url) {
    return /^[^:\/]+:\/\/[^\/]+\//.test(url);
  }

  const store = {
    items: [],
    item: null,
  };

  new Vue({
    el: '#app',
    data: store,
    methods: {
      create() {
        this.item = {
          index: -1,
        };
      },
      save() {
        if (Object.keys(this.status).some(key => !this.status[key])) return;
        const item = {
          method: this.item.method.toUpperCase(),
          url: this.item.url,
        };
        const index = this.item.index;
        this.item = null;
        if (index < 0) {
          this.items.push(item);
        } else {
          this.items.$set(index, item);
        }
        dumpRules();
      },
      cancel() {
        this.item = null;
      },
      edit(index) {
        this.item = Object.assign({
          index,
        }, this.items[index]);
      },
      remove(index) {
        this.items.splice(index, 1);
        dumpRules();
      },
    },
    computed: {
      status() {
        return {
          method: isValidMethod(this.item.method),
          url: isValidURL(this.item.url),
        };
      },
      classMethod() {
        return this.status.method ? 'item-ok' : 'item-err';
      },
      classURL() {
        return this.status.url ? 'item-ok' : 'item-err';
      },
    },
  });
}();

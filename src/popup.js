!function () {
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
  function isValidURLPattern(url) {
    return /^[^:\/]+:\/\/[^\/]+\//.test(url);
  }
  function isValidURL(url) {
    return /^[\w-]+:\/\/.*?\//.test(url);
  }
  function loadFile(callback) {
    const input = document.createElement('input');
    input.setAttribute('type', 'file');
    input.setAttribute('Accept', 'application/json');
    input.addEventListener('change', e => {
      input.files && input.files.length && callback(input.files[0]);
    }, false);
    input.click();
  }
  function blob2Text(blob, callback) {
    const reader = new FileReader;
    reader.onload = () => {
      callback(reader.result);
    };
    reader.readAsText(blob);
  }
  function pickData(obj, keys) {
    return keys.reduce((picked, key) => {
      if (obj[key] != null) picked[key] = obj[key];
      return picked;
    }, {});
  }
  function debounce(func, delay) {
    function run(ctx, args) {
      timer = null;
      func.apply(ctx, args);
    }
    var timer;
    return function () {
      if (timer) {
        clearTimeout(timer);
      }
      const ctx = this;
      const args = arguments;
      timer = setTimeout(() => {
        run(ctx, args);
      }, delay);
    };
  }

  new Vue({
    el: '#app',
    data: {
      lists: [],
      offset: 0,
      minOffset: 0,
      currentList: null,
      editData: null,
    },
    methods: {
      createRule() {
        this.editData = {
          rule: {
            index: -1,
          },
        };
      },
      saveRule() {
        if (!this.statusOk()) return;
        const item = this.editData.rule;
        const rule = {
          method: item.method.toUpperCase(),
          url: item.url,
        };
        const index = item.index;
        this.editData = null;
        if (index < 0) {
          this.currentList.rules.push(rule);
        } else {
          this.currentList.rules.$set(index, rule);
        }
        this.dump();
      },
      createList() {
        this.editData = {
          list: {
            index: -1,
            enabled: true,
          },
        };
      },
      subscribeList() {
        this.editData = {
          list: {
            index: -1,
            enabled: true,
          },
          subscribe: true,
        };
      },
      doSaveList(list, index) {
        this.dump(list).then(data => {
          if (index < 0) {
            this.lists.push(data);
          } else {
            this.lists.$set(index, data);
          }
          this.recalcTabs();
        });
      },
      saveList() {
        if (!this.statusOk()) return;
        const item = this.editData.list;
        const list = pickData(item, [
          'id',
          'title',
          'enabled',
        ]);
        if (this.editData.subscribe) list.subscribeUrl = item.subscribeUrl;
        this.editData = null;
        this.doSaveList(list, item.index);
      },
      importList() {
        const doImport = text => {
          const data = JSON.parse(text);
          const list = pickData(data, ['name', 'rules']);
          this.doSaveList(list, -1);
        };
        loadFile(file => blob2Text(file, doImport));
      },
      exportList() {
        const list = {
          name: this.currentList.title,
          rules: this.currentList.rules,
        };
        const blob = new Blob([JSON.stringify(list)], {type: 'application/json'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.download = `${name}.json`;
        a.href = url;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url));
      },
      cancel() {
        this.editData = null;
      },
      editRule(index) {
        this.editData = {
          rule: Object.assign({
            index,
          }, this.currentList.rules[index]),
        };
      },
      editList(index) {
        this.editData = {
          list: Object.assign({
            index,
          }, pickData(this.currentList, [
            'id',
            'enabled',
            'name',
            'title',
            'subscribeUrl',
          ])),
          subscribe: !!this.currentList.subscribeUrl,
        };
      },
      removeRule(index) {
        this.currentList.rules.splice(index, 1);
        this.dump();
      },
      removeList() {
        const list = this.editData.list;
        this.editData = null;
        chrome.runtime.sendMessage({cmd: 'RemoveList', data: list.id}, res => {
          if (this.currentList.id === list.id) {
            this.lists.splice(list.index, 1);
            const index = Math.min(list.index, this.lists.length - 1);
            this.select(this.lists[index]);
            this.recalcTabs();
          }
        });
      },
      select(list) {
        list = list || this.lists[0];
        this.editData = null;
        this.currentList = Object.assign({
          rules: [],
        }, list);
        chrome.runtime.sendMessage({cmd: 'GetList', data: list.id}, res => {
          this.currentList.rules = res.data.rules;
        });
      },
      dump(list) {
        list = list || this.currentList;
        return new Promise((resolve, reject) => {
          chrome.runtime.sendMessage({cmd: 'UpdateList', data: list}, res => {
            resolve(res.data);
          });
        });
      },
      statusClass(key) {
        return this.status[key] ? 'item-ok' : 'item-err';
      },
      statusOk() {
        return Object.keys(this.status).every(key => this.status[key]);
      },
      getTitle(list) {
        return list.title || list.name || 'No name';
      },
      offsetDec() {
        if (this.offset > this.minOffset) this.offset -= 60;
      },
      offsetInc() {
        if (this.offset < this.maxOffset) this.offset += 60;
      },
      recalcTabs() {
        const elItems = this.$els.items;
        this.$set('maxOffset', Math.max(0, elItems.scrollWidth - elItems.offsetWidth));
        this.offset = Math.min(this.offset, this.maxOffset);
      },
    },
    computed: {
      status() {
        const rule = this.editData.rule;
        const list = this.editData.list;
        return {
          title: true,
          method: !rule || isValidMethod(rule.method),
          url: !rule || isValidURLPattern(rule.url),
          subscribeUrl: !this.editData.subscribe || isValidURL(list.subscribeUrl),
        };
      },
    },
    watch: {
      offset(offset) {
        this.$els.items.scrollLeft = offset;
      },
    },
    ready() {
      this.recalcTabs = debounce(this.recalcTabs);
      chrome.runtime.sendMessage({cmd: 'GetLists'}, res => {
        this.lists = res.data;
        this.select();
        this.recalcTabs();
      });
    },
  });
}();

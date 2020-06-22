<template>
  <div class="nav flex flex-col">
    <div class="nav-body flex-auto">
      <div class="nav-group-title">Settings</div>
      <div
        class="nav-item"
        :class="{ active: store.route.value === 'settings/interface'}"
        @click="onSelectSetting('interface')">
        Interface
      </div>
      <div class="nav-group-title">Lists</div>
      <div
        class="nav-item"
        v-for="(item, index) in store.lists"
        :key="index"
        :class="{ active: store.route.value === `rules/${item.id}`, enabled: item.enabled }"
        @click="onSelect(item)"
        :title="getName(item)">
        <span class="nav-item-status" @click.prevent.stop="switchStatus(item)"></span>
        <span class="nav-item-text" v-text="getName(item)"></span>
      </div>
    </div>
    <div class="nav-footer">
      <button @click.prevent="onListNew">Add new list</button>
      <button @click.prevent="onListImport">Import list</button>
      <button @click.prevent="onListSubscribe">Subscribe list</button>
      <button @click.prevent="onListFetchAll">Fetch all</button>
    </div>
  </div>
</template>

<script>
import {
  store, dump, remove, pickData, loadFile, blob2Text, setRoute,
} from '../utils';

export default {
  data() {
    return {
      store,
      errors: {},
    };
  },
  methods: {
    getName(item) {
      return item.name || item.defaultName || 'No name';
    },
    switchStatus(item) {
      item.enabled = !item.enabled;
      dump(pickData(item, ['id', 'enabled']));
    },
    onSelectSetting(id) {
      setRoute(`settings/${id}`);
      this.store.current = null;
    },
    onSelect(item) {
      setRoute(`rules/${item.id}`);
      this.store.current = item;
    },
    onListNew() {
      this.store.editList = {
        name: '',
      };
    },
    onListImport() {
      loadFile()
      .then(blob2Text)
      .then((text) => {
        const data = JSON.parse(text);
        dump(pickData(data, ['name', 'rules']));
      });
    },
    onListSubscribe() {
      this.store.editList = {
        name: '',
        subscribeUrl: '',
        isSubscribed: true,
      };
    },
    onListEdit(list) {
      this.store.editList = Object.assign({}, list, {
        isSubscribed: !!list.subscribeUrl,
        isEdit: true,
      });
    },
    onListExport(list) {
      const data = {
        name: this.getName(list) || 'No name',
        rules: list.rules,
      };
      const basename = data.name.replace(/\s+/g, '-').toLowerCase();
      const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.download = `${basename}.json`;
      a.href = url;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url));
    },
    onListRemove(list) {
      remove(list.id);
    },
    onListSave() {
      this.checkErrors();
      if (Object.keys(this.errors).some(key => this.errors[key])) return;
      dump(pickData(this.editList, ['id', 'name', 'subscribeUrl']));
      this.onListCancel();
    },
    onListCancel() {
      this.editList = null;
    },
    onListFetch(item) {
      browser.runtime.sendMessage({
        cmd: 'FetchList',
        data: item.id,
      });
    },
    onListFetchAll() {
      browser.runtime.sendMessage({ cmd: 'FetchLists' });
    },
    getLabelSwitch(item) {
      return item.enabled ? 'Disable' : 'Enable';
    },
  },
};
</script>

<style>
.nav {
  width: 15rem;
  margin-right: 16px;
  &-body {
    margin-top: 1rem;
    margin-right: -1px;
    overflow-y: auto;
    z-index: 1;
  }
  &-footer {
    height: 10rem;
    padding: 1rem;
    > button {
      margin-right: .5rem;
      margin-bottom: .5rem;
    }
  }
  &-item {
    position: relative;
    display: block;
    margin-left: 1px;
    padding: .6rem 1rem;
    border-radius: 4px;
    cursor: pointer;
    color: #888;
    &-text {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    &:hover {
      background: #f8f8f8;
    }
    &.active {
      margin-left: 0;
      background: #eef;
      color: inherit;
    }
    &-status {
      display: inline-block;
      width: 12px;
      height: 12px;
      margin-right: 6px;
      border-radius: 4px;
      background: gray;
      .enabled > & {
        background: green;
      }
    }
    &-manage {
      display: none;
      position: absolute;
      top: .5rem;
      right: .5rem;
      color: #888;
    }
    &:hover,
    &.active {
      .nav-item-manage {
        display: block;
      }
    }
    &-btn {
      padding: .5rem;
      margin-right: -.5rem;
      > div {
        border-top: .4rem solid;
        border-left: .4rem solid transparent;
        border-right: .4rem solid transparent;
      }
    }
  }
  &-group-title {
    margin: 12px 0 6px;
    text-transform: uppercase;
    font-size: 12px;
    color: #999;
  }
}
</style>

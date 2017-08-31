<template>
  <div class="nav flex flex-col">
    <div class="nav-body flex-auto">
      <div
        class="nav-item"
        v-for="(item, index) in store.lists"
        :class="{ active: item.id === store.current.id, enabled: item.enabled }"
        @click="onSelect(item)"
        :title="getName(item)">
        <span class="nav-item-status" @click.prevent.stop="switchStatus(item)"></span>
        <span class="nav-item-text" v-text="getName(item)"></span>
        <div class="nav-item-manage" @click.stop>
          <dropdown :closeAfterClick="true" align="right">
            <div class="nav-item-btn" slot="toggle"><div></div></div>
            <a href="#" @click.prevent="switchStatus(item)" v-text="getLabelSwitch(item)"></a>
            <a href="#" @click.prevent="onListEdit(item)">Edit</a>
            <a href="#" @click.prevent="onListFetch(item)" v-if="item.subscribeUrl">Fetch now</a>
            <a href="#" @click.prevent="onListExport(item)">Export</a>
            <a href="#" v-if="canRemoveList" @click.prevent="onListRemove(item)">Remove</a>
          </dropdown>
        </div>
      </div>
    </div>
    <div class="nav-footer">
      <button @click.prevent="onListNew">Add new list</button>
      <button @click.prevent="onListImport">Import list</button>
      <button @click.prevent="onListSubscribe">Subscribe list</button>
      <button @click.prevent="onListFetchAll">Fetch all</button>
    </div>
    <modal :visible="!!listMeta" @close="onListCancel">
      <form class="nav-modal" v-if="listMeta" @submit.prevent="onListSave">
        <h3 v-text="listMeta.isEdit ? 'Edit list' : listMeta.isSubscribed ? 'Subscribe list' : 'Create list'"></h3>
        <div class="nav-group">
          <div>Name:</div>
          <input v-model="listMeta.name" :placeholder="listMeta.defaultName">
        </div>
        <div class="nav-group" v-if="listMeta.isSubscribed">
          <div>Subscribe URL:</div>
          <input
            :class="{ error: errors.subscribeUrl }"
            :value="listMeta.subscribeUrl"
            :readonly="listMeta.isEdit"
            @input="listMeta.isEdit || (listMeta.subscribeUrl = $event.target.value)"
          />
        </div>
        <div class="nav-modal-buttons">
          <button type="submit">OK</button>
          <button @click.prevent="onListCancel">Cancel</button>
        </div>
      </form>
    </modal>
  </div>
</template>

<script>
import { store, dump, remove, pickData, debounce, isValidURL, loadFile, blob2Text } from '../utils';
import { Dropdown, Modal } from './vueleton';

export default {
  components: {
    Dropdown,
    Modal,
  },
  data() {
    return {
      store,
      listMeta: null,
      errors: {},
    };
  },
  computed: {
    canRemoveList() {
      return this.store.lists.length > 1;
    },
  },
  watch: {
    listMeta: {
      deep: true,
      handler() {
        this.updateErrors();
      },
    },
  },
  created() {
    this.updateErrors = debounce(this.checkErrors, 200);
  },
  methods: {
    checkErrors() {
      const listMeta = this.listMeta || {};
      this.errors = {
        subscribeUrl: listMeta.isSubscribed && !isValidURL(listMeta.subscribeUrl),
      };
    },
    getName(item) {
      return item.name || item.defaultName || 'No name';
    },
    onSelect(item) {
      store.current = item;
    },
    switchStatus(item) {
      item.enabled = !item.enabled;
      dump(pickData(item, ['id', 'enabled']));
    },
    onListNew() {
      this.listMeta = {
        name: '',
      };
    },
    onListImport() {
      loadFile()
      .then(blob2Text)
      .then(text => {
        const data = JSON.parse(text);
        dump(pickData(data, ['name', 'rules']));
      });
    },
    onListSubscribe() {
      this.listMeta = {
        name: '',
        subscribeUrl: '',
        isSubscribed: true,
      };
    },
    onListEdit(list) {
      this.listMeta = Object.assign({}, list, {
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
      dump(pickData(this.listMeta, ['id', 'name', 'subscribeUrl']));
      this.onListCancel();
    },
    onListCancel() {
      this.listMeta = null;
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
  &-body {
    margin-top: 1rem;
    margin-left: -1px;
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
    border: 1px solid #eee;
    border-left: 0;
    border-top-right-radius: .5rem;
    border-bottom-right-radius: .5rem;
    cursor: pointer;
    color: #888;
    &-text {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    &.active {
      margin-left: 0;
      border-color: #888;
      background: white;
    }
    &.enabled {
      color: inherit;
    }
    &:hover {
      background: #f0f0f0;
    }
    &-status {
      display: inline-block;
      width: .8rem;
      height: .8rem;
      border-radius: .3rem;
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
  .vl-dropdown {
    white-space: nowrap;
    &-menu {
      background: white;
      border: 1px solid #bbb;
      padding: 0;
      a {
        display: block;
        padding: .5rem 1rem;
        &:hover {
          background: #f0f0f0;
        }
      }
    }
  }
  &-modal {
    width: 30rem;
    padding: 1rem;
    background: white;
    &-buttons {
      margin-top: .5rem;
      text-align: right;
    }
    h3 {
      margin-bottom: 1rem;
    }
  }
  &-group {
    text-align: left;
    > input {
      width: 100%;
      height: 2rem;
    }
    ~ .nav-group {
      margin-top: .5rem;
    }
  }
}
</style>

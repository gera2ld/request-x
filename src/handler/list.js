import { Rule } from './rule';

const getData = browser.storage.local.get;
const dumpData = browser.storage.local.set;
const removeData = browser.storage.local.remove;

export class List {
  static all = [];

  constructor(id) {
    this.id = id;
    this.fetching = null;
  }

  key() {
    return List.key(this.id);
  }

  load(data) {
    const key = this.key();
    return (data ? Promise.resolve(data) : getData(key).then(res => res && res[key]))
    .then((value) => {
      const item = value || {};
      [
        'name',
        'title',
        'subscribeUrl',
        'lastUpdated',
        'enabled',
      ].forEach((ikey) => {
        if (item[ikey] != null) this[ikey] = item[ikey];
      });
      this.name = this.name || 'No name';
      if (data.rules) this.rules = data.rules.map(rule => new Rule(rule));
    });
  }

  dump() {
    const data = {};
    data[this.key()] = this.get();
    return dumpData(data).then(() => this.fireChange());
  }

  get() {
    return {
      id: this.id,
      name: this.name,
      title: this.title,
      enabled: this.enabled,
      subscribeUrl: this.subscribeUrl,
      lastUpdated: this.lastUpdated,
      rules: this.rules.map(rule => rule.dump()),
    };
  }

  update(data) {
    return this.load(data).then(() => this.dump());
  }

  fetch() {
    if (!this.subscribeUrl) return Promise.resolve();
    if (!this.fetching) {
      this.fetching = fetch(this.subscribeUrl)
      .then(res => res.json())
      .then(data => this.update({
        name: data.name || '',
        rules: data.rules,
        lastUpdated: Date.now(),
      }));
      this.fetching.catch(() => {}).then(() => { this.fetching = null; });
    }
    return this.fetching;
  }

  match(details) {
    if (!this.enabled) return;
    for (const rule of this.rules) {
      const target = rule.check(details);
      if (target) return target;
    }
  }

  fireChange() {
    browser.runtime.sendMessage({ cmd: 'UpdatedList', data: this.get() });
  }

  static key(id) {
    return `list:${id}`;
  }

  static create(data) {
    return getData('lists').then(res => res.lists || [])
    .then((ids) => {
      const newId = (ids[ids.length - 1] || 0) + 1;
      ids.push(newId);
      return dumpData({ lists: ids }).then(() => newId);
    })
    .then((id) => {
      const list = new List(id);
      List.all.push(list);
      data.rules = data.rules || [];
      data.enabled = data.enabled == null ? true : data.enabled;
      return list.update(data).then(() => list.fetch());
    });
  }

  static find(id) {
    return List.all.find(list => list.id === id);
  }

  static remove(id) {
    const list = List.find(id);
    const i = List.all.indexOf(list);
    List.all.splice(i, 1);
    return removeData(list.key())
    .then(() => {
      const ids = List.all.map(item => item.id);
      browser.runtime.sendMessage({ cmd: 'RemovedList', data: id });
      return dumpData({ lists: ids });
    });
  }

  static load() {
    return getData('lists')
    .then(res => res.lists)
    .then(ids => (
      ids && getData(ids.map(List.key))
      .then((data) => {
        List.all = ids.map((id) => {
          const list = new List(id);
          list.load(data[List.key(id)]);
          return list;
        });
      })
    ))
    .then(() => {
      if (!List.all.length) return List.create({ name: 'Default' });
    });
  }

  static get() {
    return List.all.map(list => list.get());
  }

  static fetch() {
    return Promise.all(List.all.map(list => list.fetch().catch(() => {})));
  }

  static match(details) {
    for (const list of List.all) {
      const target = list.match(details);
      if (target) return target;
    }
  }
}

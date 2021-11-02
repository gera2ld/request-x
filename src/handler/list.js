import { Rule } from './rule';
import {
  getExactData, dumpExactData, getData, removeData,
} from './util';

export class List {
  /**
   * @type List[]
   */
  static all = [];

  constructor(id) {
    /**
     * @type {number}
     */
    this.id = id;
    /**
     * @type {string}
     */
    this.name = 'No name';
    /**
     * @type {string}
     */
    this.title = '';
    /**
     * @type {string}
     */
    this.subscribeUrl = '';
    /**
     * @type {number}
     */
    this.lastUpdated = 0;
    /**
     * @type {boolean}
     */
    this.enabled = true;
    /**
     * @type {Rule[]}
     */
    this.rules = [];
    this.fetching = null;
  }

  key() {
    return List.key(this.id);
  }

  async load(data) {
    const key = this.key();
    data ??= await getExactData(key);
    if (data) {
      [
        'name',
        'title',
        'subscribeUrl',
        'lastUpdated',
        'enabled',
      ].forEach(ikey => {
        if (data[ikey] != null) this[ikey] = data[ikey];
      });
      this.name ||= 'No name';
      if (data.rules) this.rules = data.rules.map(rule => new Rule(rule));
    }
  }

  async dump() {
    await dumpExactData(this.key(), this.get());
    this.fireChange();
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

  async update(data) {
    await this.load(data);
    await this.dump();
  }

  async doFetch() {
    try {
      const res = await fetch(this.subscribeUrl);
      const data = await res.json();
      this.update({
        name: data.name || '',
        rules: data.rules,
        lastUpdated: Date.now(),
      });
    } finally {
      this.fetching = null;
    }
  }

  async fetch() {
    if (!this.subscribeUrl) return;
    if (!this.fetching) this.fetching = this.doFetch();
    return this.fetching;
  }

  match(details, method) {
    if (!this.enabled) return;
    for (const rule of this.rules) {
      const target = rule[method](details);
      if (target) return target;
    }
  }

  fireChange() {
    browser.runtime.sendMessage({ cmd: 'UpdatedList', data: this.get() });
  }

  /**
   * @param {number} id
   */
  static key(id) {
    return `list:${id}`;
  }

  static async create(data) {
    const ids = await getExactData('lists') || [];
    const newId = (ids[ids.length - 1] || 0) + 1;
    ids.push(newId);
    await dumpExactData('lists', ids);
    const list = new List(newId);
    List.all.push(list);
    await list.update(data);
    await list.fetch();
    return list;
  }

  static find(id) {
    return List.all.find(list => list.id === id);
  }

  static async remove(id) {
    const list = List.find(id);
    const i = List.all.indexOf(list);
    List.all.splice(i, 1);
    await removeData(list.key());
    const ids = List.all.map(item => item.id);
    browser.runtime.sendMessage({ cmd: 'RemovedList', data: id });
    await dumpExactData('lists', ids);
  }

  static async load() {
    const ids = await getExactData('lists');
    if (ids) {
      const data = await getData(ids.map(List.key));
      List.all = ids.map((id) => {
        const list = new List(id);
        list.load(data[List.key(id)]);
        return list;
      });
    }
    if (!List.all.length) {
      await List.create({ name: 'Default' });
    }
  }

  static get() {
    return List.all.map(list => list.get());
  }

  static fetch() {
    return Promise.all(List.all.map(list => list.fetch().catch(() => {})));
  }

  static match(...args) {
    for (const list of List.all) {
      const target = list.match(...args);
      if (target) return target;
    }
  }
}

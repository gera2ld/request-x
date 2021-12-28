import browser from '#/common/browser';
import { ListData, RequestDetails, RuleMatchResult } from '#/types';
import { Rule } from './rule';
import { getExactData, dumpExactData, getData, removeData } from './util';

export class List {
  static all: List[] = [];

  private name = 'No name';
  private title = '';
  private subscribeUrl = '';
  private lastUpdated = 0;
  private enabled = true;
  private rules: Rule[] = [];
  private fetching: Promise<void> | undefined;

  constructor(public id: number) {}

  key() {
    return List.key(this.id);
  }

  async load(data: Partial<ListData>) {
    const key = this.key();
    data ??= await getExactData(key);
    if (data) {
      ['name', 'title', 'subscribeUrl', 'lastUpdated', 'enabled'].forEach(
        (ikey) => {
          if (data[ikey] != null) this[ikey] = data[ikey];
        }
      );
      this.name ||= 'No name';
      if (data.rules) this.rules = data.rules.map((rule) => new Rule(rule));
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
      rules: this.rules.map((rule) => rule.dump()),
    };
  }

  async update(data: Partial<ListData>) {
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
      this.fetching = undefined;
    }
  }

  async fetch() {
    if (!this.subscribeUrl) return;
    if (!this.fetching) this.fetching = this.doFetch();
    return this.fetching;
  }

  match(details: RequestDetails, method: string): void | RuleMatchResult {
    if (!this.enabled) return;
    for (const rule of this.rules) {
      const target = rule[method](details);
      if (target) return target;
    }
  }

  fireChange() {
    browser.runtime.sendMessage({ cmd: 'UpdatedList', data: this.get() });
  }

  static key(id: number) {
    return `list:${id}`;
  }

  static async create(data: Partial<ListData>) {
    const ids = (await getExactData<number[]>('lists')) || [];
    const newId = (ids[ids.length - 1] || 0) + 1;
    ids.push(newId);
    await dumpExactData('lists', ids);
    const list = new List(newId);
    List.all.push(list);
    await list.update(data);
    await list.fetch();
    return list;
  }

  static find(id: number) {
    return List.all.find((list) => list.id === id);
  }

  static async remove(id: number) {
    const list = List.find(id);
    const i = List.all.indexOf(list);
    List.all.splice(i, 1);
    await removeData(list.key());
    const ids = List.all.map((item) => item.id);
    browser.runtime.sendMessage({ cmd: 'RemovedList', data: id });
    await dumpExactData('lists', ids);
  }

  static async load() {
    const ids = await getExactData<number[]>('lists');
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
    return List.all.map((list) => list.get());
  }

  static fetch() {
    return Promise.all(List.all.map((list) => list.fetch().catch(() => {})));
  }

  static match(...args: Parameters<List['match']>) {
    for (const list of List.all) {
      const target = list.match(...args);
      if (target) return target;
    }
  }
}

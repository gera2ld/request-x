import browser from '#/common/browser';
import { reorderList } from '#/common/util';
import {
  CookieData,
  CookieDetails,
  CookieMatchResult,
  ListData,
  RequestData,
  RequestDetails,
  RequestMatchResult,
} from '#/types';
import { groupBy } from 'lodash-es';
import { BaseRule, RequestRule, CookieRule } from './rule';
import { getExactData, dumpExactData, getData, removeData } from './util';

let lastId = 0;

export function getKey(id: number) {
  return `list:${id}`;
}

export abstract class BaseList<T extends BaseRule<U>, D, M, U> {
  protected name = 'No name';
  protected title = '';
  protected subscribeUrl = '';
  protected lastUpdated = 0;
  protected enabled = true;
  protected rules: T[] = [];
  protected fetching: Promise<void> | undefined;
  protected abstract type: ListData['type'];

  abstract createRule(rule: any): T;

  constructor(public id: number) {}

  key() {
    return getKey(this.id);
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
      if (data.rules) {
        this.rules = data.rules.map((rule) => this.createRule(rule));
      }
    }
  }

  async dump() {
    await dumpExactData(this.key(), this.get());
    this.fireChange();
  }

  get() {
    return {
      id: this.id,
      type: this.type,
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

  fireChange() {
    browser.runtime.sendMessage({ cmd: 'UpdatedList', data: this.get() });
  }

  match(details: D, method: string): void | M {
    if (!this.enabled) return;
    for (const rule of this.rules) {
      const target = rule[method](details);
      if (target) return target;
    }
  }
}

export class RequestList extends BaseList<
  RequestRule,
  RequestDetails,
  RequestMatchResult,
  RequestData
> {
  type: ListData['type'] = 'request';

  createRule(rule: RequestData) {
    return new RequestRule(rule);
  }
}

export class CookieList extends BaseList<
  CookieRule,
  CookieDetails,
  CookieMatchResult,
  CookieData
> {
  type: ListData['type'] = 'cookie';

  createRule(rule: CookieData) {
    return new CookieRule(rule);
  }
}

export abstract class BaseListManager<
  T extends BaseList<BaseRule<U>, D, M, U>,
  D,
  M,
  U
> {
  data: T[] = [];

  abstract createList(id: number): T;

  async create(data: Partial<ListData>) {
    lastId += 1;
    const newId = lastId;
    const list = this.createList(newId);
    await list.update(data);
    await list.fetch();
    this.data.push(list);
    dumpLists();
    return list;
  }

  find(id: number) {
    return this.data.find((list) => list.id === id);
  }

  async remove(id: number) {
    const list = this.find(id);
    const i = this.data.indexOf(list);
    this.data.splice(i, 1);
    await removeData(list.key());
    dumpLists();
  }

  move(index: number, offset: number) {
    if (reorderList(this.data, index, offset)) dumpLists();
  }

  get() {
    return this.data.map((list) => list.get());
  }

  fetch() {
    return Promise.all(this.data.map((list) => list.fetch().catch(() => {})));
  }

  match(...args: Parameters<T['match']>): void | M {
    for (const list of this.data) {
      const [details, type] = args;
      const target = list.match(details, type);
      if (target) return target;
    }
  }

  async load(items: ListData[]) {
    this.data = items.map((item) => {
      lastId = Math.max(lastId, item.id);
      const list = this.createList(item.id);
      list.load(item);
      return list;
    });
  }
}

export class RequestListManager extends BaseListManager<
  RequestList,
  RequestDetails,
  RequestMatchResult,
  RequestData
> {
  createList(id: number) {
    return new RequestList(id);
  }
}

export class CookieListManager extends BaseListManager<
  CookieList,
  CookieDetails,
  CookieMatchResult,
  CookieData
> {
  createList(id: number) {
    return new CookieList(id);
  }
}

export const lists = {
  request: new RequestListManager(),
  cookie: new CookieListManager(),
};

export async function dumpLists() {
  const ids = Object.values(lists).flatMap((list) =>
    list.data.map((item: RequestList | CookieList) => item.id)
  );
  await dumpExactData('lists', ids);
}

export async function loadLists() {
  const ids = await getExactData<number[]>('lists');
  if (ids) {
    const data = await getData(ids.map(getKey));
    const items = ids.map((id) => data[getKey(id)]).filter(Boolean);
    const resources = groupBy(items, (item) => item.type || 'request');
    Object.entries(resources).forEach(([key, data]) => {
      lists[key]?.load(data);
    });
  }
}

export async function fetchLists() {
  return Object.values(lists).map((list) => list.fetch());
}

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
import {
  getExactData,
  dumpExactData,
  getData,
  removeData,
  hookInstall,
} from './util';

let lastId = 0;
let listErrors: { [id: number]: string } = {};

export function getKey(id: number) {
  return `list:${id}`;
}

export abstract class BaseList<T extends BaseRule<U>, D, M, U> {
  protected name = 'No name';
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
      ['name', 'subscribeUrl', 'lastUpdated', 'enabled'].forEach((ikey) => {
        if (data[ikey] != null) this[ikey] = data[ikey];
      });
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
      const data = await fetchListData(this.subscribeUrl);
      if (data.type !== this.type) throw new Error('Type mismatch');
      this.update(data);
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

  move(selection: number[], target: number, downward: boolean) {
    const reordered = reorderList(this.data, selection, target, downward);
    if (reordered) {
      this.data = reordered;
      dumpLists();
    }
  }

  get() {
    return this.data.map((list) => list.get());
  }

  async fetch() {
    const errors = await Promise.all(
      this.data.map((list) =>
        list.fetch().catch((error) => ({
          id: list.id,
          error: `${error}`,
        }))
      )
    );
    return errors.filter(Boolean) as Array<{ id: number; error: string }>;
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
  const groupErrors = await Promise.all(
    Object.values(lists).map((list) => list.fetch())
  );
  listErrors = groupErrors.flat().reduce((res, item) => {
    res[item.id] = item.error;
    return res;
  }, {});
  browser.runtime.sendMessage({ cmd: 'SetErrors', data: listErrors });
}

export function getLastErrors() {
  return listErrors;
}

let count = 0;

export async function fetchListData(url: string) {
  count += 1;
  hookInstall.set(false);
  try {
    const res = await fetch(url);
    const data = await res.json();
    return {
      type: data.type ?? 'request',
      name: data.name || '',
      rules: data.rules,
      lastUpdated: Date.now(),
    } as Partial<ListData>;
  } finally {
    count -= 1;
    if (!count) hookInstall.set(true);
  }
}

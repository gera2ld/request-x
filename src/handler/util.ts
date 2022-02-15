import browser from '#/common/browser';
import { createGetterSetter } from '#/common/util';
import { ConfigStorage } from '#/types';

export const getData = browser.storage.local.get;
export const dumpData = browser.storage.local.set;
export const removeData = browser.storage.local.remove;

export async function getExactData<T>(key: string): Promise<T> {
  const res = await getData(key);
  return res[key];
}

export async function dumpExactData(key: string, value: any) {
  await dumpData({
    [key]: value,
  });
}

export async function getActiveTab() {
  const [tab] = await browser.tabs.query({
    active: true,
    lastFocusedWindow: true, // also gets incognito windows
  });
  return tab;
}

export class ObjectStorage<T extends { [key: string]: any }> {
  ready: Promise<void> | undefined;

  private data: T;

  constructor(private key: string, private defaults: T) {
    this.ready = this.load();
  }

  async load() {
    const data = await getExactData<T>(this.key);
    this.data = data || this.defaults;
    this.ready = undefined;
  }

  dump() {
    return dumpExactData(this.key, this.data);
  }

  async get<K extends string>(path: K): Promise<T[K]> {
    await this.ready;
    return this.data[path];
  }

  async getAll() {
    await this.ready;
    return this.data;
  }

  async set(update: Partial<T> | ((data: T) => Partial<T>)) {
    await this.ready;
    if (typeof update === 'function') {
      Object.assign(this.data, update(this.data));
    } else {
      Object.assign(this.data, update);
    }
    await this.dump();
  }
}

export function getUrl(cookie: {
  secure: boolean;
  domain: string;
  path: string;
}) {
  const url = [
    cookie.secure ? 'https:' : 'http:',
    '//',
    cookie.domain.startsWith('.') ? 'www' : '',
    cookie.domain,
    cookie.path,
  ].join('');
  return url;
}

// export const globalStorage = new ObjectStorage<GlobalStorage>('global', {});
export const configStorage = new ObjectStorage<ConfigStorage>('config', {
  badge: '',
});

export const hookInstall = createGetterSetter<boolean>(true);

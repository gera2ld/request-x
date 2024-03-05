import type { ConfigStorage } from '@/types';

export async function getExactData<T>(key: string): Promise<T> {
  const res = await chrome.storage.local.get(key);
  return res[key];
}

export async function dumpExactData(key: string, value: any) {
  await chrome.storage.local.set({
    [key]: value,
  });
}

export async function getActiveTab() {
  const [tab] = await chrome.tabs.query({
    active: true,
    lastFocusedWindow: true, // also gets incognito windows
  });
  return tab;
}

export class ObjectStorage<T extends { [key: string]: any }> {
  ready: Promise<void> | undefined;

  static async load<T extends { [key: string]: any }>(
    key: string,
    defaults: T,
  ) {
    const data = await getExactData<T>(key);
    return new ObjectStorage<T>(key, data || defaults);
  }

  constructor(
    private key: string,
    private data: T,
  ) {}

  dump() {
    return dumpExactData(this.key, this.data);
  }

  get<K extends string>(path: K): Promise<T[K]> {
    return this.data[path];
  }

  getAll() {
    return this.data;
  }

  async set(update: Partial<T> | ((data: T) => Partial<T>)) {
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
export const configPromise = ObjectStorage.load<ConfigStorage>('config', {
  badge: '',
});

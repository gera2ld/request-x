export const getData = browser.storage.local.get;
export const dumpData = browser.storage.local.set;
export const removeData = browser.storage.local.remove;

export async function getExactData(key) {
  const res = await getData(key);
  return res[key];
}

export async function dumpExactData(key, value) {
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

export class ObjectStorage {
  constructor(key) {
    this.key = key;
    this.loading = this.load();
  }

  async load() {
    const data = await getExactData(this.key);
    this.data = data || {};
    this.loading = null;
  }

  dump() {
    return dumpExactData(this.key, this.data);
  }

  get(path) {
    return path ? this.data?.[path] : this.data;
  }

  async set(update) {
    if (this.data) {
      if (typeof update === 'function') {
        Object.assign(this.data, update(this.data));
      } else {
        Object.assign(this.data, update);
      }
      return this.dump();
    }
  }
}

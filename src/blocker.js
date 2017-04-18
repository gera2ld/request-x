function getData(keys) {
  return new Promise(resolve => {
    chrome.storage.local.get(keys, res => {
      resolve(res);
    });
  });
}
function dumpData(data) {
  return new Promise(resolve => {
    chrome.storage.local.set(data, () => {
      resolve();
    });
  });
}
function removeData(keys) {
  return new Promise(resolve => {
    chrome.storage.local.remove(keys, () => {
      resolve();
    });
  });
}

class Rule {
  constructor(rule) {
    this.rule = rule;
    this.method = rule.method || '*';
    this.testURL = matchTester(rule.url).test;
  }

  testMethod(method) {
    return ['*', method].indexOf(this.method) >= 0;
  }

  test(details) {
    return this.testMethod(details.method) && this.testURL(details.url);
  }

  dump() {
    return this.rule;
  }
}

class List {
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
    .then(value => {
      const item = value || {};
      [
        'name',
        'title',
        'subscribeUrl',
        'lastUpdated',
        'enabled',
      ].forEach(ikey => {
        if (item[ikey] != null) this[ikey] = item[ikey];
      });
      this.name = this.name || 'No name';
      if (data.rules) this.rules = data.rules.map(rule => new Rule(rule));
    });
  }

  dump() {
    const data = {};
    data[this.key()] = this.json();
    this.fetch();
    return dumpData(data).then(() => this.fireChange());
  }

  meta() {
    return {
      id: this.id,
      name: this.name,
      title: this.title,
      enabled: this.enabled,
      subscribeUrl: this.subscribeUrl,
      lastUpdated: this.lastUpdated,
    };
  }

  json() {
    return Object.assign(this.meta(), {
      rules: this.rules.map(rule => rule.dump()),
    });
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

  test(details) {
    return this.enabled && this.rules.some(rule => rule.test(details));
  }

  fireChange() {
    chrome.runtime.sendMessage({ cmd: 'UpdatedList', data: this.json() });
  }

  static key(id) {
    return `list:${id}`;
  }

  static create(data) {
    return getData('lists').then(res => res.lists || [])
    .then(ids => {
      const newId = (ids[ids.length - 1] || 0) + 1;
      ids.push(newId);
      return dumpData({ lists: ids }).then(() => newId);
    })
    .then(id => {
      const list = new List(id);
      List.all.push(list);
      data.rules = data.rules || [];
      data.enabled = data.enabled == null ? true : data.enabled;
      return list.update(data);
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
      chrome.runtime.sendMessage({ cmd: 'RemovedList', data: id });
      return dumpData({ lists: ids });
    });
  }

  static load() {
    return getData('lists')
    .then(res => res.lists)
    .then(ids => (
      ids && getData(ids.map(List.key))
      .then(data => {
        List.all = ids.map(id => {
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

  static meta() {
    return List.all.map(list => list.meta());
  }

  static fetch() {
    return Promise.all(List.all.map(list => list.fetch().catch(() => {})));
  }

  static test(details) {
    return List.all.some(list => list.test(details));
  }
}

List.all = [];

function str2RE(str) {
  const re = str.replace(/([.?/])/g, '\\$1').replace(/\*/g, '.*?');
  return RegExp(`^${re}$`);
}

function matchScheme(rule, data) {
  // exact match
  if (rule === data) return 1;
  // * = http | https
  if (rule === '*' && /^https?$/i.test(data)) return 1;
  return 0;
}
function matchHost(rule, data) {
  // * matches all
  if (rule === '*') return 1;
  // exact match
  if (rule === data) return 1;
  // *.example.com
  if (/^\*\.[^*]*$/.test(rule)) {
    // matches the specified domain
    if (rule.slice(2) === data) return 1;
    // matches subdomains
    if (str2RE(rule).test(data)) return 1;
  }
  return 0;
}
function matchPath(rule, data) {
  return str2RE(rule).test(data);
}
function matchTester(rule) {
  let test;
  if (rule === '<all_urls>') test = () => true;
  else {
    const RE = /(.*?):\/\/([^/]*)\/(.*)/;
    const ruleParts = rule.match(RE);
    test = url => {
      const parts = url.match(RE);
      return !!ruleParts && !!parts
      && matchScheme(ruleParts[1], parts[1])
      && matchHost(ruleParts[2], parts[2])
      && matchPath(ruleParts[3], parts[3]);
    };
  }
  return { test };
}

chrome.webRequest.onBeforeRequest.addListener(details => {
  if (List.test(details)) {
    console.warn(`blocked: ${details.method} ${details.url}`);
    return { cancel: true };
  }
}, {
  urls: ['<all_urls>'],
}, ['blocking']);

const commands = {
  GetLists: () => List.meta(),
  GetList: id => List.find(id).json(),
  RemoveList: id => List.remove(id),
  UpdateList: data => (data.id ? List.find(data.id).update(data) : List.create(data)),
};
chrome.runtime.onMessage.addListener((req, src, callback) => {
  const func = commands[req.cmd];
  if (!func) return;
  const res = func(req.data, src);
  Promise.resolve(res)
  .then(data => callback({ data }), error => callback({ error }));
  return true;
});

List.load()
.then(() => {
  function doFetch() {
    List.fetch()
    .then(() => setTimeout(doFetch, 2 * 60 * 60 * 1000));
  }
  setTimeout(doFetch, 20 * 1000);
});

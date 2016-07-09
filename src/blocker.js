function getData(keys) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(keys, res => {
      resolve(res);
    });
  });
}
function dumpData(data) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set(data, () => {
      resolve();
    });
  });
}
function removeData(keys) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.remove(keys, () => {
      resolve();
    });
  });
}

function List(id) {
  this.id = id;
}
List.prototype.key = function () {
  return List.key(this.id);
};
List.prototype.load = function (data) {
  const key = this.key();
  return (data ? Promise.resolve(data) : getData(key).then(res => res && res[key]))
  .then(data => {
    data = data || {};
    this.name = data.name || 'No name';
    this.subscribeUrl = data.subscribeUrl;
    this.lastUpdated = data.lastUpdated;
    this.enabled = data.enabled;
    if (data.rules) this.rules = data.rules.map(rule => new Rule(rule));
  });
};
List.prototype.dump = function () {
  const data = {};
  data[this.key()] = this.json();
  return dumpData(data);
};
List.prototype.meta = function () {
  return {
    id: this.id,
    name: this.name,
    enabled: this.enabled,
    subscribeUrl: this.subscribeUrl,
    lastUpdated: this.lastUpdated,
  };
};
List.prototype.json = function () {
  return Object.assign(this.meta(), {
    rules: this.rules.map(rule => rule.dump()),
  });
};
List.prototype.update = function (data) {
  return this.load(data).then(() => this.dump()).then(() => this);
};
List.prototype.fetch = function () {
  if (!this.subscribeUrl) return Promise.resolve();
  return fetch(this.subscribeUrl)
  .then(res => res.json())
  .then(data => this.update({
    rules: data,
    lastUpdated: Date.now(),
  }));
};
List.prototype.test = function (details) {
  return this.enabled && this.rules.some(rule => rule.test(details));
};
List.key = function (id) {
  return `list:${id}`;
};
List.create = function (data) {
  return getData('lists').then(res => res.lists || [])
  .then(ids => {
    const newId = (ids[ids.length - 1] || 0) + 1;
    ids.push(newId);
    return dumpData({lists: ids}).then(() => newId);
  })
  .then(id => {
    const list = new List(id);
    List.all.push(list);
    data.rules = data.rules || [];
    data.enabled = data.enabled == null ? true : data.enabled;
    return list.update(data)
    .then(() => list);
  });
};
List.find = function (id) {
  return List.all.find(list => list.id === id);
};
List.remove = function (id) {
  const list = List.find(id);
  const i = List.all.indexOf(list);
  List.all.splice(i, 1);
  return removeData(list.key())
  .then(() => {
    const ids = List.all.map(list => list.id);
    return dumpData({lists: ids});
  });
};
List.all = [];
List.load = function () {
  return getData('lists')
  .then(res => res.lists)
  .then(ids => {
    return ids && getData(ids.map(List.key))
    .then(data => {
      List.all = ids.map(id => {
        const list = new List(id);
        list.load(data[List.key(id)]);
        return list;
      });
    });
  })
  .then(() => {
    if (!List.all.length) return List.create({name: 'Default'});
  });
};
List.meta = function () {
  return List.all.map(list => list.meta());
};
List.fetch = function () {
  return Promise.all(List.all.map(list => list.fetch().catch(() => {})));
};
List.test = function (details) {
  return List.all.some(list => list.test(details));
};

function Rule(rule) {
  this.rule = rule;
  this.method = rule.method || '*';
  this.testURL = matchFactory(rule.url);
}
Rule.prototype.testMethod = function (method) {
  return ~['*', method].indexOf(this.method);
};
Rule.prototype.test = function (details) {
  return this.testMethod(details.method) && this.testURL(details.url);
};
Rule.prototype.dump = function () {
  return this.rule;
};

function str2RE(str) {
  return RegExp('^' + str.replace(/([.?\/])/g, '\\$1').replace(/\*/g, '.*?') + '$');
}

function matchFactory(str) {
  function matchScheme(rule, data) {
    // exact match
    if (rule == data) return 1;
    // * = http | https
    if (rule == '*' && /^https?$/i.test(data)) return 1;
    return 0;
  }
  function matchHost(rule, data) {
    // * matches all
    if (rule == '*') return 1;
    // exact match
    if (rule == data) return 1;
    // *.example.com
    if (/^\*\.[^*]*$/.test(rule)) {
      // matches the specified domain
      if (rule.slice(2) == data) return 1;
      // matches subdomains
      if (str2RE(rule).test(data)) return 1;
    }
    return 0;
  }
  function matchPath(rule, data) {
    return str2RE(rule).test(data);
  }
  const RE = /(.*?):\/\/([^\/]*)\/(.*)/;
  if (str === '<all_urls>') return () => true;
  const ruleParts = str.match(RE);
  return url => {
    var parts = url.match(RE);
    return !!parts
      && matchScheme(ruleParts[1], parts[1])
      && matchHost(ruleParts[2], parts[2])
      && matchPath(ruleParts[3], parts[3]);
  };
}

chrome.webRequest.onBeforeRequest.addListener(details => {
  if (List.test(details)) {
    console.log(`blocked: ${details.method} ${details.url}`);
    return {cancel: true};
  }
}, {
  urls: ['<all_urls>']
}, ['blocking']);

const commands = {
  GetLists: (data, src) => {
    return List.meta();
  },
  GetList: (id, src) => {
    return List.find(id).json();
  },
  RemoveList: (id, src) => {
    return List.remove(id);
  },
  UpdateList: (data, src) => {
    return (data.id ? List.find(data.id).update(data) : List.create(data))
    .then(list => list.json());
  },
};
chrome.runtime.onMessage.addListener((req, src, callback) => {
  const func = commands[req.cmd];
  if (!func) return;
  const res = func(req.data, src);
  if (res === false) return;
  const finish = function (data) {
    try {
      callback(data);
    } catch (e) {
      // callback fails if not given in content page
    }
  };
  Promise.resolve(res)
  .then(data => finish({
    data: data,
    error: null,
  }), data => finish({
    error: data,
  }));
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

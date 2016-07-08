var rules, compiledRules;
try {
  rules = JSON.parse(localStorage.getItem('rules') || '');
} catch (e) {
  rules = [];
}
loadRules();

function loadRules() {
  compiledRules = rules.map(rule => new Rule(rule));
}
function dumpRules(data) {
  localStorage.setItem('rules', JSON.stringify(data));
  rules = data;
  loadRules();
}

function Rule(rule) {
  this.rule = rule;
  this.method = rule.method;
  if (this.method === '*') this.method = null;
  this.testURL = matchFactory(rule.url);
}
Rule.prototype.testMethod = function (method) {
  return !this.method || this.method === method;
};
Rule.prototype.test = function (details) {
  return this.testMethod(details.method) && this.testURL(details.url);
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
  if (compiledRules.some(rule => rule.test(details))) {
    console.log(`blocked: ${details.method} ${details.url}`);
    return {cancel: true};
  }
}, {
  urls: ['<all_urls>']
}, ['blocking']);

const commands = {
  GetRules: (data, src) => {
    return rules;
  },
  SetRules: (data, src) => {
    dumpRules(data);
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

const NEVER_MATCH = /^:NEVER_MATCH/;

function str2re(str) {
  return str.replace(/([.?/])/g, '\\$1').replace(/\*/g, '.*?');
}

function tester(rule) {
  if (rule === '<all_urls>') {
    return /.*/;
  }
  if (rule.startsWith('/') && rule.endsWith('/')) {
    try {
      return new RegExp(rule.slice(1, -1));
    } catch {
      return NEVER_MATCH;
    }
  }
  const RE = /^([^:]+):\/\/([^/]*)(\/.*)$/;
  let [, scheme, host, path] = rule.match(RE) || {};
  if (!scheme) return NEVER_MATCH;
  if (scheme === '*') scheme = '[^:]+';
  if (host === '*') host = '[^/]+';
  else if (host.startsWith('*.')) host = `(?:[^/]*?\\.)?${str2re(host.slice(2))}`;
  else host = str2re(host);
  path = str2re(path);
  return new RegExp(`^${scheme}:\\/\\/${host}${path}$`);
}

export class Rule {
  constructor(rule) {
    this.data = rule;
  }

  testMethod(method) {
    return ['*', method].includes(this.data.method);
  }

  check(details) {
    if (!this.testMethod(details.method)) return;
    const matches = details.url.match(tester(this.data.url));
    if (!matches) return;
    let { target } = this.data;
    if (!target) return { cancel: true };
    matches.method = details.method;
    target = target.replace(/\\(.)|\$(\w+)|\$\{([^}]+)\}/g, (m, g1, g2, g3) => {
      if (g1) return g1;
      return matches[g2 || g3] || '';
    });
    return { redirectUrl: target };
  }

  dump() {
    return {
      method: '*',
      url: '*://*/*',
      target: '',
      ...this.data,
    };
  }
}

const NEVER_MATCH = /^:NEVER_MATCH/;

/**
 * @param {string} str
 */
function str2re(str) {
  return str.replace(/([.?/])/g, '\\$1').replace(/\*/g, '.*?');
}

/**
 * @param {string} rule
 */
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

/**
 * @typedef {object} RuleData
 * @property {string} method
 * @property {string} url
 * @property {string} target
 * @property {[string, string][]} headers
 */

export class Rule {
  constructor(rule) {
    /**
     * @type RuleData
     */
    this.data = rule;
  }

  /**
   * @param {string} method
   */
  testMethod(method) {
    return ['*', method].includes(this.data.method);
  }

  match(details, callback) {
    if (!this.testMethod(details.method)) return;
    const matches = details.url.match(tester(this.data.url));
    if (!matches) return;
    matches.method = details.method;
    return callback(matches);
  }

  fill(pattern, matches) {
    return pattern.replace(/\\(.)|\$(\w+)|\$\{([^}]+)\}/g, (_, g1, g2, g3) => {
      if (g1) return g1;
      return matches[g2 || g3] || '';
    });
  }

  beforeRequest(details) {
    return this.match(details, matches => {
      let { target } = this.data;
      if (target === '=') return;
      if (!target || target === '-') return { cancel: true };
      target = this.fill(target, matches);
      return { redirectUrl: target };
    });
  }

  beforeSendHeaders(details) {
    return this.match(details, matches => {
      const { headers } = this.data;
      if (!headers) return;
      const toUpdate = [];
      const toRemove = {};
      headers.forEach(([key, value]) => {
        key = this.fill(key, matches).toLowerCase();
        value = this.fill(value, matches);
        if (key.startsWith('-')) {
          key = key.slice(1);
        } else {
          toUpdate.push({ name: key, value });
        }
        toRemove[key] = 1;
      });
      const requestHeaders = [...details.requestHeaders]
        .filter(item => !toRemove[item.name.toLowerCase()])
        .concat(toUpdate);
      return {
        requestHeaders,
      };
    });
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

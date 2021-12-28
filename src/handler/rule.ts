import { RuleData, RequestDetails, RuleMatchResult } from '#/types';

const NEVER_MATCH = /^:NEVER_MATCH/;
const PREFIX_REMOVE = '!';

function str2re(str: string) {
  return str.replace(/([.?/])/g, '\\$1').replace(/\*/g, '.*?');
}

function tester(rule: string) {
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
  let [, scheme, host, path] = rule.match(RE) || [];
  if (!scheme) return NEVER_MATCH;
  if (scheme === '*') scheme = '[^:]+';
  if (host === '*') host = '[^/]+';
  else if (host.startsWith('*.'))
    host = `(?:[^/]*?\\.)?${str2re(host.slice(2))}`;
  else host = str2re(host);
  path = str2re(path);
  return new RegExp(`^${scheme}:\\/\\/${host}${path}$`);
}

function fill(pattern: string, matches: string[]) {
  return pattern.replace(/\\(.)|\$(\w+)|\$\{([^}]+)\}/g, (_, g1, g2, g3) => {
    if (g1) return g1;
    return matches[g2 || g3] || '';
  });
}

export class Rule {
  constructor(private data: RuleData) {}

  testMethod(method: string) {
    return ['*', method].includes(this.data.method);
  }

  match(
    details: RequestDetails,
    callback: (matches: RegExpMatchArray) => void | RuleMatchResult
  ) {
    if (!this.testMethod(details.method)) return;
    const matches = details.url.match(tester(this.data.url));
    if (!matches) return;
    (matches as any).method = details.method;
    return callback(matches);
  }

  onBeforeRequest(details: RequestDetails) {
    return this.match(details, (matches) => {
      let { target } = this.data;
      if (target === '=') return null;
      if (!target || target === '-') return { cancel: true };
      target = fill(target, matches);
      return { redirectUrl: target };
    });
  }

  onBeforeSendHeaders(details: RequestDetails) {
    return this.match(details, (matches) => {
      const { requestHeaders } = this.data;
      if (!requestHeaders) return;
      const added = [];
      const toRemove = {};
      requestHeaders.forEach(({ name, value }) => {
        name = fill(name, matches).toLowerCase();
        value = fill(value, matches);
        if (name.startsWith(PREFIX_REMOVE)) {
          name = name.slice(PREFIX_REMOVE.length).trim();
        } else {
          added.push({ name, value });
        }
        toRemove[name] = 1;
      });
      const removed = [];
      const headers = [...details.requestHeaders]
        .filter((item) => {
          if (toRemove[item.name.toLowerCase()]) {
            removed.push(item);
            return false;
          }
          return true;
        })
        .concat(added);
      if (added.length || removed.length)
        return {
          requestHeaders: headers,
          payload: {
            requestHeaders: { removed, added },
          },
        };
    });
  }

  onHeadersReceived(details: RequestDetails) {
    return this.match(details, (matches) => {
      const { responseHeaders } = this.data;
      if (!responseHeaders) return;
      const added = [];
      const toRemove = {};
      responseHeaders.forEach(({ name, value }) => {
        name = fill(name, matches).toLowerCase();
        value = fill(value, matches);
        if (name.startsWith(PREFIX_REMOVE)) {
          name = name.slice(PREFIX_REMOVE.length).trim();
        } else {
          added.push({ name, value });
        }
        toRemove[name] = 1;
      });
      const removed = [];
      const headers = [...details.responseHeaders]
        .filter((item) => {
          if (toRemove[item.name.toLowerCase()]) {
            removed.push(item);
            return false;
          }
          return true;
        })
        .concat(added);
      if (added.length || removed.length)
        return {
          responseHeaders: headers,
          payload: {
            responseHeaders: { removed, added },
          },
        };
    });
  }

  dump(): RuleData {
    return {
      method: '*',
      url: '*://*/*',
      target: '',
      ...this.data,
    };
  }
}

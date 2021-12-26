import browser from '#/common/browser';
import { RuleData, RequestDetails } from '#/types';

const NEVER_MATCH = /^:NEVER_MATCH/;

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
    callback: (
      matches: RegExpMatchArray
    ) => void | browser.WebRequest.BlockingResponse
  ) {
    if (!this.testMethod(details.method)) return;
    const matches = details.url.match(tester(this.data.url));
    if (!matches) return;
    (matches as any).method = details.method;
    return callback(matches);
  }

  beforeRequest(details: RequestDetails) {
    return this.match(details, (matches) => {
      let { target } = this.data;
      if (target === '=') return null;
      if (!target || target === '-') return { cancel: true };
      target = fill(target, matches);
      return { redirectUrl: target };
    });
  }

  beforeSendHeaders(details: RequestDetails) {
    return this.match(details, (matches) => {
      const { headers } = this.data;
      if (!headers) return;
      const toUpdate = [];
      const toRemove = {};
      headers.forEach(([key, value]) => {
        key = fill(key, matches).toLowerCase();
        value = fill(value, matches);
        if (key.startsWith('-')) {
          key = key.slice(1);
        } else {
          toUpdate.push({ name: key, value });
        }
        toRemove[key] = 1;
      });
      const requestHeaders = [...details.requestHeaders]
        .filter((item) => !toRemove[item.name.toLowerCase()])
        .concat(toUpdate);
      return {
        requestHeaders,
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

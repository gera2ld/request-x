import {
  CookieData,
  CookieDetails,
  CookieMatchResult,
  RequestData,
  RequestDetails,
  RequestMatchResult,
} from '#/types';
import { pick } from 'lodash-es';
import { getUrl } from './util';

const NEVER_MATCH = /^:NEVER_MATCH/;
const MATCH_ALL = /.*/;
const PREFIX_REMOVE = '!';
const RE_MATCH_PATTERN = /^([^:]+):\/\/([^/]*)(\/.*)$/;

function str2re(str: string) {
  return str.replace(/([.?/])/g, '\\$1').replace(/\*/g, '.*?');
}

function loadRegExp(rule: string) {
  if (rule.startsWith('/') && rule.endsWith('/')) {
    try {
      return new RegExp(rule.slice(1, -1));
    } catch {
      return NEVER_MATCH;
    }
  }
}

function urlTester(rule: string) {
  if (rule === '<all_urls>') return MATCH_ALL;
  const re = loadRegExp(rule);
  if (re) return re;
  let [, scheme, host, path] = rule.match(RE_MATCH_PATTERN) || [];
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

function textTester(rule: string) {
  if (!rule) return MATCH_ALL;
  const re = loadRegExp(rule);
  if (re) return re;
  return new RegExp(`^${str2re(rule)}$`);
}

export abstract class BaseRule<T> {
  constructor(protected data: T) {}

  abstract dump(): T;
}

export class RequestRule extends BaseRule<RequestData> {
  testMethod(method: string) {
    return ['*', method].includes(this.data.method);
  }

  matchCallback(
    details: RequestDetails,
    callback: (matches: RegExpMatchArray) => void | RequestMatchResult
  ) {
    if (!this.testMethod(details.method)) return;
    const matches = details.url.match(urlTester(this.data.url));
    if (!matches) return;
    (matches as any).method = details.method;
    return callback(matches);
  }

  onBeforeRequest(details: RequestDetails) {
    return this.matchCallback(details, (matches) => {
      let { target } = this.data;
      if (target === '=') return null;
      if (!target || target === '-') return { cancel: true };
      target = fill(target, matches);
      return { redirectUrl: target };
    });
  }

  onBeforeSendHeaders(details: RequestDetails) {
    return this.matchCallback(details, (matches) => {
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
    return this.matchCallback(details, (matches) => {
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

  dump(): RequestData {
    return {
      method: '*',
      url: '*://*/*',
      target: '=',
      ...this.data,
    };
  }
}

export class CookieRule extends BaseRule<CookieData> {
  matchCallback(
    details: CookieDetails,
    callback: (matches: RegExpMatchArray) => void | CookieMatchResult
  ) {
    if (details.cause !== 'explicit') return;
    const { cookie } = details;
    const url = getUrl(cookie);
    const matches = url.match(urlTester(this.data.url));
    if (!matches) return;
    if (this.data.name && !cookie.name.match(textTester(this.data.name)))
      return;
    return callback(matches);
  }

  onCookieChange(details: CookieDetails): void | CookieMatchResult {
    return this.matchCallback(details, () => {
      const update: CookieMatchResult = pick(this.data, [
        'sameSite',
        'httpOnly',
        'secure',
      ]);
      const { ttl } = this.data;
      if (details.removed && !(ttl > 0)) {
        // If cookie is removed and no positive ttl, ignore since change will not persist
        return;
      }
      if (ttl != null) {
        // If ttl is 0, set to undefined to mark the cookie as a session cookie
        update.expirationDate = ttl
          ? Math.floor(Date.now() / 1000 + ttl)
          : undefined;
      }
      if (update.sameSite === 'no_restriction') update.secure = true;
      return update;
    });
  }

  dump(): CookieData {
    return {
      url: '*://*/*',
      ...this.data,
    };
  }
}

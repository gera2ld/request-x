import type {
  CookieData,
  HttpHeaderItem,
  ListData,
  RequestData,
} from '@/types';
import { map } from 'lodash-es';

export function getName(list: Partial<ListData>) {
  return list.name || 'No name';
}

export function normalizeRequestRule(rule: any): RequestData[] {
  const result: RequestData[] = [];
  if (!rule.type) {
    // old data
    const common: RequestData = {
      enabled: true,
      type: 'block',
      methods: [],
      url: rule.url,
      target: '',
    };
    const { target, method } = rule;
    if (method && method !== '*') common.methods = [method.toLowerCase()];
    if (target !== '=') {
      const normalized = { ...common };
      if (!target || target === '-') {
        // noop
      } else if (target[0] === '<') {
        normalized.type = 'replace';
        const i = target.indexOf('\n');
        normalized.contentType = target.slice(1, i);
        normalized.target = target.slice(i + 1);
      } else {
        normalized.type = 'redirect';
        normalized.target = target.replace(/\$(\d)/g, '\\$1');
      }
      result.push(normalized);
    }
    const requestHeaders = map<HttpHeaderItem>(rule.requestHeaders);
    const responseHeaders = map<HttpHeaderItem>(rule.responseHeaders);
    if (requestHeaders.length || responseHeaders.length) {
      result.push({
        ...common,
        type: 'headers',
        requestHeaders,
        responseHeaders,
      });
    }
  } else {
    result.push({
      enabled: !!(rule.enabled ?? true),
      type: rule.type || 'block',
      url: rule.url || '',
      target: rule.target || '',
      contentType: rule.contentType,
      methods: map(rule, 'methods').filter(Boolean),
      requestHeaders: map(rule, 'requestHeaders').filter(Boolean),
      responseHeaders: map(rule, 'responseHeaders').filter(Boolean),
    });
  }
  return result;
}

export function normalizeCookieRule(rule: any): CookieData {
  return {
    enabled: true,
    name: rule.name || '',
    url: rule.url || '',
    sameSite: rule.sameSite,
    httpOnly: rule.httpOnly,
    secure: rule.secure,
    ttl: rule.ttl,
  };
}

export async function fetchListData(url: string) {
  const res = await fetch(url, { credentials: 'include' });
  const data = await res.json();
  if (!res.ok) throw { status: res.status, data };
  return {
    type: data.type ?? 'request',
    name: data.name || '',
    rules: data.rules,
    lastUpdated: Date.now(),
  } as Partial<ListData>;
}

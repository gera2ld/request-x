import type { CookieData, KeyValueItem, ListData, RequestData } from '@/types';

export function getName(list: Partial<ListData>) {
  return list.name || 'No name';
}

export function normalizeRequestRule(rule: any): RequestData[] {
  const result: RequestData[] = [];
  const requestHeaders = Array.from<KeyValueItem>(
    Array.isArray(rule.requestHeaders) ? rule.requestHeaders : [],
  ).filter(Boolean);
  const responseHeaders = Array.from<KeyValueItem>(
    Array.isArray(rule.responseHeaders) ? rule.responseHeaders : [],
  ).filter(Boolean);
  if (!rule.type) {
    // old data
    const common: RequestData = {
      enabled: true,
      type: 'block',
      methods: [],
      url: rule.url,
      target: '',
      comment: '',
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
      comment: rule.comment || '',
      contentType: rule.contentType,
      methods: Array.from<string>(
        Array.isArray(rule.methods) ? rule.methods : [],
      ).filter(Boolean),
      requestHeaders,
      responseHeaders,
      transform: rule.transform,
    });
  }
  return result;
}

export function normalizeCookieRule(rule: any): CookieData {
  return {
    enabled: true,
    name: rule.name || '',
    url: rule.url || '',
    comment: rule.comment || '',
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

export async function sendMessage<T = void>(cmd: string, payload?: any) {
  const res = (await chrome.runtime.sendMessage({ cmd, payload })) as {
    data: T;
    error?: string;
  };
  if (import.meta.env.DEV) console.log('message', { cmd, payload }, res);
  if (res.error) throw new Error(res.error);
  return res.data;
}

export function handleMessages(
  handlers: Record<string, (payload: any) => any>,
) {
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    const cmd = message?.cmd;
    const handle = handlers[cmd];
    if (!handle) return;
    if (import.meta.env.DEV) console.log('message', message);
    const result = handle(message.payload) ?? null;
    Promise.resolve(result).then(
      (data) => sendResponse({ data }),
      (error) => sendResponse({ error: `${error || 'Unknown error'}` }),
    );
    return true;
  });
}

export function reorderList<T = any>(
  array: T[],
  selection: number[],
  target: number,
  downward: boolean,
) {
  if (!selection.length || target < 0 || target >= array.length) return;
  const selectedItems = selection.map((i) => array[i]);
  const clone: Array<T | undefined> = [...array];
  selection.forEach((i) => {
    clone[i] = undefined;
  });
  clone.splice(target + +downward, 0, ...selectedItems);
  return clone.filter((item) => item != null) as T[];
}

const noop = () => {};

export function defer<T>() {
  let resolve: (value: T) => void = noop;
  let reject: (err: any) => void = noop;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { resolve, reject, promise };
}

export function b64encode(bytes: Uint8Array) {
  const binString = Array.from(bytes, (x) => String.fromCodePoint(x)).join('');
  return btoa(binString);
}

export function b64encodeText(text: string) {
  const bytes = new TextEncoder().encode(text);
  return b64encode(bytes);
}

export function loadRegExp(rule: string) {
  if (rule.startsWith('/') && rule.endsWith('/')) {
    try {
      return new RegExp(rule.slice(1, -1)).source;
    } catch {
      // ignore
    }
  }
}

function str2re(str: string) {
  return str.replace(/([.?/])/g, '\\$1').replace(/\*/g, '.*?');
}

const RE_MATCH_ALL = /.*/;
const RE_MATCH_PATTERN = /^([^:]+):\/\/([^/]*)(\/.*)$/;

export function buildUrlRe(pattern: string) {
  if (pattern === '<all_urls>') return '';
  const re = loadRegExp(pattern);
  if (re) return re;
  let [, scheme, host, path] = pattern.match(RE_MATCH_PATTERN) || [];
  if (!scheme) return '^:NEVER_MATCH';
  if (scheme === '*') scheme = '[^:]+';
  if (host === '*') host = '[^/]+';
  else if (host.startsWith('*.'))
    host = `(?:[^/]*?\\.)?${str2re(host.slice(2))}`;
  else host = str2re(host);
  path = str2re(path);
  return `^${scheme}:\\/\\/${host}${path}$`;
}

export function urlTester(pattern: string) {
  const re = buildUrlRe(pattern);
  return re ? new RegExp(re) : RE_MATCH_ALL;
}

export function textTester(pattern: string) {
  if (pattern.startsWith('/') && pattern.endsWith('/')) {
    return new RegExp(pattern.slice(1, -1));
  }
  return pattern ? new RegExp(`^${str2re(pattern)}$`) : RE_MATCH_ALL;
}

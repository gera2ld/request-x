import browser from '#/common/browser';
import {
  GlobalStorage,
  ConfigStorage,
  LogItem,
  ListData,
  InterceptionData,
  PortMessage,
  RequestMatchResult,
  RequestDetails,
  FeatureToggles,
} from '#/types';
import { debounce, omit, pick } from 'lodash-es';
import { RequestList, lists, loadLists, CookieList, fetchLists } from './list';
import { getActiveTab, getUrl, ObjectStorage } from './util';

const logs: { [key: number]: LogItem } = {};
const global = new ObjectStorage<GlobalStorage>('global', { count: 0 });
const config = new ObjectStorage<ConfigStorage>('config', {
  badge: '',
});
const features: FeatureToggles = {
  responseHeaders: false,
  cookies: false,
};

loadLists();

function pushLog(details: RequestDetails, result?: RequestMatchResult) {
  const { tabId, method, url, requestId } = details;
  let log = logs[tabId];
  if (!log) {
    log = {
      count: {
        page: 0,
        tab: 0,
      },
      requestIds: new Set(),
    };
    logs[tabId] = log;
  }
  const matched = log.requestIds.has(requestId);
  if (result && !matched) {
    // intercept request
    log.count.page += 1;
    log.count.tab += 1;
    global.set((data) => ({
      count: (data.count || 0) + 1,
    }));
    log.requestIds.add(requestId);
    updateBadge(tabId);
  } else if (!result && matched) {
    // request end
    log.requestIds.delete(requestId);
  }
  ports.get(tabId)?.postMessage({
    type: 'interception',
    data: {
      requestId,
      method,
      url,
      result,
    },
  } as PortMessage<InterceptionData>);
}

async function updateBadge(tabId: number) {
  const log = logs[tabId];
  browser.browserAction.setBadgeBackgroundColor({
    color: '#808',
    tabId,
  });
  const configBadge = await config.get('badge');
  let count: number | undefined;
  if (configBadge === 'page') {
    count = log?.count?.page;
  } else if (configBadge === 'tab') {
    count = log?.count?.tab;
  } else if (configBadge === 'total') {
    count = await global.get('count');
  }
  const countStr = `${count || ''}`;
  browser.browserAction.setBadgeText({
    text: countStr,
    tabId,
  });
}

const matchedRequestIds = new Set<string>();

function getRequestHandler(type: string) {
  return (details: RequestDetails) => {
    const result = lists.request.match(details, type);
    if (result) {
      matchedRequestIds.add(details.requestId);
      console.info(
        `[request] matched: ${details.method} ${details.url}`,
        type,
        result
      );
      pushLog(details, result);
      return omit(result, 'payload');
    }
  };
}

browser.webRequest.onBeforeRequest.addListener(
  getRequestHandler('onBeforeRequest'),
  {
    urls: ['<all_urls>'],
  },
  ['blocking']
);

browser.webRequest.onBeforeSendHeaders.addListener(
  getRequestHandler('onBeforeSendHeaders'),
  {
    urls: ['<all_urls>'],
  },
  ['blocking', 'requestHeaders']
);

try {
  browser.webRequest.onHeadersReceived.addListener(
    getRequestHandler('onHeadersReceived'),
    { urls: ['<all_urls>'] },
    // 'extraHeaders' is required to deceive the CORS protocol
    // but may have a negative impact on performance
    // TODO only include 'extraHeaders' when necessary
    ['blocking', 'responseHeaders', 'extraHeaders']
  );
  features.responseHeaders = true;
} catch {
  // Some browsers may not support `responseHeaders` and `extraHeaders`
  console.info('Disabled modification of response headers.');
}

function handleRequestEnd(details: RequestDetails) {
  pushLog(details);
}

browser.webRequest.onErrorOccurred.addListener(handleRequestEnd, {
  urls: ['<all_urls>'],
});

browser.webRequest.onCompleted.addListener(handleRequestEnd, {
  urls: ['<all_urls>'],
});

browser.tabs.onRemoved.addListener((tabId) => {
  delete logs[tabId];
});
browser.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === 'loading') {
    const count = logs[tabId]?.count;
    if (count) count.page = 0;
    updateBadge(tabId);
  }
});
browser.tabs.onReplaced.addListener((addedTabId, removedTabId) => {
  logs[addedTabId] = logs[removedTabId];
  delete logs[removedTabId];
});

const commands = {
  GetLists: () => {
    return {
      request: lists.request.get(),
      cookie: lists.cookie.get(),
    };
  },
  RemoveList: async ({ type, id }: { type: ListData['type']; id: number }) => {
    await lists[type]?.remove(id);
    browser.runtime.sendMessage({
      cmd: 'RemovedList',
      data: { type, id },
    });
  },
  UpdateList: async (data: Partial<ListData> & { type: ListData['type'] }) => {
    const group = lists[data.type];
    if (!group) return -1;
    let list: RequestList | CookieList;
    if (data.id) {
      list = group.find(data.id);
      await list.update(data);
    } else {
      list = await group.create(data);
    }
    return list.id;
  },
  FetchLists: () => fetchLists(),
  FetchList: ({ type, id }: { type: ListData['type']; id: number }) =>
    lists[type]?.find(id)?.fetch(),
  async GetCount() {
    const tab = await getActiveTab();
    return {
      ...logs[tab.id]?.count,
      global: await global.get('count'),
    };
  },
  async GetData() {
    return {
      config: await config.getAll(),
      features,
    };
  },
  SetConfig<K extends keyof ConfigStorage>({
    key,
    value,
  }: {
    key: K;
    value: ConfigStorage[K];
  }) {
    config.set({
      [key]: value,
    });
  },
  async ResetCount() {
    return global.set({
      count: 0,
    });
  },
};
browser.runtime.onMessage.addListener(async (req, src) => {
  const func = commands[req.cmd];
  if (!func) return;
  return func(req.data, src);
});

browser.alarms.create({
  delayInMinutes: 1,
  periodInMinutes: 120,
});
browser.alarms.onAlarm.addListener(() => {
  console.info(new Date().toISOString(), 'Fetching lists...');
  fetchLists();
});

const ports = new Map<number, browser.Runtime.Port>();

browser.runtime.onConnect.addListener((port) => {
  const tabId = port.name.startsWith('inspect-') && +port.name.slice(8);
  if (tabId) {
    ports.set(tabId, port);
    port.onDisconnect.addListener(() => {
      ports.delete(tabId);
    });
  }
});

let processing = false;
const updates = new Map<string, browser.Cookies.SetDetailsType>();
const updateCookiesLater = debounce(updateCookies, 100);
setUpCookies();

function setUpCookies() {
  if (features.cookies) return;
  try {
    browser.cookies.onChanged.addListener(handleCookieChange);
    features.cookies = true;
  } catch {
    // ignore
  }
}

function handleCookieChange(
  changeInfo: browser.Cookies.OnChangedChangeInfoType
) {
  if (['expired', 'evicted'].includes(changeInfo.cause)) return;
  if (processing) return;
  const result = lists.cookie.match(changeInfo, 'onCookieChange');
  if (result) {
    const { cookie } = changeInfo;
    const hasUpdate = Object.entries(result).some(([key, value]) => {
      return cookie[key] !== value;
    });
    if (!hasUpdate) {
      console.info(`[cookie] no update: ${cookie.name} ${getUrl(cookie)}`);
      return;
    }
    const details = {
      url: undefined,
      ...pick(cookie, [
        'name',
        'domain',
        'path',
        'httpOnly',
        'sameSite',
        'secure',
        'storeId',
        'value',
      ]),
      ...result,
    };
    details.url = getUrl(details);
    // domain is used to construct url, so we reset it here
    if (cookie.hostOnly) details.domain = undefined;
    if (!cookie.session) details.expirationDate = cookie.expirationDate;
    console.info(`[cookie] matched: ${details.name} ${details.url}`, details);
    updates.set(
      [details.storeId, details.url, details.name].join('\n'),
      details
    );
    updateCookiesLater();
  }
}

async function updateCookies() {
  if (processing) return;
  processing = true;
  const items = Array.from(updates.values());
  updates.clear();
  for (const item of items) {
    console.info(`[cookie] set: ${item.name} ${item.url}`, item);
    try {
      await browser.cookies.set(item);
    } catch (err) {
      console.error(err);
    }
  }
  processing = false;
}

import browser from '#/common/browser';
import {
  GlobalStorage,
  ConfigStorage,
  LogItem,
  ListData,
  InterceptionData,
  PortMessage,
  RuleMatchResult,
  RequestDetails,
} from '#/types';
import { omit } from 'lodash-es';
import { List } from './list';
import { getActiveTab, ObjectStorage } from './util';

const logs: { [key: number]: LogItem } = {};
const global = new ObjectStorage<GlobalStorage>('global', { count: 0 });
const config = new ObjectStorage<ConfigStorage>('config', {
  badge: '',
});

function pushLog(details: RequestDetails, result?: RuleMatchResult) {
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
    const result = List.match(details, type);
    if (result) {
      matchedRequestIds.add(details.requestId);
      console.info(`matched: ${details.method} ${details.url}`, type, result);
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

browser.webRequest.onHeadersReceived.addListener(
  getRequestHandler('onHeadersReceived'),
  { urls: ['<all_urls>'] },
  // 'extraHeaders' is required to deceive the CORS protocol
  // but may have a negative impact on performance
  // TODO only include 'extraHeaders' when necessary
  ['blocking', 'responseHeaders', 'extraHeaders']
);

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
    const result = List.get();
    return result;
  },
  GetList: (id: number) => List.find(id).get(),
  RemoveList: (id: number) => List.remove(id),
  UpdateList: async (data: Partial<ListData>) => {
    let list: List;
    if (data.id) {
      list = List.find(data.id);
      await list.update(data);
    } else {
      list = await List.create(data);
    }
    return list.id;
  },
  FetchLists: () => List.fetch(),
  FetchList: (id: number) => List.find(id).fetch(),
  async GetCount() {
    const tab = await getActiveTab();
    return {
      ...logs[tab.id]?.count,
      global: await global.get('count'),
    };
  },
  async GetConfig() {
    return config.getAll();
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

List.load();

browser.alarms.create({
  delayInMinutes: 1,
  periodInMinutes: 120,
});
browser.alarms.onAlarm.addListener(() => {
  console.info(new Date().toISOString(), 'Fetching lists...');
  List.fetch();
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

import browser from '#/common/browser';
import { GlobalStorage, ConfigStorage, LogItem, ListData } from '#/types';
import { List } from './list';
import { getActiveTab, ObjectStorage } from './util';

const logs: { [key: number]: LogItem } = {};
const MAX_RECORD_NUM = 200;
const global = new ObjectStorage<GlobalStorage>('global', { count: 0 });
const config = new ObjectStorage<ConfigStorage>('config', {
  badge: '',
});

function pushLog(
  details: { tabId: number; url: string },
  result: browser.WebRequest.BlockingResponse
) {
  const { tabId, url } = details;
  let log = logs[tabId];
  if (!log) {
    log = {
      count: {
        page: 0,
        tab: 0,
      },
      records: [],
    };
    logs[tabId] = log;
  }
  log.count.page += 1;
  log.count.tab += 1;
  global.set((data) => ({
    count: (data.count || 0) + 1,
  }));
  log.records.push({
    url,
    result,
  });
  while (log.records.length > MAX_RECORD_NUM) {
    log.records.shift(); // shift is faster than splice
  }
  updateBadge(tabId);
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

browser.webRequest.onBeforeRequest.addListener(
  (details) => {
    const target = List.match(details, 'beforeRequest');
    if (target) {
      console.info(`matched: ${details.method} ${details.url}`, target);
      pushLog(details, target);
      return target;
    }
  },
  {
    urls: ['<all_urls>'],
  },
  ['blocking']
);

browser.webRequest.onBeforeSendHeaders.addListener(
  (details) => {
    const target = List.match(details, 'beforeSendHeaders');
    if (target) {
      console.info(`matched: ${details.method} ${details.url}`, target);
      return target;
    }
  },
  {
    urls: ['<all_urls>'],
  },
  ['blocking', 'requestHeaders']
);

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

import { List } from './list';
import { getExactData, dumpExactData, getActiveTab } from './util';

const logs = {};
const MAX_RECORD_NUM = 200;
let globalData;
initialize();

async function initialize() {
  globalData = await getExactData('global') || {};
}

function pushLog(details, result) {
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
  if (globalData) {
    globalData.count = (globalData.count || 0) + 1;
    dumpExactData('global', globalData);
  }
  log.records.push({
    url,
    result,
  });
  while (log.records.length > MAX_RECORD_NUM) {
    log.records.shift(); // shift is faster than splice
  }
  updateBadge(tabId);
}

function updateBadge(tabId) {
  const log = logs[tabId];
  browser.browserAction.setBadgeBackgroundColor({
    color: '#808',
    tabId,
  });
  let count = (log?.count?.cancel || 0) + (log?.count?.redirect || 0);
  if (count > 99) count = '99+';
  else count = `${count || ''}`;
  browser.browserAction.setBadgeText({
    text: count,
    tabId,
  });
}

browser.webRequest.onBeforeRequest.addListener((details) => {
  const target = List.match(details);
  if (target) {
    console.info(`matched: ${details.method} ${details.url}`, target);
    pushLog(details, target);
    return target;
  }
}, {
  urls: ['<all_urls>'],
}, ['blocking']);

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
  GetLists: () => List.get(),
  GetList: id => List.find(id).get(),
  RemoveList: id => List.remove(id),
  UpdateList: data => (data.id ? List.find(data.id).update(data) : List.create(data)),
  FetchLists: () => List.fetch(),
  FetchList: id => List.find(id).fetch(),
  GetCount: async () => {
    const tab = await getActiveTab();
    return {
      ...logs[tab.id]?.count,
      global: globalData.count,
    };
  },
};
browser.runtime.onMessage.addListener((req, src) => {
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

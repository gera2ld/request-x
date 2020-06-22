import { List } from './list';

const logs = {};

function pushLog(details, result) {
  const { tabId, url } = details;
  let log = logs[tabId];
  if (!log) {
    log = {
      cancel: [],
      redirect: [],
    };
    logs[tabId] = log;
  }
  (result.cancel ? log.cancel : log.redirect).push(url);
  updateBadge(tabId);
}

function updateBadge(tabId) {
  const log = logs[tabId];
  browser.browserAction.setBadgeBackgroundColor({
    color: '#808',
    tabId,
  });
  let count = log && (log.cancel.length + log.redirect.length);
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
    delete logs[tabId];
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

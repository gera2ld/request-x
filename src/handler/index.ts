import { handleMessages, sendMessage } from '@/common';
import { reorderList, textTester, urlTester } from '@/common/util';
import { CookieData, CookieMatchResult, ListData } from '@/types';
import { debounce, pick } from 'lodash-es';
import browser from 'webextension-polyfill';
import {
  broadcastUpdates,
  dataLoaded,
  dumpLists,
  fetchList,
  getErrors,
  queryReplaceResponse,
  reloadRules,
  saveLists,
  setReplaceResponse,
} from './list';
import { getUrl } from './util';

let cookieRules: CookieData[] = [];
const actions: Array<{
  name: string;
  payload: any;
}> = [];

browser.cookies.onChanged.addListener(handleCookieChange);
browser.tabs.onCreated.addListener((tab) => {
  if (!tab.id) return;
  const url = getSubsribeUrl(tab.url || tab.pendingUrl);
  if (url) {
    initiateSubscription(url);
    browser.tabs.remove(tab.id);
  }
});
browser.tabs.onUpdated.addListener((tabId, changeInfo) => {
  const url = getSubsribeUrl(changeInfo.url);
  if (url) {
    initiateSubscription(url);
    browser.tabs.goBack(tabId);
  }
});
browser.tabs.onRemoved.addListener((tabId) => {
  setReplaceResponse(tabId, true);
});

// Show Release Notes on update to v3
browser.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'update') {
    const major = details.previousVersion?.split('.')[0];
    if (major && +major < 3) {
      browser.tabs.create({
        url: 'https://github.com/gera2ld/request-x/releases/tag/v3.0.0',
      });
    }
  }
});

const cookieActions = {
  async update() {
    const lists = await dataLoaded;
    cookieRules = lists.cookie
      .filter((list) => list.enabled)
      .flatMap((list) => list.rules.filter((rule) => rule.enabled));
    return lists;
  },
};

handleMessages({
  async GetLists() {
    return dataLoaded;
  },
  async GetErrors() {
    return getErrors();
  },
  async SaveLists(payload: Partial<ListData>[]) {
    const updatedLists = await saveLists(payload);
    broadcastUpdates();
    return updatedLists;
  },
  async UpdateCookieRules() {
    cookieActions.update();
  },
  async MoveLists(payload: {
    type: 'request' | 'cookie';
    selection: number[];
    target: number;
    downward: boolean;
  }) {
    const lists = await dataLoaded;
    const { type, selection, target, downward } = payload;
    const reordered = reorderList(
      lists[type] as ListData[],
      selection,
      target,
      downward,
    );
    if (reordered) {
      lists[type] = reordered as any;
      dumpLists(lists);
    }
  },
  FetchLists: fetchLists,
  async FetchList(payload: { id: number }) {
    const lists = await dataLoaded;
    const list = ([...lists.request, ...lists.cookie] as ListData[]).find(
      (item) => item.id === payload.id,
    );
    await fetchList(list);
    broadcastUpdates();
  },
  async RemoveList(payload: { id: number }) {
    const lists = await dataLoaded;
    Object.values(lists).forEach((group: ListData[]) => {
      const i = group.findIndex(({ id }) => id === payload.id);
      if (i >= 0) group.splice(i, 1);
    });
    dumpLists(lists);
    reloadRules(lists.request);
    broadcastUpdates();
  },
  GetAction() {
    return actions.shift();
  },
  CreateAction(payload: { name: string; payload: any }) {
    createAction(payload);
  },
  SetReplaceResponse(payload: { enabled: boolean }, sender) {
    const tabId = sender.tab?.id;
    if (tabId) {
      setReplaceResponse(tabId, payload.enabled);
    }
  },
  QueryReplaceResponse(payload: { method: string; url: string }) {
    return queryReplaceResponse(payload.method, payload.url);
  },
});

main().catch((err) => {
  console.error(err);
});

let processing = false;
const updates = new Map<string, browser.Cookies.SetDetailsType>();
const updateCookiesLater = debounce(updateCookies, 100);

browser.alarms.create({
  delayInMinutes: 1,
  periodInMinutes: 120,
});
browser.alarms.onAlarm.addListener(() => {
  console.info(new Date().toISOString(), 'Fetching lists...');
  fetchLists();
});

async function main() {
  const lists = await dataLoaded;
  await reloadRules(lists.request);
}

async function fetchLists() {
  const lists = await dataLoaded;
  await Promise.all(
    ([...lists.request, ...lists.cookie] as ListData[])
      .filter((list) => list.subscribeUrl)
      .map(async (list) => {
        await fetchList(list);
        broadcastUpdates();
      }),
  );
}

function handleCookieChange(
  changeInfo: browser.Cookies.OnChangedChangeInfoType,
) {
  // if (['expired', 'evicted'].includes(changeInfo.cause)) return;
  if (changeInfo.cause !== 'explicit') return;
  if (processing) return;
  let update: CookieMatchResult | undefined;
  for (const rule of cookieRules) {
    const url = getUrl(changeInfo.cookie);
    const matches = url.match(urlTester(rule.url));
    if (!matches) continue;
    if (rule.name && !changeInfo.cookie.name.match(textTester(rule.name)))
      continue;
    const { ttl } = rule;
    if (changeInfo.removed && !(ttl && ttl > 0)) {
      // If cookie is removed and no positive ttl, ignore since change will not persist
      continue;
    }
    update = pick(rule, ['sameSite', 'httpOnly', 'secure']);
    if (ttl != null) {
      // If ttl is 0, set to undefined to mark the cookie as a session cookie
      update.expirationDate = ttl
        ? Math.floor(Date.now() / 1000 + ttl)
        : undefined;
    }
    if (update.sameSite === 'no_restriction') update.secure = true;
    break;
  }
  if (update) {
    const { cookie } = changeInfo;
    const hasUpdate = Object.entries(update).some(([key, value]) => {
      return cookie[key as keyof browser.Cookies.Cookie] !== value;
    });
    if (!hasUpdate) {
      console.info(`[cookie] no update: ${cookie.name} ${getUrl(cookie)}`);
      return;
    }
    const details: browser.Cookies.SetDetailsType = {
      url: getUrl(pick(cookie, ['domain', 'path', 'secure'])),
      domain: cookie.hostOnly ? undefined : cookie.domain,
      expirationDate: cookie.session ? undefined : cookie.expirationDate,
      ...pick(cookie, [
        'name',
        'path',
        'httpOnly',
        'sameSite',
        'secure',
        'storeId',
        'value',
      ]),
      ...update,
    };
    console.info(`[cookie] matched: ${details.name} ${details.url}`, details);
    updates.set(
      [details.storeId, details.url, details.name].join('\n'),
      details,
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

function initiateSubscription(url: string) {
  createAction({
    name: 'SubscribeUrl',
    payload: url,
  });
}

async function createAction(action: { name: string; payload: any }) {
  actions.push(action);
  await browser.runtime.openOptionsPage();
  sendMessage('CheckAction');
}

function getSubsribeUrl(url: string | undefined) {
  if (!url) return;
  if (url.endsWith('#:request-x:')) {
    return url.split('#')[0];
  }
}

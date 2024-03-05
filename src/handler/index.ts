import {
  handleMessages,
  reorderList,
  sendMessage,
  textTester,
  urlTester,
} from '@/common/util';
import { CookieData, CookieMatchResult, ListData } from '@/types';
import { debounce, pick } from 'lodash-es';
import {
  broadcastUpdates,
  dataLoaded,
  dumpLists,
  fetchList,
  getErrors,
  reloadRules,
  saveLists,
} from './list';
import { getUrl } from './util';

let cookieRules: CookieData[] = [];
const actions: Array<{
  name: string;
  payload: any;
}> = [];

chrome.cookies.onChanged.addListener(handleCookieChange);
chrome.tabs.onCreated.addListener((tab) => {
  if (!tab.id) return;
  const url = getSubsribeUrl(tab.url || tab.pendingUrl);
  if (url) {
    initiateSubscription(url);
    chrome.tabs.remove(tab.id);
  }
});
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  const url = getSubsribeUrl(changeInfo.url);
  if (url) {
    initiateSubscription(url);
    chrome.tabs.goBack(tabId);
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
  async FetchLists() {
    const lists = await dataLoaded;
    await Promise.all(
      ([...lists.request, ...lists.cookie] as ListData[])
        .filter((list) => list.subscribeUrl)
        .map(async (list) => {
          await fetchList(list);
          broadcastUpdates();
        }),
    );
  },
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
    reloadRules(lists.request);
    broadcastUpdates();
  },
  GetAction() {
    return actions.shift();
  },
  CreateAction(payload: { name: string; payload: any }) {
    createAction(payload);
  },
});

main().catch((err) => {
  console.error(err);
});

let processing = false;
const updates = new Map<string, chrome.cookies.SetDetails>();
const updateCookiesLater = debounce(updateCookies, 100);

async function main() {
  const lists = await dataLoaded;
  await reloadRules(lists.request);
}

function handleCookieChange(changeInfo: chrome.cookies.CookieChangeInfo) {
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
      return cookie[key as keyof chrome.cookies.Cookie] !== value;
    });
    if (!hasUpdate) {
      console.info(`[cookie] no update: ${cookie.name} ${getUrl(cookie)}`);
      return;
    }
    const details: chrome.cookies.SetDetails = {
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
      await chrome.cookies.set(item);
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
  await chrome.runtime.openOptionsPage();
  sendMessage('CheckAction');
}

function getSubsribeUrl(url: string | undefined) {
  if (!url) return;
  if (url.endsWith('#:request-x:')) {
    return url.split('#')[0];
  }
}

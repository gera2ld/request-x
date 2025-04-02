import { handleMessages, sendMessage } from '@/common';
import { reorderList } from '@/common/util';
import { ListData } from '@/types';
import browser from 'webextension-polyfill';
import { dataLoaded, dumpLists } from './data';
import { broadcastUpdates, fetchList, reloadRules, updateLists } from './list';
import { requestActions } from './request';

const actions: Array<{
  name: string;
  payload: any;
}> = [];

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
  requestActions.setReplaceResponse(tabId, true);
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

handleMessages({
  async GetLists() {
    return dataLoaded;
  },
  async GetErrors() {
    return requestActions.getRuleErrors();
  },
  async SaveLists(payload: Partial<ListData>[]) {
    const updatedLists = await updateLists(payload);
    broadcastUpdates();
    return updatedLists;
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
    const removedLists: ListData[] = [];
    Object.values(lists).forEach((group: ListData[]) => {
      const i = group.findIndex(({ id }) => id === payload.id);
      if (i >= 0) removedLists.push(...group.splice(i, 1));
    });
    dumpLists(lists);
    reloadRules({ removed: removedLists });
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
      requestActions.setReplaceResponse(tabId, payload.enabled);
    }
  },
  QueryReplaceResponse(payload: { method: string; url: string }) {
    return requestActions.queryReplaceResponse(payload.method, payload.url);
  },
});

browser.alarms.create({
  delayInMinutes: 1,
  periodInMinutes: 120,
});
browser.alarms.onAlarm.addListener(() => {
  console.info(new Date().toISOString(), 'Fetching lists...');
  fetchLists();
});

main();

function main() {
  requestActions.reload();
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

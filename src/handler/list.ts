import {
  fetchListData,
  normalizeCookieRule,
  normalizeRequestRule,
} from '@/common/list';
import { b64encodeText, sendMessage, loadRegExp } from '@/common/util';
import type {
  ListData,
  ListGroups,
  RequestData,
  RequestListData,
  RuleData,
} from '@/types';
import { flatMap, groupBy, isEqual, map, values } from 'lodash-es';
import { dumpExactData, getExactData } from './util';

const LIST_PREFIX = 'list:';
const KEY_LISTS = 'lists';
const MAX_RULES_PER_LIST = 100;
const resourceTypes = [
  chrome.declarativeNetRequest.ResourceType.CSP_REPORT,
  chrome.declarativeNetRequest.ResourceType.FONT,
  chrome.declarativeNetRequest.ResourceType.IMAGE,
  chrome.declarativeNetRequest.ResourceType.MAIN_FRAME,
  chrome.declarativeNetRequest.ResourceType.MEDIA,
  chrome.declarativeNetRequest.ResourceType.OBJECT,
  chrome.declarativeNetRequest.ResourceType.OTHER,
  chrome.declarativeNetRequest.ResourceType.PING,
  chrome.declarativeNetRequest.ResourceType.SCRIPT,
  chrome.declarativeNetRequest.ResourceType.STYLESHEET,
  chrome.declarativeNetRequest.ResourceType.SUB_FRAME,
  chrome.declarativeNetRequest.ResourceType.WEBSOCKET,
  chrome.declarativeNetRequest.ResourceType.XMLHTTPREQUEST,
];
const requestRuleTypeMap: Record<
  RequestData['type'],
  chrome.declarativeNetRequest.RuleActionType
> = {
  block: chrome.declarativeNetRequest.RuleActionType.BLOCK,
  redirect: chrome.declarativeNetRequest.RuleActionType.REDIRECT,
  replace: chrome.declarativeNetRequest.RuleActionType.REDIRECT,
  headers: chrome.declarativeNetRequest.RuleActionType.MODIFY_HEADERS,
};
let lastId = -1;
const ruleErrors: Record<number, Record<number, string>> = {};

export const dataLoaded = loadData();

export function getKey(id: number) {
  return `${LIST_PREFIX}${id}`;
}

export async function loadList(id: number) {
  return getExactData<ListData>(`${LIST_PREFIX}${id}`);
}

export async function dumpLists(lists: ListGroups) {
  await dumpExactData(
    KEY_LISTS,
    values(lists).flatMap((group: ListData[]) => map(group, 'id')),
  );
}

export async function loadData() {
  let ids = await getExactData<number[]>(KEY_LISTS);
  const lists: ListGroups = { request: [], cookie: [] };
  if (Array.isArray(ids)) {
    const allData = await chrome.storage.local.get(
      map(ids, (id) => `${LIST_PREFIX}${id}`),
    );
    const allLists = map(ids, (id) => allData[`${LIST_PREFIX}${id}`]).filter(
      Boolean,
    ) as ListData[];
    const groups = groupBy(allLists, 'type');
    Object.assign(lists, groups);
  } else {
    const allData = await chrome.storage.local.get();
    const allLists = Object.keys(allData)
      .filter((key) => key.startsWith(LIST_PREFIX))
      .map((key) => allData[key]) as ListData[];
    const groups = groupBy(allLists, 'type');
    Object.assign(lists, groups);
  }
  if (import.meta.env.DEV) console.log('loadData:raw', lists);
  ids = values(lists).flatMap((group: ListData[]) => map(group, 'id'));
  lastId = Math.max(0, ...ids);
  lists.request.forEach((list) => {
    list.enabled ??= true;
    list.rules = flatMap(list.rules, normalizeRequestRule);
  });
  lists.cookie.forEach((list) => {
    list.enabled ??= true;
    list.rules = flatMap(list.rules, normalizeCookieRule);
  });
  if (import.meta.env.DEV) console.log('loadData', lists);
  return lists;
}

export async function saveList(data: Partial<ListData>) {
  const list: ListData = {
    id: 0,
    name: 'No name',
    subscribeUrl: '',
    lastUpdated: 0,
    enabled: true,
    type: 'request',
    rules: [],
    ...data,
  };
  if (!list.rules) throw new Error('Invalid list data');
  list.name ||= 'No name';
  if (!list.id) {
    if (lastId < 0) throw new Error('Data is not loaded yet');
    list.id = ++lastId;
  }
  if (import.meta.env.DEV) console.log('saveList', list);
  await dumpExactData(getKey(list.id), list);
  return list;
}

export async function saveLists(payload: Partial<ListData>[]) {
  const lists = await dataLoaded;
  const updatedLists = await Promise.all(
    payload.map(async (data) => {
      if (data.id) {
        data = {
          ...values(lists)
            .flat()
            .find((list) => list.id === data.id),
          ...data,
        };
      }
      const list = await saveList(data);
      const group = lists[list.type] as ListData[];
      const i = group.findIndex((item) => item.id === list.id);
      if (i < 0) {
        group.push(list);
      } else {
        group[i] = list;
      }
      return list;
    }),
  );
  if (updatedLists.length) {
    dumpLists(lists);
    reloadRules(lists.request);
  }
  return updatedLists;
}

function buildListRules(list: RequestListData, base = MAX_RULES_PER_LIST) {
  const rules: chrome.declarativeNetRequest.Rule[] = list.rules.flatMap(
    (item, i) => {
      const type = requestRuleTypeMap[item.type];
      if (!item.enabled) return [];
      const rule: chrome.declarativeNetRequest.Rule = {
        id: list.id * base + i + 1,
        action: {
          type,
        },
        condition: {
          resourceTypes,
        },
      };
      // Do not support match patterns here as they may exceed the 2KB memory limit after conversion to RegExp
      const re = loadRegExp(item.url);
      if (re) {
        rule.condition.regexFilter = re;
      } else {
        rule.condition.urlFilter = item.url;
      }
      if (item.methods.length) rule.condition.requestMethods = item.methods;
      if (item.type === 'redirect') {
        rule.action.redirect = {
          [re ? 'regexSubstitution' : 'url']: item.target,
        };
      } else if (item.type === 'replace') {
        rule.action.redirect = {
          url: `data:${item.contentType || ''};base64,${b64encodeText(
            item.target,
          )}`,
        };
      } else if (item.type === 'headers') {
        const validKeys = (
          ['requestHeaders', 'responseHeaders'] as const
        ).filter((key) => {
          const headerItems = item[key];
          if (headerItems?.length) {
            rule.action[key] = headerItems.map((headerItem) => {
              let { name, value } = headerItem;
              if (name[0] === '!') {
                name = name.slice(1);
                value = undefined;
              }
              return {
                header: name,
                operation:
                  value == null
                    ? chrome.declarativeNetRequest.HeaderOperation.REMOVE
                    : chrome.declarativeNetRequest.HeaderOperation.SET,
                value,
              };
            });
            return true;
          }
        });
        if (!validKeys.length) return [];
      }
      return rule;
    },
  );
  return rules;
}

export async function reloadRulesForList(
  list: RequestListData,
  allRules: chrome.declarativeNetRequest.Rule[],
) {
  const currentRules = allRules.filter(
    (rule) => Math.floor(rule.id / MAX_RULES_PER_LIST) === list.id,
  );
  const rules = buildListRules(list);
  const updates: Record<
    string,
    {
      old?: chrome.declarativeNetRequest.Rule;
      new?: chrome.declarativeNetRequest.Rule;
    }
  > = {};
  currentRules.forEach((rule) => {
    updates[rule.id] = { old: rule };
  });
  rules.forEach((rule) => {
    const update = updates[rule.id];
    if (update && isEqual(update.old, rule)) delete updates[rule.id];
    else updates[rule.id] = { ...update, new: rule };
  });
  const toRemove = Object.keys(updates)
    .filter((key) => !updates[key].new)
    .map((id) => +id);
  if (toRemove.length) {
    if (import.meta.env.DEV)
      console.log(
        'removeRules',
        toRemove.map((id) => updates[id].old),
      );
    await chrome.declarativeNetRequest.updateSessionRules({
      removeRuleIds: toRemove,
    });
  }
  delete ruleErrors[list.id];
  const errors: Record<number, string> = {};
  for (const update of Object.values(updates)) {
    if (!update.new) continue;
    try {
      if (import.meta.env.DEV) console.log('updateRule', update);
      await chrome.declarativeNetRequest.updateSessionRules({
        addRules: [update.new],
        removeRuleIds: update.old ? [update.old.id] : [],
      });
    } catch (err) {
      console.error(err);
      errors[update.new.id % MAX_RULES_PER_LIST] = `${err}`;
      ruleErrors[list.id] = errors;
    }
  }
}

export async function reloadRules(lists: RequestListData[]) {
  lists = lists.filter((list) => list.enabled);
  const listIds = new Set(lists.map((list) => list.id));
  Object.keys(ruleErrors).forEach((key) => {
    const id = +key;
    if (!listIds.has(id)) delete ruleErrors[id];
  });
  const allRules = await chrome.declarativeNetRequest.getSessionRules();
  const toRemove = allRules.filter(
    (rule) => !listIds.has(Math.floor(rule.id / MAX_RULES_PER_LIST)),
  );
  if (toRemove.length) {
    if (import.meta.env.DEV) console.log('removeRules', toRemove);
    await chrome.declarativeNetRequest.updateSessionRules({
      removeRuleIds: toRemove.map((rule) => rule.id),
    });
  }
  await Promise.all(lists.map((list) => reloadRulesForList(list, allRules)));
  if (import.meta.env.DEV) console.log('reloadRules done', ruleErrors);
}

export function getErrors() {
  return ruleErrors;
}

const cache: Record<number, Promise<void>> = {};

async function doFetchList(list: ListData) {
  const url = list.subscribeUrl;
  if (!url) return;
  const data = await fetchListData(url);
  if (data.type !== list.type) throw new Error('Type mismatch');
  if (!data.rules) throw new Error('Invalid data');
  list.lastUpdated = Date.now();
  list.rules = data.rules.flatMap(
    (list.type === 'cookie' ? normalizeCookieRule : normalizeRequestRule) as (
      data: any,
    ) => RuleData[],
  );
  await saveList(list);
}

export function fetchList(list: ListData | undefined) {
  if (!list?.subscribeUrl) return;
  let promise = cache[list.id];
  if (!promise) {
    promise = doFetchList(list);
    cache[list.id] = promise;
    promise.finally(() => {
      delete cache[list.id];
    });
  }
  return promise;
}

export function broadcastUpdates() {
  sendMessage('UpdateLists');
}

import { sendMessage } from '@/common';
import { URL_TRANSFORM_KEYS } from '@/common/constants';
import {
  fetchListData,
  normalizeCookieRule,
  normalizeRequestRule,
} from '@/common/list';
import { b64encodeText, loadRegExp } from '@/common/util';
import type {
  ListData,
  ListGroups,
  RequestData,
  RequestListData,
  RuleData,
} from '@/types';
import { flatMap, groupBy, isEqual } from 'es-toolkit';
import browser from 'webextension-polyfill';
import { dumpExactData, getExactData } from './util';

const LIST_PREFIX = 'list:';
const KEY_LISTS = 'lists';
const MAX_RULES_PER_LIST = 100;
const resourceTypes: browser.DeclarativeNetRequest.ResourceType[] = [
  'csp_report',
  'font',
  'image',
  'main_frame',
  'media',
  'object',
  'other',
  'ping',
  'script',
  'stylesheet',
  'sub_frame',
  'websocket',
  'xmlhttprequest',
];
const requestRuleTypeMap: Record<
  RequestData['type'],
  browser.DeclarativeNetRequest.RuleActionTypeEnum
> = {
  block: 'block',
  redirect: 'redirect',
  transform: 'redirect',
  replace: 'redirect',
  headers: 'modifyHeaders',
};
let lastId = -1;
const ruleErrors: Record<number, Record<number, string>> = {};
const excludedReplaceTabIds: number[] = [];
let replaceRules: RequestData[] = [];

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
    Object.values(lists).flatMap((group: ListData[]) =>
      group.map((group) => group.id),
    ),
  );
}

export async function loadData() {
  let ids = await getExactData<number[]>(KEY_LISTS);
  const lists: ListGroups = { request: [], cookie: [] };
  if (Array.isArray(ids)) {
    const allData = await browser.storage.local.get(
      ids.map((id) => `${LIST_PREFIX}${id}`),
    );
    const allLists = ids
      .map((id) => allData[`${LIST_PREFIX}${id}`])
      .filter(Boolean) as ListData[];
    const groups = groupBy(allLists, (item) => item.type);
    Object.assign(lists, groups);
  } else {
    const allData = await browser.storage.local.get();
    const allLists = Object.keys(allData)
      .filter((key) => key.startsWith(LIST_PREFIX))
      .map((key) => allData[key]) as ListData[];
    const groups = groupBy(allLists, (item) => item.type);
    Object.assign(lists, groups);
  }
  if (import.meta.env.DEV) console.log('loadData:raw', lists);
  ids = Object.values(lists).flatMap((group: ListData[]) =>
    group.map((item) => item.id),
  );
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
          ...Object.values(lists)
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
  const rules: browser.DeclarativeNetRequest.Rule[] = list.rules.flatMap(
    (item, i) => {
      const type = requestRuleTypeMap[item.type];
      if (!item.enabled) return [];
      const rule: browser.DeclarativeNetRequest.Rule = {
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
      switch (item.type) {
        case 'redirect': {
          rule.action.redirect = {
            [re ? 'regexSubstitution' : 'url']: item.target,
          };
          break;
        }
        case 'transform': {
          rule.action.redirect = {
            transform: buildUrlTransform(item.transform),
          };
          break;
        }
        case 'replace': {
          rule.action.redirect = {
            url: `data:${item.contentType || ''};base64,${b64encodeText(
              item.target,
            )}`,
          };
          rule.condition.excludedTabIds = excludedReplaceTabIds;
          break;
        }
        case 'headers': {
          const validKeys = (
            ['requestHeaders', 'responseHeaders'] as const
          ).filter((key) => {
            const headerItems = item[key];
            const updates: browser.DeclarativeNetRequest.RuleActionRequestHeadersItemType[] =
              [];
            headerItems?.forEach((headerItem) => {
              const { name, value } = headerItem;
              if (name[0] === '#') return;
              if (name[0] === '!') {
                updates.push({
                  header: name.slice(1),
                  operation: 'remove',
                });
              } else {
                updates.push({
                  header: name,
                  operation: 'set',
                  value,
                });
              }
            });
            if (updates.length) {
              rule.action[key] = updates;
              return true;
            }
          });
          if (!validKeys.length) return [];
          break;
        }
      }
      return rule;
    },
  );
  return rules;
}

export async function reloadRulesForList(
  list: RequestListData,
  allRules: browser.DeclarativeNetRequest.Rule[],
) {
  const currentRules = allRules.filter(
    (rule) => Math.floor(rule.id / MAX_RULES_PER_LIST) === list.id,
  );
  const rules = buildListRules(list);
  const updates: Record<
    string,
    {
      old?: browser.DeclarativeNetRequest.Rule;
      new?: browser.DeclarativeNetRequest.Rule;
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
    await browser.declarativeNetRequest.updateSessionRules({
      removeRuleIds: toRemove,
    });
  }
  delete ruleErrors[list.id];
  const errors: Record<number, string> = {};
  for (const update of Object.values(updates)) {
    if (!update.new) continue;
    try {
      if (import.meta.env.DEV) console.log('updateRule', update);
      await browser.declarativeNetRequest.updateSessionRules({
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
  const allRules = await browser.declarativeNetRequest.getSessionRules();
  const toRemove = allRules.filter(
    (rule) => !listIds.has(Math.floor(rule.id / MAX_RULES_PER_LIST)),
  );
  if (toRemove.length) {
    if (import.meta.env.DEV) console.log('removeRules', toRemove);
    await browser.declarativeNetRequest.updateSessionRules({
      removeRuleIds: toRemove.map((rule) => rule.id),
    });
  }
  await Promise.all(lists.map((list) => reloadRulesForList(list, allRules)));
  replaceRules = lists.flatMap((list) =>
    list.rules.filter((rule) => rule.enabled && rule.type === 'replace'),
  );
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

function buildUrlTransform(transform: RequestData['transform']) {
  if (!transform) return;
  const urlTransform: browser.DeclarativeNetRequest.URLTransform = {};
  const query = transform.query;
  if (query) {
    const firstName = query?.[0]?.name;
    if (firstName?.[0] === '?') {
      urlTransform.query = firstName;
    } else if (firstName === '!') {
      urlTransform.query = '';
    } else {
      const toSet: browser.DeclarativeNetRequest.URLTransformQueryTransformAddOrReplaceParamsItemType[] =
        [];
      const toRemove: string[] = [];
      query?.forEach((transformItem) => {
        const { name, value } = transformItem;
        if (name[0] === '#') return;
        if (name[0] === '!') {
          toRemove.push(name.slice(1));
        } else {
          toSet.push({ key: name, value: value || '' });
        }
      });
      if (toSet.length) {
        urlTransform.queryTransform = {
          ...urlTransform,
          addOrReplaceParams: toSet,
        };
      }
      if (toRemove.length) {
        urlTransform.queryTransform = {
          ...urlTransform,
          removeParams: toRemove,
        };
      }
    }
  }
  URL_TRANSFORM_KEYS.forEach((key) => {
    const value = transform[key];
    if (value) urlTransform[key] = value;
  });
  return urlTransform;
}

export async function setReplaceResponse(tabId: number, enabled: boolean) {
  const lists = await dataLoaded;
  const i = excludedReplaceTabIds.indexOf(tabId);
  if (!enabled && i < 0) {
    excludedReplaceTabIds.push(tabId);
  } else if (enabled && i >= 0) {
    excludedReplaceTabIds.splice(i, 1);
  } else {
    return;
  }
  reloadRules(lists.request);
}

export function queryReplaceResponse(method: string, url: string) {
  const rule = replaceRules.find((item) => {
    if (item.methods.length && !item.methods.includes(method)) return false;
    const re = loadRegExp(item.url);
    if (re) {
      if (!new RegExp(re).test(url)) return false;
    } else {
      // TODO: support URL filters
      if (!url.includes(item.url)) return false;
    }
    return true;
  });
  if (rule)
    return {
      contentType: rule.contentType,
      target: rule.target,
    };
}

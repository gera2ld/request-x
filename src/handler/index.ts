import { browser, bindCommands } from '#/common/browser';
import type {
  ConfigStorage,
  ListData,
  InterceptionData,
  SubscriptionData,
  PortMessage,
  RequestMatchResult,
  RequestDetails,
  FeatureToggles,
} from '#/types';
import { debounce, omit, pick } from 'lodash-es';
import {
  RequestList,
  lists,
  loadLists,
  CookieList,
  fetchLists,
  fetchListData,
  getLastErrors,
} from './list';
import { ensureDashboardPorts, getInspectPort } from './port';
import { getUrl, configPromise, hookInstall } from './util';

const features: FeatureToggles = {
  responseHeaders: false,
  cookies: false,
};

loadLists();

function pushLog(details: RequestDetails, result?: RequestMatchResult) {
  const { tabId, method, url, requestId } = details;
  getInspectPort(tabId)?.postMessage({
    type: 'interception',
    data: {
      requestId,
      method,
      url,
      result,
    },
  } as PortMessage<InterceptionData>);
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
  ((handler) => (details) => {
    const { url } = details;
    if (hookInstall.get() && url.includes('#:request-x:')) {
      subscribeUrl(url);
      return { redirectUrl: 'javascript:void 0' };
    }
    return handler(details);
  })(getRequestHandler('onBeforeRequest')),
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

bindCommands({
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
  MoveList: async ({
    type,
    selection,
    target,
    downward,
  }: {
    type: ListData['type'];
    selection: number[];
    target: number;
    downward: boolean;
  }) => {
    const list = lists[type];
    list.move(selection, target, downward);
  },
  UpdateList: async (data: Partial<ListData> & { type: ListData['type'] }) => {
    const group = lists[data.type];
    if (!group) return -1;
    let list: RequestList | CookieList;
    if (data.id) {
      list = group.find(data.id)!;
      await list.update(data);
    } else {
      list = await group.create(data);
    }
    return list.id;
  },
  FetchLists: () => fetchLists(),
  FetchList: ({ type, id }: { type: ListData['type']; id: number }) =>
    lists[type]?.find(id)?.fetch(),
  FetchListData: (url: string) => fetchListData(url),
  async GetData() {
    return {
      config: (await configPromise).getAll(),
      features,
      listErrors: getLastErrors(),
    };
  },
  async SetConfig<K extends keyof ConfigStorage>({
    key,
    value,
  }: {
    key: K;
    value: ConfigStorage[K];
  }) {
    (await configPromise).set({
      [key]: value,
    });
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
      ...result,
    };
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

async function subscribeUrl(url: string) {
  const [jsonUrl] = url.split('#');
  await browser.runtime.openOptionsPage();
  const dashboardPorts = await ensureDashboardPorts();
  dashboardPorts.forEach((port) => {
    port.postMessage({
      type: 'subscription',
      data: {
        url: jsonUrl,
      },
    } as PortMessage<SubscriptionData>);
  });
}

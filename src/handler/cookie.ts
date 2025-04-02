import { textTester, urlTester } from '@/common/util';
import { CookieData, CookieMatchResult } from '@/types';
import { debounce, pick } from 'es-toolkit';
import browser from 'webextension-polyfill';
import { dataLoaded } from './data';
import { getUrl } from './util';

let cookieRules: CookieData[] = [];
let processing = false;
const updates = new Map<string, browser.Cookies.SetDetailsType>();
let dataReady: Promise<void>;

const debouncedReload = debounce(reloadRules, 500);
const updateCookiesLater = debounce(updateCookies, 100);

export const cookieActions = {
  reload: debouncedReload,
};

browser.cookies.onChanged.addListener(handleCookieChange);

async function reloadRules() {
  const lists = await dataLoaded;
  cookieRules = lists.cookie
    .filter((list) => list.enabled)
    .flatMap((list) => list.rules.filter((rule) => rule.enabled));
  console.info(`[cookie] rules reloaded (${cookieRules.length})`);
}

async function handleCookieChange(
  changeInfo: browser.Cookies.OnChangedChangeInfoType,
) {
  // if (['expired', 'evicted'].includes(changeInfo.cause)) return;
  if (changeInfo.cause !== 'explicit') return;
  if (processing) return;
  await (dataReady ||= reloadRules());
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

import type browser from 'webextension-polyfill';
import type { RequestData } from '@/types';
import { URL_TRANSFORM_KEYS } from './constants';

function buildUrlTransform(transform: RequestData['transform']) {
  if (!transform) return;
  const urlTransform: browser.DeclarativeNetRequest.URLTransform = {};
  const query = transform.query;
  if (query) {
    const firstName = query[0]?.name;
    if (firstName?.[0] === '?') {
      urlTransform.query = firstName;
    } else if (firstName === '!') {
      urlTransform.query = '';
    } else {
      const addOrReplaceParams: browser.DeclarativeNetRequest.URLTransformQueryTransformAddOrReplaceParamsItemType[] =
        [];
      const removeParams: string[] = [];
      query.forEach((transformItem) => {
        const { name, value } = transformItem;
        if (name[0] === '#') return;
        if (name[0] === '!') {
          removeParams.push(name.slice(1));
        } else {
          addOrReplaceParams.push({ key: name, value: value || '' });
        }
      });
      if (addOrReplaceParams.length || removeParams.length) {
        const queryTransform: browser.DeclarativeNetRequest.URLTransformQueryTransformType =
          {};
        if (addOrReplaceParams.length) {
          queryTransform.addOrReplaceParams = addOrReplaceParams;
        }
        if (removeParams.length) {
          queryTransform.removeParams = removeParams;
        }
        urlTransform.queryTransform = queryTransform;
      }
    }
  }
  URL_TRANSFORM_KEYS.forEach((key) => {
    const value = transform[key];
    if (value) urlTransform[key] = value;
  });
  return urlTransform;
}

export { buildUrlTransform };

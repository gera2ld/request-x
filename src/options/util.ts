import { reactive } from 'vue';
import { pick } from 'lodash-es';
import { ListData, ConfigStorage } from '#/types';
import browser from '#/common/browser';

export const store = reactive({
  lists: [],
  editList: null,
  route: {},
  config: null,
} as {
  lists: ListData[];
  editList: {
    editing?: boolean;
    isSubscribed?: boolean;
  } & Partial<ListData>;
  route: {
    group: string;
    id: string;
  };
  config: ConfigStorage;
});
window.addEventListener('hashchange', updateRoute);
setRoute('settings/general');

export function updateRoute() {
  const [group, id] = window.location.hash.slice(1).split('/');
  store.route = {
    group,
    id,
  };
}

export function setRoute(value: string) {
  window.location.hash = value;
}

export function isRoute(group: string, id: number | string) {
  const { route } = store;
  return route.group === group && `${route.id}` === `${id}`;
}

export function dump(list: Partial<ListData>) {
  return browser.runtime.sendMessage({
    cmd: 'UpdateList',
    data: list,
  });
}

export function remove(id: number) {
  return browser.runtime.sendMessage({
    cmd: 'RemoveList',
    data: id,
  });
}

export function setStatus(item: ListData, enabled: boolean) {
  item.enabled = enabled;
  dump(pick(item, ['id', 'enabled']));
}

export function isValidMethod(method: string) {
  return method === '*' || /^[A-Z]*$/.test(method);
}

export function isValidPattern(url: string) {
  return (
    (url.startsWith('/') && url.endsWith('/')) ||
    /^[^:/]+:\/\/[^/]+\//.test(url)
  );
}

export function isValidURL(url: string) {
  return /^[\w-]+:\/\/.*?\//.test(url);
}

export function isValidTarget(url: string) {
  return url.includes('$') || isValidURL(url);
}

export function loadFile() {
  return new Promise<Blob>((resolve, reject) => {
    const input = document.createElement('input');
    input.setAttribute('type', 'file');
    input.setAttribute('Accept', 'application/json');
    input.addEventListener(
      'change',
      () => {
        const file = input.files[0];
        if (file) {
          resolve(file);
        } else {
          reject();
        }
      },
      false
    );
    input.click();
  });
}

export function blob2Text(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve(reader.result as string);
    };
    reader.onerror = (err) => {
      reject(err);
    };
    reader.readAsText(blob);
  });
}

export function getName(list: ListData) {
  return list.name || 'No name';
}
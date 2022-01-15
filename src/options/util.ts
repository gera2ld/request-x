import { reactive } from 'vue';
import { pick } from 'lodash-es';
import { ListData, ConfigStorage, FeatureToggles } from '#/types';
import browser from '#/common/browser';

export const store = reactive({
  lists: {},
  editList: null,
  route: [],
  config: null,
  features: null,
} as {
  lists: { [key: string]: ListData[] };
  editList: {
    editing?: boolean;
    isSubscribed?: boolean;
  } & Partial<ListData>;
  route: string[];
  config: ConfigStorage;
  features: FeatureToggles;
});
window.addEventListener('hashchange', updateRoute);
updateRoute();

export function updateRoute() {
  store.route = window.location.hash.slice(1).split('/').filter(Boolean);
}

export function setRoute(value = 'settings/general') {
  window.location.hash = value;
}

export function isRoute(...args: (string | number)[]) {
  const { route } = store;
  for (let i = 0; i < args.length; i += 1) {
    if (route[i] != args[i]) return false;
  }
  return true;
}

export function dump(list: Partial<ListData>) {
  return browser.runtime.sendMessage({
    cmd: 'UpdateList',
    data: list,
  });
}

export function remove(type: string, id: number) {
  return browser.runtime.sendMessage({
    cmd: 'RemoveList',
    data: { id, type },
  });
}

export function setStatus(item: ListData, enabled: boolean) {
  item.enabled = enabled;
  dump(pick(item, ['id', 'type', 'enabled']));
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

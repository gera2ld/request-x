import { pick } from 'lodash-es';
import type { ListData, PortMessage, SubscriptionData } from '@/types';
import { browser, sendCommand } from '@/common/browser';
import { isMacintosh } from '@/common/keyboard';
import { reorderList, getName } from '@/common/util';
import { store } from './store';

window.addEventListener('hashchange', updateRoute);

export function updateRoute() {
  store.route = window.location.hash
    .slice(1)
    .split('/')
    .filter(Boolean)
    .map(decodeURIComponent);
}

export function setRoute(value = '') {
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
  return sendCommand('UpdateList', list);
}

export function remove(type: string, id: number) {
  return sendCommand('RemoveList', { id, type });
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
  return /^[\w-]+:\/\/.*?\/\S*$/.test(url);
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
        const file = input.files?.[0];
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

export async function moveList(
  type: ListData['type'],
  selection: number[],
  target: number,
  downward: boolean
) {
  await sendCommand('MoveList', {
    type,
    selection,
    target,
    downward,
  });
  const reordered = reorderList(store.lists[type], selection, target, downward);
  if (reordered) {
    store.lists[type] = reordered;
  }
}

export function editList(list: typeof store['editList']) {
  store.editList = {
    isSubscribed: !!list?.subscribeUrl,
    ...list,
  };
}

export function getModifiers(e: MouseEvent) {
  return {
    cmdCtrl: isMacintosh ? e.metaKey : e.ctrlKey,
    shift: e.shiftKey,
  };
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.download = filename;
  a.href = url;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url));
}

export function dumpList(item: ListData) {
  return {
    type: item.type,
    name: getName(item),
    subscribeUrl: item.subscribeUrl || undefined,
    enabled: item.enabled,
    rules: item.rules,
  } as Partial<ListData>;
}

export function compareNumberArray(a: number[], b: number[]) {
  for (let i = 0; i < a.length && i < b.length; i += 1) {
    if (a[i] < b[i]) return -1;
    if (a[i] > b[i]) return 1;
  }
  return Math.sign(a.length - b.length);
}

const port = browser.runtime.connect({
  name: 'dashboard',
});
port.onMessage.addListener((message: PortMessage<any>) => {
  if (message.type === 'subscription') {
    const data = message.data as SubscriptionData;
    editList({
      subscribeUrl: data.url,
      isSubscribed: true,
    });
  }
});

export function focusInput(form: HTMLFormElement | undefined) {
  (
    form?.querySelector('input,select') as
      | HTMLInputElement
      | HTMLSelectElement
      | null
  )?.focus();
}

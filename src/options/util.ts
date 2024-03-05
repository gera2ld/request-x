import { isMacintosh } from '@/common/keyboard';
import { getName } from '@/common/list';
import type { ListData } from '@/types';
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

export function isValidPattern(url: string) {
  return (
    (url.startsWith('/') && url.endsWith('/')) ||
    /^[^:/]+:\/\/[^/]+\//.test(url)
  );
}

export function isValidURL(url: string) {
  return /^[\w-]+:\/\/.*?\/\S*$/.test(url);
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
      false,
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

export function editList(list: (typeof store)['editList']) {
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

export function focusInput(form: HTMLFormElement | undefined) {
  (
    form?.querySelector('input,select') as
      | HTMLInputElement
      | HTMLSelectElement
      | null
  )?.focus();
}

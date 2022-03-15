import type { ListData } from '../types';

export function reorderList<T = any>(
  array: T[],
  selection: number[],
  target: number,
  downward: boolean
) {
  if (!selection.length || target < 0 || target >= array.length) return;
  const selectedItems = selection.map((i) => array[i]);
  const clone: Array<T | undefined> = [...array];
  selection.forEach((i) => {
    clone[i] = undefined;
  });
  clone.splice(target + +downward, 0, ...selectedItems);
  return clone.filter((item) => item != null) as T[];
}

export function createGetterSetter<T>(initValue: T | undefined = undefined) {
  let value: T | undefined = initValue;
  return {
    get() {
      return value;
    },
    set(v: T) {
      value = v;
    },
  };
}

const noop = () => {};

export function defer<T>() {
  let resolve: (value: T) => void = noop;
  let reject: (err: any) => void = noop;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { resolve, reject, promise };
}

export function getName(list: Partial<ListData>) {
  return list.name || 'No name';
}

export function reorderList<T = any>(
  array: T[],
  selection: number[],
  target: number,
  downward: boolean
) {
  if (!selection.length || target < 0 || target >= array.length) return;
  const selectedItems = selection.map((i) => array[i]);
  const clone = [...array];
  selection.forEach((i) => {
    clone[i] = undefined;
  });
  clone.splice(target + +downward, 0, ...selectedItems);
  return clone.filter((item) => item != null);
}

export function createGetterSetter<T>(initValue: T = undefined) {
  let value: T = initValue;
  return {
    get() {
      return value;
    },
    set(v: T) {
      value = v;
    },
  };
}

export function defer<T>() {
  let resolve: (value: T) => void;
  let reject: (err: any) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { resolve, reject, promise };
}

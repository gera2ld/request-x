export function reorderList<T = any>(
  array: T[],
  index: number,
  offset: number
) {
  if (
    !offset ||
    index < 0 ||
    index >= array.length ||
    index + offset < 0 ||
    index + offset >= array.length
  )
    return false;
  const items = array.splice(index, 1);
  array.splice(index + offset, 0, ...items);
  return true;
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

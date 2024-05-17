// @ts-ignore
import { EVENT_CONTENT, EVENT_MAIN } from '@/common/constants';

interface RequestXMainEventPayload {
  id: number;
  payload?: any;
}

interface IDeferred<T = any> {
  resolve: (value: T) => void;
  reject: (reason?: any) => void;
  promise: Promise<T>;
}

let gid = 0;
const deferredMap = new Map<number, IDeferred>();
const noop = () => {};

document.addEventListener(EVENT_MAIN, (e) => {
  const { id, payload } = (e as CustomEvent<RequestXMainEventPayload>).detail;
  const deferred = deferredMap.get(id);
  deferred?.resolve(payload);
});

function defer<T>(): IDeferred<T> {
  let resolve_: IDeferred<T>['resolve'] = noop;
  let reject_: IDeferred<T>['reject'] = noop;
  const promise = new Promise<T>((resolve, reject) => {
    resolve_ = resolve;
    reject_ = reject;
  });
  return { promise, resolve: resolve_, reject: reject_ };
}

export function sendMessage<T = any, U = any>(cmd: string, payload: U) {
  gid += 1;
  const id = gid;
  const deferred = defer<T>();
  deferred.promise.finally(() => {
    deferredMap.delete(id);
  });
  setTimeout(deferred.reject, 10000);
  deferredMap.set(id, deferred);
  const event = new CustomEvent(EVENT_CONTENT, {
    detail: {
      id,
      cmd,
      payload,
    },
  });
  document.dispatchEvent(event);
  return deferred.promise;
}

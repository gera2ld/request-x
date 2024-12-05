declare const __INJECT__EVENT_CONTENT: string;
declare const __INJECT__EVENT_MAIN: string;

const EVENT_CONTENT = __INJECT__EVENT_CONTENT;
const EVENT_MAIN = __INJECT__EVENT_MAIN;

interface RequestXMainEventPayload {
  id: number;
  payload?: unknown;
}

interface IDeferred<T = unknown> {
  resolve: (value: T) => void;
  reject: (reason?: unknown) => void;
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

export function sendMessage<T = unknown, U = unknown>(cmd: string, payload: U) {
  gid += 1;
  const id = gid;
  const deferred = defer<T>();
  deferred.promise.finally(() => {
    deferredMap.delete(id);
  });
  setTimeout(deferred.reject, 10000);
  deferredMap.set(id, deferred as IDeferred<unknown>);
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

export const store = {
  lists: [],
  editList: null,
  route: {},
  config: null,
};
window.addEventListener('hashchange', updateRoute);
setRoute('settings/general');

export function updateRoute() {
  const [group, id] = window.location.hash.slice(1).split('/');
  store.route = {
    group,
    id,
  };
}

export function setRoute(value) {
  window.location.hash = value;
}

export function isRoute(group, id) {
  const { route } = store;
  return route.group === group && `${route.id}` === `${id}`;
}

export function dump(list) {
  return browser.runtime.sendMessage({
    cmd: 'UpdateList',
    data: list,
  });
}

export function remove(id) {
  return browser.runtime.sendMessage({
    cmd: 'RemoveList',
    data: id,
  });
}

export function setStatus(item, enabled) {
  item.enabled = enabled;
  dump(pickData(item, ['id', 'enabled']));
}

export function isValidMethod(method) {
  return method === '*' || /^[A-Z]*$/.test(method);
}

export function isValidPattern(url) {
  return url.startsWith('/') && url.endsWith('/') || /^[^:/]+:\/\/[^/]+\//.test(url);
}

export function isValidURL(url) {
  return /^[\w-]+:\/\/.*?\//.test(url);
}

export function isValidTarget(url) {
  return url.includes('$') || isValidURL(url);
}

export function loadFile() {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.setAttribute('type', 'file');
    input.setAttribute('Accept', 'application/json');
    input.addEventListener('change', () => {
      if (input.files && input.files.length) resolve(input.files[0]);
    }, false);
    input.click();
  });
}

export function blob2Text(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve(reader.result);
    };
    reader.onerror = (err) => {
      reject(err);
    };
    reader.readAsText(blob);
  });
}

export function pickData(obj, keys) {
  return keys.reduce((picked, key) => {
    if (obj[key] != null) picked[key] = obj[key];
    return picked;
  }, {});
}

export function debounce(func, time) {
  let startTime;
  let timer;
  let callback;
  let result;
  time = Math.max(0, +time || 0);
  function checkTime() {
    timer = null;
    if (performance.now() >= startTime) {
      callback();
    } else {
      checkTimer();
    }
  }
  function checkTimer() {
    if (!timer) {
      const delta = startTime - performance.now();
      timer = setTimeout(checkTime, delta);
    }
  }
  function debouncedFunction(...args) {
    startTime = performance.now() + time;
    callback = () => {
      callback = null;
      result = func.apply(this, args);
    };
    checkTimer();
    return result;
  }
  return debouncedFunction;
}

export function getName(list) {
  return list.name || list.defaultName || 'No name';
}

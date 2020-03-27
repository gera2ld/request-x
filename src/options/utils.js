export const store = {
  lists: [],
  current: {},
  editList: null,
  route: {},
};
setRoute('settings/interface');

export function setRoute(value) {
  const [group, id] = value.split('/');
  store.route = {
    value,
    group,
    id,
  };
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

export function isValidMethod(method) {
  return method === '*' || /^[A-Z]*$/.test(method);
}

export function isValidURLPattern(url) {
  return /^[^:/]+:\/\/[^/]+\//.test(url);
}

export function isValidURL(url) {
  return /^[\w-]+:\/\/.*?\//.test(url);
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
  let timer;
  let thisObj;
  return function debouncedFunction() {
    thisObj = this;
    update();
  };
  function invoke() {
    timer = null;
    func.call(thisObj);
  }
  function update() {
    if (timer) clearTimeout(timer);
    timer = setTimeout(invoke, time);
  }
}

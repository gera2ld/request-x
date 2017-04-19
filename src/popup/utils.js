export const store = {
  editing: {},
  lists: [],
  current: {},
  currentRules: [],
};

const dataKeys = {
  list: ['title', 'subscribeUrl'],
  rule: ['method', 'url'],
};
export function edit(type, data, extra) {
  (dataKeys[type] || []).forEach(key => {
    data[key] = data[key] || null;
  });
  store.editing = {
    type,
    data,
    extra,
    status: {},
  };
}

export function dump(list) {
  return new Promise(resolve => {
    chrome.runtime.sendMessage({
      cmd: 'UpdateList',
      data: list,
    }, ({ data }) => {
      resolve(data);
    });
  });
}

export function remove(id) {
  return new Promise(resolve => {
    chrome.runtime.sendMessage({
      cmd: 'RemoveList',
      data: id,
    }, ({ data }) => {
      resolve(data);
    });
  });
}

export function isValidMethod(method) {
  return !method || [
    '*',
    'HEAD',
    'GET',
    'POST',
    'PUT',
    'DELETE',
    'PATCH',
  ].indexOf(method.toUpperCase()) >= 0;
}

export function isValidURLPattern(url) {
  return /^[^:/]+:\/\/[^/]+\//.test(url);
}

export function isValidURL(url) {
  return /^[\w-]+:\/\/.*?\//.test(url);
}

export function loadFile(callback) {
  const input = document.createElement('input');
  input.setAttribute('type', 'file');
  input.setAttribute('Accept', 'application/json');
  input.addEventListener('change', () => {
    if (input.files && input.files.length) callback(input.files[0]);
  }, false);
  input.click();
}

export function blob2Text(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve(reader.result);
    };
    reader.onerror = err => {
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

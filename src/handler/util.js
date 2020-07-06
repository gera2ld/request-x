export const getData = browser.storage.local.get;
export const dumpData = browser.storage.local.set;
export const removeData = browser.storage.local.remove;

export async function getExactData(key) {
  const res = await getData(key);
  return res[key];
}

export async function dumpExactData(key, value) {
  await dumpData({
    [key]: value,
  });
}

export async function getActiveTab() {
  const [tab] = await browser.tabs.query({
    active: true,
    lastFocusedWindow: true, // also gets incognito windows
  });
  return tab;
}

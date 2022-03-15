import { browser } from '#/common/browser';
import { defer } from '#/common/util';

export const inspectPorts = new Map<number, browser.Runtime.Port>();
export const dashboardPorts = new Set<browser.Runtime.Port>();

const deferPort = () => defer<browser.Runtime.Port>();
let dashboardDeferred: ReturnType<typeof deferPort> | undefined;

browser.runtime.onConnect.addListener((port) => {
  if (port.name === 'dashboard') {
    dashboardPorts.add(port);
    port.onDisconnect.addListener(() => {
      dashboardPorts.delete(port);
    });
    if (dashboardDeferred) {
      dashboardDeferred.resolve(port);
      dashboardDeferred = undefined;
    }
    return;
  }
  const tabId = port.name.startsWith('inspect-') && +port.name.slice(8);
  if (tabId) {
    inspectPorts.set(tabId, port);
    port.onDisconnect.addListener(() => {
      inspectPorts.delete(tabId);
    });
  }
});

export function getInspectPort(tabId: number) {
  return inspectPorts.get(tabId);
}

export async function ensureDashboardPorts() {
  if (!dashboardPorts.size) {
    if (!dashboardDeferred) {
      dashboardDeferred = defer<browser.Runtime.Port>();
    }
    await dashboardDeferred.promise;
  }
  return dashboardPorts;
}

import { reactive } from 'vue';
import browser from '#/common/browser';
import type { PortMessage, InterceptionData } from '#/types';

export const store = reactive<{
  fields: Array<{ title: string; width: number }>;
  requests: InterceptionData[];
  active: InterceptionData | null;
}>({
  fields: [
    {
      title: 'URL',
      width: 0.7,
    },
    {
      title: 'Actions',
      width: 0.3,
    },
  ],
  requests: [],
  active: null,
});

const requestMap = new Map<string, InterceptionData>();

export function clearRequests() {
  store.requests = [];
  requestMap.clear();
}

const port = browser.runtime.connect({
  name: `inspect-${browser.devtools.inspectedWindow.tabId}`,
});
port.onMessage.addListener((message: PortMessage<any>) => {
  if (message.type === 'interception') {
    const data = message.data as InterceptionData;
    const { requestId, result } = data;
    if (!result) {
      requestMap.delete(requestId);
    } else {
      const oldData = requestMap.get(requestId);
      if (oldData) {
        oldData.result = {
          ...oldData.result,
          ...result,
          payload: {
            ...oldData.result?.payload,
            ...result.payload,
          },
        };
      } else {
        store.requests.push(data);
      }
    }
  }
});

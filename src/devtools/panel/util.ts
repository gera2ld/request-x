import { reactive } from 'vue';
import browser from '#/common/browser';
import { PortMessage, InterceptionData } from '#/types';

export const store = reactive<{
  fields: Array<{ title: string; width: number }>;
  rows: InterceptionData[];
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
  rows: [],
  active: null,
});

const port = browser.runtime.connect({
  name: `inspect-${browser.devtools.inspectedWindow.tabId}`,
});
port.onMessage.addListener((message: PortMessage<any>) => {
  if (message.type === 'interception') {
    const data = message.data as InterceptionData;
    const { update, requestId, result } = data;
    if (update) {
      const oldData = store.rows.find((item) => item.requestId === requestId);
      if (oldData) {
        oldData.result = {
          ...oldData.result,
          ...result,
          payload: {
            ...oldData.result.payload,
            ...result.payload,
          },
        };
      }
    } else {
      store.rows.push(data);
    }
  }
});

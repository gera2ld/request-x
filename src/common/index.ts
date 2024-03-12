import browser from 'webextension-polyfill';

export async function sendMessage<T = void>(cmd: string, payload?: any) {
  const res = (await browser.runtime.sendMessage({ cmd, payload })) as {
    data: T;
    error?: string;
  };
  if (import.meta.env.DEV) console.log('message', { cmd, payload }, res);
  if (res.error) throw new Error(res.error);
  return res.data;
}

export function handleMessages(
  handlers: Record<string, (payload: any) => any>,
) {
  browser.runtime.onMessage.addListener(
    async (message, _sender, _sendResponse) => {
      const cmd = message?.cmd;
      const handle = handlers[cmd];
      if (!handle) return;
      if (import.meta.env.DEV) console.log('message', message);
      try {
        const data = (await handle(message.payload)) ?? null;
        return { data };
      } catch (error) {
        return { error: `${error || 'Unknown error'}` };
      }
    },
  );
}

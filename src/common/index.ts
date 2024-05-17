import browser from 'webextension-polyfill';

export async function sendMessage<T = void>(cmd: string, payload?: any) {
  const res = (await browser.runtime.sendMessage({ cmd, payload })) as {
    data: T;
    error?: string;
  };
  if (import.meta.env.DEV) console.log('sendMessage', { cmd, payload }, res);
  if (res.error) throw new Error(res.error);
  return res.data;
}

type IHandler = (payload: any, sender: browser.Runtime.MessageSender) => any;

export function handleMessages(handlers: Record<string, IHandler>) {
  const handleAsync = async (
    handle: IHandler,
    message: any,
    sender: browser.Runtime.MessageSender,
  ) => {
    if (import.meta.env.DEV) console.log('onMessage', message);
    try {
      const data = (await handle(message.payload, sender)) ?? null;
      return { data: data };
    } catch (error) {
      return { error: `${error || 'Unknown error'}` };
    }
  };
  browser.runtime.onMessage.addListener((message, sender, _sendResponse) => {
    const cmd = message?.cmd;
    const handle = handlers[cmd];
    if (handle) return handleAsync(handle, message, sender);
  });
}

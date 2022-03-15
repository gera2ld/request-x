import browser from 'webextension-polyfill';

export { browser };

export function sendCommand(cmd: string, data?: any) {
  return browser.runtime.sendMessage({ cmd, data });
}

export function bindCommands(commands: {
  [command: string]: (
    data: any,
    src: browser.Runtime.MessageSender
  ) => Promise<any> | any;
}) {
  browser.runtime.onMessage.addListener(
    async (
      req: { cmd: string; data: any },
      src: browser.Runtime.MessageSender
    ) => {
      const func = commands[req.cmd];
      if (!func) return;
      try {
        const result = await func(req.data, src);
        return result;
      } catch (err) {
        console.error(err);
        throw err;
      }
    }
  );
}

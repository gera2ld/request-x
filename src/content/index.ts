import { sendMessage } from '@/common';
import { EVENT_CONTENT, EVENT_MAIN } from '@/common/constants';

interface RequestXContentEventPayload {
  id: number;
  cmd: string;
  payload?: any;
}

document.addEventListener(
  EVENT_CONTENT,
  (e) => {
    handleMessage((e as CustomEvent<RequestXContentEventPayload>).detail);
  },
  false,
);

const handlers: Record<string, (payload?: any) => Promise<any>> = {
  async SetReplaceResponse(payload: { enabled: boolean }) {
    await sendMessage('SetReplaceResponse', payload);
  },
  async QueryReplaceResponse(payload: { method: string; url: string }) {
    return sendMessage('QueryReplaceResponse', payload);
  },
};

// Reset on page reload
handlers.SetReplaceResponse({ enabled: true });

async function handleMessage(detail: RequestXContentEventPayload) {
  const payload = await handlers[detail.cmd]?.(detail?.payload);
  dispatchEvent({ id: detail.id, payload });
}

function dispatchEvent(detail: any) {
  const event = new CustomEvent(EVENT_MAIN, { detail });
  document.dispatchEvent(event);
}

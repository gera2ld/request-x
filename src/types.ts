export interface GlobalStorage {
  count: number;
}

export interface ConfigStorage {
  badge: '' | 'page' | 'tab' | 'total';
}

export interface FeatureToggles {
  responseHeaders?: boolean;
}

export interface LogItem {
  count: {
    page: number;
    tab: number;
  };
  requestIds: Set<string>;
}

export interface ListData {
  id: number;
  name: string;
  title: string;
  subscribeUrl: string;
  lastUpdated: number;
  enabled: boolean;
  rules: RuleData[];
}

export interface HttpHeaderItem {
  name: string;
  value?: string;
}

export interface RuleData {
  method: string;
  url: string;
  target: string;
  requestHeaders?: HttpHeaderItem[];
  responseHeaders?: HttpHeaderItem[];
}

export interface RequestDetails {
  tabId: number;
  method: string;
  url: string;
  requestId: string;
  requestHeaders?: HttpHeaderItem[];
  responseHeaders?: HttpHeaderItem[];
}

export type RuleMatchResult =
  import('webextension-polyfill').WebRequest.BlockingResponse & {
    payload?: {
      requestHeaders?: {
        added?: HttpHeaderItem[];
        removed?: HttpHeaderItem[];
      };
      responseHeaders?: {
        added?: HttpHeaderItem[];
        removed?: HttpHeaderItem[];
      };
    };
  };

export interface InterceptionData {
  requestId: string;
  method: string;
  url: string;
  result?: RuleMatchResult;
}

export interface PortMessage<T> {
  type: string;
  data: T;
}

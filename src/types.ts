export interface GlobalStorage {
  count: number;
}

export interface ConfigStorage {
  badge: '' | 'page' | 'tab' | 'total';
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

export interface RuleData {
  method: string;
  url: string;
  target: string;
  headers: [string, string][];
}

export interface HttpHeaderItem {
  name: string;
  value?: string;
}

export interface RequestDetails {
  method: string;
  url: string;
  requestHeaders?: HttpHeaderItem[];
}

export type RuleMatchResult =
  import('webextension-polyfill').WebRequest.BlockingResponse & {
    payload?: {
      requestHeaders?: {
        added?: HttpHeaderItem[];
        removed?: HttpHeaderItem[];
      };
    };
  };

export interface InterceptionData {
  requestId: string;
  url: string;
  update: boolean;
  result: RuleMatchResult;
}

export interface PortMessage<T> {
  type: string;
  data: T;
}

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
  records: Array<{
    url: string;
    result: import('./common/browser').default.WebRequest.BlockingResponse;
  }>;
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

export interface RequestDetails {
  method: string;
  url: string;
  requestHeaders?: Array<{ name: string; value?: string }>;
}

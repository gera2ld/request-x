export interface GlobalStorage {}

export interface ConfigStorage {
  badge: '' | 'page' | 'tab' | 'total';
}

export interface FeatureToggles {}

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
  subscribeUrl: string;
  lastUpdated: number;
  enabled: boolean;
  type: 'request' | 'cookie';
  rules: (RequestData | CookieData)[];
}

export interface RequestListData extends ListData {
  type: 'request';
  rules: RequestData[];
}

export interface CookieListData extends ListData {
  type: 'cookie';
  rules: CookieData[];
}

export interface HttpHeaderItem {
  name: string;
  value?: string;
}

export interface RuleDataBase {
  enabled: boolean;
}

export interface RequestData extends RuleDataBase {
  methods: chrome.declarativeNetRequest.RequestMethod[];
  type: 'block' | 'redirect' | 'replace' | 'headers';
  url: string;
  target: string;
  contentType?: string;
  requestHeaders?: HttpHeaderItem[];
  responseHeaders?: HttpHeaderItem[];
}

export interface CookieData extends RuleDataBase {
  url: string;
  name: string;
  sameSite?: SameSiteStatus;
  httpOnly?: boolean;
  secure?: boolean;
  /**
   * 0 for session cookie, -1 for removing, otherwise overwrites expiration date.
   */
  ttl?: number;
}

export type RuleData = RequestData | CookieData;

export type SameSiteStatus = 'no_restriction' | 'lax' | 'strict';

export interface CookieMatchResult {
  sameSite?: SameSiteStatus;
  httpOnly?: boolean;
  secure?: boolean;
  expirationDate?: number;
}

export interface ListsDumpData {
  provider: string;
  category: 'lists';
  data: Partial<ListData>[];
}

export interface RulesDumpData {
  provider: string;
  category: 'rules';
  data: Pick<ListData, 'type' | 'rules'>;
}

export interface ListGroups {
  request: RequestListData[];
  cookie: CookieListData[];
}

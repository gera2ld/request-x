export interface FeatureToggles {
  [key: string]: never;
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

export interface KeyValueItem {
  name: string;
  value: string;
}

export interface RuleDataBase {
  enabled: boolean;
  comment?: string;
}

export interface RequestData extends RuleDataBase {
  methods: string[];
  type: 'block' | 'redirect' | 'transform' | 'replace' | 'headers';
  url: string;
  target: string;

  // replace
  contentType?: string;

  // headers
  requestHeaders?: KeyValueItem[];
  responseHeaders?: KeyValueItem[];

  // transform
  transform?: {
    host?: string;
    port?: string;
    username?: string;
    password?: string;
    path?: string;
    query?: KeyValueItem[];
  };
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

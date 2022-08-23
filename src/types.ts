export interface GlobalStorage {}

export interface ConfigStorage {
  badge: '' | 'page' | 'tab' | 'total';
}

export interface FeatureToggles {
  responseHeaders?: boolean;
  cookies?: boolean;
}

export interface LogItem {
  count: {
    page: number;
    tab: number;
  };
  requestIds: Set<string>;
}

export interface ListMeta {
  id: number;
  name: string;
  subscribeUrl: string;
  lastUpdated: number;
  enabled: boolean;
}

export interface RequestListData extends ListMeta {
  type: 'request';
  rules: RequestData[];
}

export interface CookieListData extends ListMeta {
  type: 'cookie';
  rules: CookieData[];
}

export type ListData = RequestListData | CookieListData;
export type RuleData = RequestData | CookieData;

export interface HttpHeaderItem {
  name: string;
  value?: string;
}

export interface RequestData {
  method: string;
  url: string;
  target: string;
  requestHeaders?: HttpHeaderItem[];
  responseHeaders?: HttpHeaderItem[];
}

export interface CookieData {
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

export interface RequestDetails {
  tabId: number;
  method: string;
  url: string;
  requestId: string;
  requestHeaders?: HttpHeaderItem[];
  responseHeaders?: HttpHeaderItem[];
}

export type SameSiteStatus = 'no_restriction' | 'lax' | 'strict';

export interface CookieDetails {
  cause: string;
  cookie: {
    domain: string;
    expirationDate?: number;
    hostOnly: boolean;
    httpOnly: boolean;
    name: string;
    path: string;
    sameSite: SameSiteStatus;
    secure: boolean;
    session: boolean;
    value: string;
  };
  removed: boolean;
}

export type RequestMatchResult =
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

export interface CookieMatchResult {
  sameSite?: SameSiteStatus;
  httpOnly?: boolean;
  secure?: boolean;
  expirationDate?: number;
}

export interface InterceptionData {
  requestId: string;
  method: string;
  url: string;
  result?: RequestMatchResult;
}

export interface SubscriptionData {
  url: string;
}

export interface PortMessage<T> {
  type: string;
  data: T;
}

export interface ListsDumpData {
  provider: string;
  category: 'lists';
  data: Partial<ListData>[];
}

export interface RulesDumpData {
  provider: string;
  category: 'rules';
  data: {
    type: ListData['type'];
    rules: RuleData[];
  };
}

export interface IRule<T, D, M> {
  dump(): T;

  matchCallback(
    details: D,
    callback: (matches: RegExpMatchArray) => void | M
  ): void | M;

  matchers: RuleMatcher<any, D, M>;
}

export interface RuleMatcher<R, D, M> {
  [name: string]: (rule: R, details: D) => void | M;
}

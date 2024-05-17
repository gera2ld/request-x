export const SECTION_TITLE_MAP: { [key: string]: string } = {
  request: 'Request Interception',
  cookie: 'Cookie Interception',
};

export const URL_TRANSFORM_KEYS = [
  'host',
  'port',
  'username',
  'password',
  'path',
] as const;

export const EVENT_MAIN = 'RequestXMainEvent';
export const EVENT_CONTENT = 'RequestXContentEvent';

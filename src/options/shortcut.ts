import { isMacintosh, reprShortcut } from '#/common/keyboard';

export const shortcutMap = {
  copy: 'ctrlcmd-c',
  cut: 'ctrlcmd-x',
  paste: 'ctrlcmd-v',
  duplicate: 'ctrlcmd-d',
  remove: isMacintosh ? 'm-backspace' : 's-delete',
  add: 'a',
  edit: 'e',
};

export const shortcutTextMap = Object.entries(shortcutMap).reduce(
  (map, [key, value]) => {
    map[key] = reprShortcut(value);
    return map;
  },
  {} as { [key: string]: string }
);

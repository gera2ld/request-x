import { KeyboardService } from '@violentmonkey/shortcut';

export * from '@violentmonkey/shortcut';

export const isMacintosh = navigator.userAgent.includes('Macintosh');

export const keyboardService = new KeyboardService();

bindKeys();

export function isInput(el: Element) {
  return ['input', 'textarea'].includes(el?.tagName?.toLowerCase());
}

function handleFocus(e: FocusEvent) {
  if (isInput(e.target as Element)) {
    keyboardService.setContext('inputFocus', true);
  }
}

function handleBlur(e: FocusEvent) {
  if (isInput(e.target as Element)) {
    keyboardService.setContext('inputFocus', false);
  }
}

function bindKeys() {
  document.addEventListener('focus', handleFocus, true);
  document.addEventListener('blur', handleBlur, true);
  keyboardService.register(
    'enter',
    () => {
      (document.activeElement as HTMLElement).click();
    },
    {
      condition: '!inputFocus',
    }
  );
}

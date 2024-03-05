import { KeyboardService } from '@violentmonkey/shortcut';

export * from '@violentmonkey/shortcut';

export const isMacintosh = navigator.userAgent.includes('Macintosh');

export const keyboardService = new KeyboardService();

bindKeys();

let hasSelection = false;
let hasInput = false;

export function isInput(el: Element) {
  return ['input', 'textarea'].includes(el?.tagName?.toLowerCase());
}

function handleFocus(e: FocusEvent) {
  if (isInput(e.target as Element)) {
    hasInput = true;
    updateInputFocus();
  }
}

function handleBlur(e: FocusEvent) {
  if (isInput(e.target as Element)) {
    hasInput = false;
    updateInputFocus();
  }
}

function updateInputFocus() {
  keyboardService.setContext('inputFocus', hasSelection || hasInput);
}

function bindKeys() {
  document.addEventListener('focus', handleFocus, true);
  document.addEventListener('blur', handleBlur, true);
  document.addEventListener(
    'selectionchange',
    () => {
      hasSelection = document.getSelection()?.type === 'Range';
      updateInputFocus();
    },
    false,
  );
  keyboardService.register(
    'enter',
    () => {
      (document.activeElement as HTMLElement).click();
    },
    {
      condition: '!inputFocus',
    },
  );
  keyboardService.enable();
}

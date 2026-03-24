import type { KeyboardChangeEvent, KeyboardChangeListener } from "./types";

let lastHeight = 0;

export function getKeyboardHeight(): number {
  return lastHeight;
}

export function isKeyboardVisible(): boolean {
  return lastHeight > 0;
}

function calculateKeyboardHeight(): number {
  if (!window.visualViewport) return 0;
  const diff = window.innerHeight - window.visualViewport.height;
  return Math.max(0, diff);
}

export function onKeyboardChange(callback: KeyboardChangeListener): () => void {
  if (!window.visualViewport) return () => {};

  const handler = () => {
    const height = calculateKeyboardHeight();
    const changed = height !== lastHeight;
    lastHeight = height;

    if (changed) {
      const event: KeyboardChangeEvent = {
        isVisible: height > 0,
        height,
      };
      callback(event);
    }
  };

  window.visualViewport.addEventListener("resize", handler);
  return () => window.visualViewport?.removeEventListener("resize", handler);
}

export function hideKeyboard(): void {
  const active = document.activeElement;
  if (active instanceof HTMLElement) {
    active.blur();
  }
}

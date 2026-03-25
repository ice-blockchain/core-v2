import { Keyboard } from "react-native";
import type { KeyboardChangeListener } from "./types";

let lastHeight = 0;

export function getKeyboardHeight(): number {
  return lastHeight;
}

export function isKeyboardVisible(): boolean {
  return lastHeight > 0;
}

export function onKeyboardChange(callback: KeyboardChangeListener): () => void {
  const showSubscription = Keyboard.addListener("keyboardDidShow", (event) => {
    lastHeight = event.endCoordinates.height;
    callback({ isVisible: true, height: lastHeight });
  });

  const hideSubscription = Keyboard.addListener("keyboardDidHide", () => {
    lastHeight = 0;
    callback({ isVisible: false, height: 0 });
  });

  return () => {
    showSubscription.remove();
    hideSubscription.remove();
  };
}

export function hideKeyboard(): void {
  Keyboard.dismiss();
}

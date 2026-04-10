type NotifyError = (message: string) => void;

let errorNotifier: NotifyError | null = null;

export function setWalletErrorNotifier(notifier: NotifyError): void {
  errorNotifier = notifier;
}

export function notifyWalletError(message: string): void {
  if (errorNotifier) {
    errorNotifier(message);
  }
}

export function clearWalletErrorNotifier(): void {
  errorNotifier = null;
}

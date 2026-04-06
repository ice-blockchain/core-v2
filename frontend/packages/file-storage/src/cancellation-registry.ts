const controllers = new Map<string, AbortController>();

function register(downloadId: string): AbortController {
  const controller = new AbortController();
  controllers.set(downloadId, controller);
  return controller;
}

function cancel(downloadId: string): boolean {
  const controller = controllers.get(downloadId);
  if (!controller) return false;
  controller.abort();
  controllers.delete(downloadId);
  return true;
}

function remove(downloadId: string): void {
  controllers.delete(downloadId);
}

function getSignal(downloadId: string): AbortSignal | undefined {
  return controllers.get(downloadId)?.signal;
}

export const cancellationRegistry = {
  register,
  cancel,
  remove,
  getSignal,
} as const;

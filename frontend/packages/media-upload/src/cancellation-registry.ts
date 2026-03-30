const controllers = new Map<string, AbortController>();

function register(uploadId: string): AbortController {
  const controller = new AbortController();
  controllers.set(uploadId, controller);
  return controller;
}

function cancel(uploadId: string): boolean {
  const controller = controllers.get(uploadId);
  if (!controller) return false;

  controller.abort();
  controllers.delete(uploadId);
  return true;
}

function remove(uploadId: string): void {
  controllers.delete(uploadId);
}

function getSignal(uploadId: string): AbortSignal | undefined {
  return controllers.get(uploadId)?.signal;
}

export const cancellationRegistry = {
  register,
  cancel,
  remove,
  getSignal,
} as const;

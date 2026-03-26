export interface ClientWorkerConfig {
  readonly userId: string;
  readonly relayAddress: string;
}

export async function startClientWorker(
  config: ClientWorkerConfig,
): Promise<string> {
  return config.userId;
}

export async function stopClientWorker(
  workerId: string,
): Promise<void> {
  void workerId;
  // Worker thread placeholder
}

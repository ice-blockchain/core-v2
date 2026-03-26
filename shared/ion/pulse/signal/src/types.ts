export type PulseSignalCallback = (data: unknown, path: string) => void;

export interface PulseSignal {
  subscribe(path: string, callback: PulseSignalCallback): () => void;
  emit(path: string, data: unknown): void;
  listSubscriptions(): string[];
  subscriberCount(path: string): number;
  destroy(): void;
}
